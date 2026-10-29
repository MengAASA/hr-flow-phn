import {
  requireAdminScope,
  scopedSubmissionWhere,
} from "@/src/lib/admin-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import fs from "fs/promises";
import path from "path";
import { sendMailSafely } from "../../../../lib/emailService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { formatFileSize, MAX_FORM_ATTACHMENT_BYTES } from "@/lib/uploadLimits";
import { resolveApprovalChain } from "@/lib/approvalChain";
import { getRequestDetailRows } from "@/lib/emailRequestDetails";
import { advancePastNotifySteps } from "@/lib/notifyStepCascade";
import { generateUniqueReferenceId } from "@/lib/submission-code";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

type FormData = {
  division: string;
  department: string;
  section: string;
};

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

    // ✅ Resolve the approval chain BEFORE creating the submission, so a flow
    // with no valid approvers doesn't leave an orphaned submission behind.
    const chain = await resolveApprovalChain({
      formTypeId: formId,
      formTypeName: formType.name,
      requester: findUser,
      formData: data,
    });

    if ("error" in chain) {
      return NextResponse.json({ error: chain.error }, { status: 400 });
    }

    const activeSteps = chain.entries.flatMap((entry) =>
      entry.status === "ACTIVE" ? [entry] : [],
    );

    if (activeSteps.length === 0) {
      return NextResponse.json(
        { error: "No valid approvers found for this form submission." },
        { status: 400 },
      );
    }

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

    // ✅ Create the approvals: the first active step is PENDING, the rest WAITING
    const firstActiveStepOrder = activeSteps[0].step.order;
    await prisma.approval.createMany({
      data: activeSteps.flatMap(({ step, approvers }) =>
        approvers.map((u) => ({
          submissionId: formSubmission.id,
          approverId: u.id,
          stepOrder: step.order,
          status: step.order === firstActiveStepOrder ? "PENDING" : "WAITING",
        })),
      ),
    });

    const requestLink = `${webLink}/dashboard/approval?id=${formSubmission.id}&name=${formType.name}`;
    // Form-specific rows for the emails' details table (e.g. reason of requisition)
    const requestDetails = getRequestDetailRows(formType.name, data);

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
      requestDetails,
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
        requestDetails,
      },
    };

    // The two emails are independent; send them together instead of making the
    // requester wait for one SMTP round trip after the other.
    const mailSends = [
      sendMailSafely(mailOptions, "Failed to send submission confirmation email:"),
    ];

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
          requestDetails,
        },
      };

      mailSends.push(
        sendMailSafely(approvalMail, "Failed to send approver notification email:"),
      );
    }

    await Promise.all(mailSends);

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

    // Fetch form submissions with createdBy and approvals, plus the org-unit
    // tables once — resolving names per submission meant up to three queries
    // for every row.
    const [submissions, divisions, departments, sections] = await Promise.all([
      prisma.formSubmission.findMany({
        where: scopedSubmissionWhere(scope.formTypeIds),
        include: {
          attachments: true,
          createdBy: { omit: { password: true } },
          formType: true,
          approvals: {
            include: {
              approver: { omit: { password: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.division.findMany({ select: { id: true, name: true } }),
      prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.section.findMany({ select: { id: true, name: true } }),
    ]);

    const divisionName = new Map(divisions.map((d) => [d.id, d.name]));
    const departmentName = new Map(departments.map((d) => [d.id, d.name]));
    const sectionName = new Map(sections.map((s) => [s.id, s.name]));

    // Map to flatten division, department, section names
    const mapped = submissions.map((sub: (typeof submissions)[number]) => {
      const parsedFormData: FormData =
        typeof sub.formData === "string"
          ? JSON.parse(sub.formData)
          : (sub.formData as FormData);

      return {
        ...sub,
        departmentName: departmentName.get(Number(parsedFormData.department)) || null,
        divisionName: divisionName.get(Number(parsedFormData.division)) || null,
        sectionName: sectionName.get(Number(parsedFormData.section)) || null,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

