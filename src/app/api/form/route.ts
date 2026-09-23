import {
  requireAdminScope,
  scopedSubmissionWhere,
} from "@/src/lib/admin-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import fs from "fs/promises";
import path from "path";
import { transporter } from "../../../../lib/emailService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { ApprovalStepApprover, User } from "@/generated/client";
import { formatFileSize, MAX_FORM_ATTACHMENT_BYTES } from "@/lib/uploadLimits";
import {
  applyFallbackRole,
  buildRoleWhere,
  resolveFormFieldApprover,
} from "@/lib/approverResolution";
import { advancePastNotifySteps } from "@/lib/notifyStepCascade";
import { generateUniqueReferenceId } from "@/lib/submission-code";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

type ManualApproverWithUser = ApprovalStepApprover & { user: User };
type FormData = {
  division: string;
  department: string;
  section: string;
};

const MANPOWER_REQUISITION_FORM_NAME = "Man Power Requisition";
const HUMAN_CAPITAL_DIVISION_NAME = "HUMAN CAPITAL AND ESG";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await req.formData();

    // const file = formData.get("fileAttachment") as File | null;
    const files = formData.getAll("fileAttachment");
    const user = JSON.parse(formData.get("user") as string);
    const formId = Number(formData.get("formId"));
    const data = JSON.parse(formData.get("data") as string);
    const totalFileSize = files.reduce((sum, entry) => {
      return entry instanceof File ? sum + entry.size : sum;
    }, 0);

    if (totalFileSize > MAX_FORM_ATTACHMENT_BYTES) {
      return NextResponse.json(
        {
          error: `Total attachment size must be ${formatFileSize(
            MAX_FORM_ATTACHMENT_BYTES,
          )} or less.`,
        },
        { status: 413 },
      );
    }

    // ✅ Validate user
    if (!user) {
      return NextResponse.json(
        { error: "User session is missing" },
        { status: 400 },
      );
    }

    const staffid = user.staffid;
    if (!staffid) {
      return NextResponse.json(
        { error: "Staff id is missing" },
        { status: 400 },
      );
    }

    const findUser = await prisma.user.findUnique({
      where: { staffid: staffid.toString() },
    });

    if (!findUser) {
      return NextResponse.json(
        { error: "User does not exist" },
        { status: 404 },
      );
    }

    const findDepartment = await prisma.department.findUnique({
      where: { id: Number(findUser.departmentId) },
    });

    if (!findDepartment) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 400 },
      );
    }

    const formType = await prisma.formType.findUnique({
      where: { id: formId },
    });

    if (!formType) {
      return NextResponse.json(
        { error: `Invalid form type ID: ${formId}` },
        { status: 400 },
      );
    }

    const requesterDivision = findUser.divisionId
      ? await prisma.division.findUnique({
          where: { id: Number(findUser.divisionId) },
        })
      : null;

    // ✅ Create Form Submission
    const formSubmission = await prisma.formSubmission.create({
      data: {
        referenceId: await generateUniqueReferenceId(),
        formTypeId: formId,
        createdById: findUser.id,
        status: "PENDING",
        formData: data,
      },
    });

    // ✅ Handle multiple file upload
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "storage/uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      for (const entry of files) {
        if (!(entry instanceof File)) continue;

        const file = entry;

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(uploadDir, fileName);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fs.writeFile(filePath, buffer);

        await prisma.fileAttachment.create({
          data: {
            formSubmissionId: formSubmission.id,
            fileName: fileName,
            filePath: `/storage/uploads/${fileName}`,
            fileType: file.type || "unknown",
          },
        });
      }
    }

    // ✅ Fetch Approval Flow Steps for this form
    const approvalFlowSteps = await prisma.approvalFlowStep.findMany({
      where: { formTypeId: formId },
      orderBy: { order: "asc" },
    });

    if (approvalFlowSteps.length === 0) {
      console.warn(`⚠️ No approval flow steps found for formTypeId: ${formId}`);
    }

    const assignedApprovers: number[] = [];
    let firstActiveStepOrder: number | null = null;
    const isHumanCapitalManpowerFlow =
      formType.name === MANPOWER_REQUISITION_FORM_NAME &&
      requesterDivision?.name?.trim().toUpperCase() ===
        HUMAN_CAPITAL_DIVISION_NAME;

    const shouldSkipFirstDepartmentApprovalForManpower =
      formType.name === "Man Power Requisition" &&
      findUser.role === "HEAD_OF_DEPARTMENT";
    let hasSkippedInitialDepartmentStep = false;

    for (const step of approvalFlowSteps) {
      // Human Capital requisitions follow the escalation chain configured for
      // that division (the explicitly scoped steps). The generic unscoped
      // steps are skipped: they resolve to the requester's own department and
      // division heads, who already appear further down the configured chain,
      // and would otherwise be pulled to the front out of hierarchy order.
      if (
        isHumanCapitalManpowerFlow &&
        step.divisionId === null &&
        step.departmentId === null &&
        step.sectionId === null
      ) {
        continue;
      }

      if (
        shouldSkipFirstDepartmentApprovalForManpower &&
        !hasSkippedInitialDepartmentStep &&
        firstActiveStepOrder === null &&
        step.role === "HEAD_OF_DEPARTMENT"
      ) {
        hasSkippedInitialDepartmentStep = true;
        continue;
      }

      // 1️⃣ Load manual approvers
      const manualApprovers = await prisma.approvalStepApprover.findMany({
        where: { stepId: step.id },
        include: { user: true },
      });

      let approvers: User[] = [];

      if (step.approverSource === "FORM_FIELD" && step.formFieldKey) {
        // Approver comes from a value the requester picked on the form itself
        const resolved = await resolveFormFieldApprover(data, step, findUser);
        if ("error" in resolved) {
          return NextResponse.json({ error: resolved.error }, { status: 400 });
        }
        approvers = [resolved.approver];
      } else if (step.approverSource === "MANUAL" || manualApprovers.length > 0) {
        // 1️⃣ If manual approvers exist → use them
        approvers = manualApprovers.map((a: ManualApproverWithUser) => a.user);
      } else {
        // 2️⃣ Try to find normal approvers based on role
        approvers = await prisma.user.findMany({
          where: buildRoleWhere(step.role, step, findUser, assignedApprovers),
        });

        // 3️⃣ 🔥 Legacy fallback for STEP 1 (kept as-is for backward compatibility)
        if (
          approvers.length === 0 &&
          step.order === 1 &&
          step.role === "HEAD_OF_DEPARTMENT"
        ) {
          console.warn(
            `⚠️ No HEAD_OF_DEPARTMENT found. Falling back to HEAD_OF_DIVISION`,
          );

          approvers = await prisma.user.findMany({
            where: {
              role: "HEAD_OF_DIVISION",
              divisionId: findUser.divisionId,
              id: { notIn: assignedApprovers },
            },
          });
        }

        // 4️⃣ Admin-configured fallback/combine role (generic, any step/form)
        approvers = await applyFallbackRole(approvers, step, findUser, assignedApprovers);
      }
      // Prevent duplicates
      approvers = approvers.filter(
        (a: User) => a.id !== findUser.id && !assignedApprovers.includes(a.id),
      );

      if (approvers.length === 0) {
        continue;
      }

      assignedApprovers.push(...approvers.map((a: User) => a.id));

      if (firstActiveStepOrder === null) {
        firstActiveStepOrder = step.order;
      }

      // 3️⃣ Create all approvals for this step with deadline for step 1
      await prisma.approval.createMany({
        data: approvers.map((u: User) => ({
          submissionId: formSubmission.id,
          approverId: u.id,
          stepOrder: step.order,
          status: step.order === firstActiveStepOrder ? "PENDING" : "WAITING",
          // deadline: step.order === 1 ? new Date(Date.now() + 5 * 60 * 1000) : null,
          // escalated: false,
        })),
      });
    }

    if (firstActiveStepOrder === null) {
      return NextResponse.json(
        { error: "No valid approvers found for this form submission." },
        { status: 400 },
      );
    }

    const requestLink = `${webLink}/dashboard/approval?id=${formSubmission.id}&name=${formType.name}`;

    // ✅ Fetch the first active approvers, auto-resolving any leading
    // NOTIFY-only steps along the way.
    const cascadeResult = await advancePastNotifySteps({
      submissionId: formSubmission.id,
      formTypeId: formId,
      formTitle: formType.name,
      requestorName: findUser.fullname,
      requestorStaffId: findUser.staffid,
      requestorEmail: findUser.email,
      departmentName: findDepartment?.name ?? "-",
      submittedAt: new Date(formSubmission.createdAt).toLocaleString(),
      requestLink,
    });
    const firstStepApprovers = cascadeResult.finalized ? [] : cascadeResult.approvers;

    const mailOptions = {
      from: emailFrom,
      to: findUser.email,
      subject: "Form request has been submitted",
      template: "FormSubmission",
      context: {
        subject: "Your Request Has Been Submitted and Is Pending Approval",
        recipientName: findUser?.fullname,
        formTitle: formType?.name,
        requestorName: findUser?.fullname,
        requestorStaffId: findUser?.staffid,
        department: findDepartment?.name,
        submittedAt: new Date(formSubmission.createdAt).toLocaleString(),
        status: formSubmission.status,
        requestLink: `${webLink}/dashboard/approval?id=${formSubmission.id}&name=${formType.name}`,
        isApprover: false,
      },
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error("Failed to send submission confirmation email:", mailErr);
    }

    // ✅ Updated email logic: First approver in TO, others in CC
    if (firstStepApprovers.length > 0) {
      // The first approver goes to TO, rest go to CC
      const [firstApprover, ...otherApprovers] = firstStepApprovers;

      const approvalMail = {
        from: emailFrom,
        to: firstApprover.approver.email,
        cc: otherApprovers.map(
          (a: { approver: { email: string } }) => a.approver.email,
        ),
        subject: "Action Required: New Request Pending Your Approval",
        template: "FormSubmission",
        context: {
          subject: "Action Required: New Request Pending Your Approval",
          recipientName: firstApprover.approver.fullname,
          formTitle: formType?.name,
          requestorName: findUser?.fullname,
          requestorStaffId: findUser?.staffid,
          department: findDepartment?.name,
          submittedAt: new Date(formSubmission.createdAt).toLocaleString(),
          status: formSubmission.status,
          approvalLink: `${webLink}/dashboard/approval?id=${formSubmission.id}&name=${formType.name}`,
          isApprover: true,
        },
      };

      try {
        await transporter.sendMail(approvalMail);
      } catch (mailErr) {
        console.error("Failed to send approver notification email:", mailErr);
      }
    }

    return NextResponse.json(
      {
        message: "Form and approvals created successfully",
        data: formSubmission,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error creating form record:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const scope = await requireAdminScope();
    if (scope.denied) return scope.denied;

    // Fetch form submissions with createdBy and approvals
    const submissions = await prisma.formSubmission.findMany({
      where: scopedSubmissionWhere(scope.formTypeIds),
      include: {
        attachments: true,
        createdBy: true,
        formType: true,
        approvals: {
          include: {
            approver: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to flatten division, department, section names
    const mapped = await Promise.all(
      submissions.map(async (sub: (typeof submissions)[number]) => {
        const parsedFormData: FormData =
          typeof sub.formData === "string"
            ? JSON.parse(sub.formData)
            : (sub.formData as FormData);

        // Fetch related names
        const [division, department, section] = await Promise.all([
          Number(parsedFormData.division)
            ? prisma.division.findUnique({
                where: { id: Number(parsedFormData.division) },
              })
            : null,
          Number(parsedFormData.department)
            ? prisma.department.findUnique({
                where: { id: Number(parsedFormData.department) },
              })
            : null,
          Number(parsedFormData.section)
            ? prisma.section.findUnique({
                where: { id: Number(parsedFormData.section) },
              })
            : null,
        ]);

        return {
          ...sub,
          departmentName: department?.name || null,
          divisionName: division?.name || null,
          sectionName: section?.name || null,
        };
      }),
    );

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

