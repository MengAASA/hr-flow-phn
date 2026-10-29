import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { sendMailSafely } from "../../../../../lib/emailService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { Prisma, User } from "@/generated/client";
import {
  applyFallbackRole,
  buildRoleWhere,
  resolveFormFieldApprover,
  stepAppliesToRequester,
} from "@/lib/approverResolution";
import { generateUniqueReferenceId } from "@/lib/submission-code";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

type ManualApproverWithUser = Prisma.ApprovalStepApproverGetPayload<{ include: { user: true } }>;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { formTypeId, user, ...rest } = data;

    if (!user) {
      return NextResponse.json({ error: "User session is missing" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { staffid: user.staffid.toString() },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User does not exist" }, { status: 404 });
    }

    const formType = await prisma.formType.findUnique({
      where: { id: Number(formTypeId) },
    });
    if (!formType) {
      return NextResponse.json({ error: "Invalid form type" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const enrichedData = {
      ...rest,
      superiorSignature: rest.superiorSignature || currentUser.fullname,
      superiorDate: rest.superiorDate || today,
      reviewStage: "EVALUATOR_SUBMITTED",
    };

    // ── Create form submission ──
    const formSubmission = await prisma.formSubmission.create({
      data: {
        referenceId: await generateUniqueReferenceId(),
        createdById: currentUser.id,
        formData: enrichedData,
        status: "PENDING",
        formTypeId: Number(formTypeId),
      },
    });

    // ── Fetch approval flow steps ──
    const approvalFlowSteps = (
      await prisma.approvalFlowStep.findMany({
        where: { formTypeId: Number(formTypeId) },
        include: { requesterDivisions: { select: { divisionId: true } } },
        orderBy: { order: "asc" },
      })
    ).filter((step) => stepAppliesToRequester(step, currentUser.divisionId));

    if (approvalFlowSteps.length === 0) {
      return NextResponse.json(
        { error: "No approval flow steps defined for this form" },
        { status: 400 }
      );
    }

    // ── Create approval entries for each step ──
    const assignedApprovers: number[] = [];
    let firstActiveStepOrder: number | null = null;

    for (const step of approvalFlowSteps) {
      // Manual approvers take priority
      const manualApprovers = await prisma.approvalStepApprover.findMany({
        where: { stepId: step.id },
        include: { user: true },
      });

      let approvers: User[];

      if (step.approverSource === "FORM_FIELD" && step.formFieldKey) {
        const resolved = await resolveFormFieldApprover(
          enrichedData as Record<string, unknown>,
          step,
          currentUser,
        );
        if ("error" in resolved) {
          return NextResponse.json({ error: resolved.error }, { status: 400 });
        }
        approvers = [resolved.approver];
      } else if (step.approverSource === "MANUAL" || manualApprovers.length > 0) {
        approvers = manualApprovers.map((a: ManualApproverWithUser) => a.user);
      } else {
        approvers = await prisma.user.findMany({
          where: buildRoleWhere(step.role, step, currentUser, assignedApprovers),
        });

        approvers = await applyFallbackRole(approvers, step, currentUser, assignedApprovers);
      }

      approvers = approvers.filter(
        (a: User) => a.id !== currentUser.id && !assignedApprovers.includes(a.id)
      );

      if (approvers.length === 0) continue;

      assignedApprovers.push(...approvers.map((a: User) => a.id));
      if (firstActiveStepOrder === null) firstActiveStepOrder = step.order;

      await prisma.approval.createMany({
        data: approvers.map((u: User) => ({
          submissionId: formSubmission.id,
          approverId: u.id,
          stepOrder: step.order,
          status: step.order === firstActiveStepOrder ? "PENDING" : "WAITING",
        })),
      });
    }

    if (firstActiveStepOrder === null) {
      return NextResponse.json(
        { error: "No valid approvers found for this form submission." },
        { status: 400 }
      );
    }

    // ── Fetch first step approvers (HOD + HoDiv) ──
    const firstStepApprovals = await prisma.approval.findMany({
      where: { submissionId: formSubmission.id, stepOrder: firstActiveStepOrder },
      include: { approver: true },
    });

    // ── Email evaluator: submission confirmation ──
    const submitterMail = {
      from: emailFrom,
      to: currentUser.email,
      subject: "Form request has been submitted",
      template: "FormSubmission",
      context: {
        subject: "Your Request Has Been Submitted and Is Pending Approval",
        recipientName: currentUser.fullname,
        formTitle: formType.name,
        requestorName: currentUser.fullname,
        requestorStaffId: currentUser.staffid,
        department: "",
        submittedAt: new Date(formSubmission.createdAt).toLocaleString(),
        status: formSubmission.status,
        requestLink: `${webLink}/dashboard/approval?id=${formSubmission.id}&name=${formType.name}`,
        isApprover: false,
      },
    };
    // Independent emails — send together rather than one after the other.
    const mailSends = [
      sendMailSafely(submitterMail, "Failed to send employee review confirmation email:"),
    ];

    // ── Email HOD + HoDiv: first TO, rest CC ──
    if (firstStepApprovals.length > 0) {
      const [first, ...rest] = firstStepApprovals;
      const approverMail = {
        from: emailFrom,
        to: first.approver.email,
        cc: rest.map((a) => a.approver.email),
        subject: "Action Required: New Request Pending Your Approval",
        template: "FormSubmission",
        context: {
          subject: "Action Required: New Request Pending Your Approval",
          recipientName: first.approver.fullname,
          formTitle: formType.name,
          requestorName: currentUser.fullname,
          requestorStaffId: currentUser.staffid,
          department: "",
          submittedAt: new Date(formSubmission.createdAt).toLocaleString(),
          status: formSubmission.status,
          approvalLink: `${webLink}/dashboard/approval?id=${formSubmission.id}&name=${formType.name}`,
          isApprover: true,
        },
      };
      mailSends.push(
        sendMailSafely(approverMail, "Failed to send employee review approver email:"),
      );
    }

    await Promise.all(mailSends);

    return NextResponse.json(
      { message: "Form submitted successfully", data: formSubmission },
      { status: 200 }
    );
  } catch (error) {
    console.error("Employee review post error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
