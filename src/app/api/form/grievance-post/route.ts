import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import fs from "fs/promises";
import path from "path";
import { sendMailSafely } from "../../../../../lib/emailService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { User } from "@/generated/client";
import { getGrievanceStepDeadline } from "../../../../../lib/grievance-deadline";
import {
  applyFallbackRole,
  buildRoleWhere,
  resolveFormFieldApprover,
  stepAppliesToRequester,
} from "../../../../../lib/approverResolution";
import { generateUniqueReferenceId } from "../../../../../lib/submission-code";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await req.formData();

    const file = formData.get("fileAttachment") as File | null;
    const user = JSON.parse(formData.get("user") as string);
    const formId = Number(formData.get("formId"));
    const data = JSON.parse(formData.get("data") as string);

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

    // Department is optional (e.g. heads of division sit directly under a
    // division). It is only used to label the notification emails below.
    const findDepartment = findUser.departmentId
      ? await prisma.department.findUnique({
          where: { id: findUser.departmentId },
        })
      : null;

    const formType = await prisma.formType.findUnique({
      where: { id: formId },
    });

    if (!formType) {
      return NextResponse.json(
        { error: `Invalid form type ID: ${formId}` },
        { status: 400 },
      );
    }

    // ✅ Resolve all approvers BEFORE creating the submission so we can fail early
    const approvalFlowSteps = (
      await prisma.approvalFlowStep.findMany({
        where: { formTypeId: formId },
        include: { requesterDivisions: { select: { divisionId: true } } },
        orderBy: { order: "asc" },
      })
    ).filter((step) => stepAppliesToRequester(step, findUser.divisionId));

    if (approvalFlowSteps.length === 0) {
      return NextResponse.json(
        { error: "No approval flow configured for this form type" },
        { status: 400 },
      );
    }

    const resolvedSteps: { step: typeof approvalFlowSteps[number]; approvers: User[] }[] = [];
    const seenApproverIds: number[] = [];
    let fallbackRoleUsed: string | null = null;

    for (const step of approvalFlowSteps) {
      let approvers: User[] = [];

      const manualApprovers = await prisma.approvalStepApprover.findMany({
        where: { stepId: step.id },
        include: { user: true },
      });

      if (step.approverSource === "FORM_FIELD" && step.formFieldKey) {
        const resolved = await resolveFormFieldApprover(
          data as Record<string, unknown>,
          step,
          findUser,
        );
        if ("error" in resolved) {
          return NextResponse.json({ error: resolved.error }, { status: 400 });
        }
        approvers = [resolved.approver];
      } else if (step.approverSource === "MANUAL" || manualApprovers.length) {
        approvers = manualApprovers.map((a) => a.user);
      } else {
        // If a previous step already covered this role via fallback, skip it
        if (fallbackRoleUsed === step.role) {
          continue;
        }

        // The submitter is excluded inside the query rather than filtered out
        // afterwards: that way a pool consisting only of the submitter comes
        // back empty, so the fallbacks below can take over instead of the step
        // resolving to its own author.
        const excludedIds = [...seenApproverIds, findUser.id];

        approvers = await prisma.user.findMany({
          where: buildRoleWhere(step.role, step, findUser, excludedIds),
        });

        // Fallback: if no HEAD_OF_SECTION found, use HEAD_OF_DEPARTMENT from submitter's department
        if (approvers.length === 0 && step.role === "HEAD_OF_SECTION") {
          if (findUser.departmentId) {
            approvers = await prisma.user.findMany({
              where: {
                role: "HEAD_OF_DEPARTMENT",
                departmentId: findUser.departmentId,
                id: { notIn: excludedIds },
              },
            });
            if (approvers.length > 0) {
              // Mark HEAD_OF_DEPARTMENT as used so the dedicated HOD step is skipped
              fallbackRoleUsed = "HEAD_OF_DEPARTMENT";
            }
          }
        }

        // A head of department has no department head above them, so the first
        // step escalates to the head of their division instead.
        if (
          approvers.length === 0 &&
          step.order === 1 &&
          step.role === "HEAD_OF_DEPARTMENT"
        ) {
          approvers = await prisma.user.findMany({
            where: {
              role: "HEAD_OF_DIVISION",
              divisionId: findUser.divisionId,
              id: { notIn: excludedIds },
            },
          });
        }

        // Admin-configured fallback/combine role (generic, opt-in via the builder)
        approvers = await applyFallbackRole(approvers, step, findUser, excludedIds);
      }

      // Deduplicate across steps, and never route a grievance to its own author
      // (covers the MANUAL and FORM_FIELD paths, which skip the query above).
      approvers = approvers.filter(
        (a) => a.id !== findUser.id && !seenApproverIds.includes(a.id),
      );

      // A step nobody can fill is skipped rather than fatal: a head of division
      // has no department head above them, so step 1 simply does not apply and
      // the grievance starts at the next step that does.
      if (approvers.length === 0) {
        continue;
      }

      seenApproverIds.push(...approvers.map((a) => a.id));
      resolvedSteps.push({ step, approvers });
    }

    if (resolvedSteps.length === 0) {
      return NextResponse.json(
        {
          error:
            "No approver could be resolved for any step of this form. Please check the approval flow configuration.",
        },
        { status: 400 },
      );
    }

    // ✅ All approvers resolved — safe to create the submission
    const formSubmission = await prisma.formSubmission.create({
      data: {
        referenceId: await generateUniqueReferenceId(),
        formTypeId: formId,
        createdById: findUser.id,
        status: "PENDING",
        formData: data,
      },
    });

    // ✅ Handle file upload (optional)
    if (file) {
      const uploadDir = path.join(process.cwd(), "storage/uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path.join(uploadDir, fileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(filePath, buffer);

      await prisma.fileAttachment.create({
        data: {
          formSubmissionId: formSubmission.id,
          fileName: fileName,
          filePath: `/uploads/${fileName}`,
          fileType: file.type || "unknown",
        },
      });
    }

    // ✅ Create approvals using the pre-resolved steps
    const firstStepOrder = resolvedSteps[0].step.order;
    const lastStepOrder = resolvedSteps[resolvedSteps.length - 1].step.order;

    for (const { step, approvers } of resolvedSteps) {
      const isFirstStep = step.order === firstStepOrder;
      const isLastStep = step.order === lastStepOrder;
      await prisma.approval.createMany({
        data: approvers.map((u) => ({
          submissionId: formSubmission.id,
          approverId: u.id,
          stepOrder: step.order,
          status: isFirstStep ? "PENDING" : "WAITING",
          deadline: isFirstStep ? getGrievanceStepDeadline(step.order, isLastStep) : null,
          escalated: false,
        })),
      });
    }

    // ✅ Fetch the first-step approvers for email notification
    const firstStepApprovers = await prisma.approval.findMany({
      where: { submissionId: formSubmission.id, stepOrder: firstStepOrder },
      include: { approver: true },
    });

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

    // Independent emails — send together rather than one after the other.
    const mailSends = [
      sendMailSafely(mailOptions, "Failed to send submission confirmation email:"),
    ];

    if (firstStepApprovers.length > 0) {
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
