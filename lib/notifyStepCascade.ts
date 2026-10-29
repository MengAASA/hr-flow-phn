import { prisma } from "./prisma";
import { transporter } from "./emailService";
import type { RequestDetailRow } from "./emailRequestDetails";

const emailFrom = process.env.EMAIL;

// Guards against an accidental chain of NOTIFY -> NOTIFY -> ... steps
// looping forever if the admin-configured flow is malformed.
const MAX_CASCADE_STEPS = 50;

export type NotifyCascadeContext = {
  submissionId: number;
  formTypeId: number;
  formTitle: string;
  requestorName: string;
  requestorStaffId: string;
  requestorEmail: string;
  departmentName: string;
  submittedAt: string;
  requestLink: string;
  // Form-specific rows for the emails' details table
  requestDetails?: RequestDetailRow[];
};

export type NotifyCascadeResult =
  | { finalized: true }
  | {
      finalized: false;
      approvers: { approver: { email: string; fullname: string } }[];
    };

/**
 * Called right after a step's Approval rows are set to PENDING (at
 * submission creation, or after normalizeApprovalQueue advances the queue).
 * Auto-resolves any leading run of NOTIFY-type steps: sends each an FYI
 * email, marks their rows resolved, and advances the queue further — until
 * it lands on a real APPROVER step (returned to the caller to email as
 * usual) or the chain ends (submission finalized here).
 */
export async function advancePastNotifySteps(
  ctx: NotifyCascadeContext,
): Promise<NotifyCascadeResult> {
  for (let i = 0; i < MAX_CASCADE_STEPS; i++) {
    const currentApprovals = await prisma.approval.findMany({
      where: { submissionId: ctx.submissionId, status: "PENDING" },
      include: { approver: true },
      orderBy: { id: "asc" },
    });

    if (currentApprovals.length === 0) {
      const stillUnresolved = await prisma.approval.findFirst({
        where: {
          submissionId: ctx.submissionId,
          status: { notIn: ["APPROVED", "REJECTED"] },
        },
      });

      if (stillUnresolved) {
        // Nothing PENDING yet but something is still WAITING — not our
        // concern here, let the caller's own logic handle it.
        return { finalized: false, approvers: [] };
      }

      await finalizeSubmission(ctx);
      return { finalized: true };
    }

    const stepOrder = currentApprovals[0].stepOrder;
    const step = await prisma.approvalFlowStep.findFirst({
      where: { formTypeId: ctx.formTypeId, order: stepOrder },
    });

    if (!step || step.stepType !== "NOTIFY") {
      return { finalized: false, approvers: currentApprovals };
    }

    const [first, ...rest] = currentApprovals;
    const notifyMail = {
      from: emailFrom,
      to: first.approver.email,
      cc: rest.map((a) => a.approver.email),
      subject: `For Your Information: ${ctx.formTitle}`,
      template: "FormSubmission",
      context: {
        subject: `For Your Information: ${ctx.formTitle}`,
        headerText: "For Your Information: New Request",
        bodyText:
          "You are being notified about the following request. No action is required from you.",
        recipientName: first.approver.fullname,
        formTitle: ctx.formTitle,
        requestorName: ctx.requestorName,
        requestorStaffId: ctx.requestorStaffId,
        department: ctx.departmentName,
        submittedAt: ctx.submittedAt,
        status: "For Your Information",
        requestLink: ctx.requestLink,
        isApprover: false,
        requestDetails: ctx.requestDetails,
      },
    };

    try {
      await transporter.sendMail(notifyMail);
    } catch (mailErr) {
      console.error("Failed to send notify-step email:", mailErr);
    }

    await prisma.approval.updateMany({
      where: { submissionId: ctx.submissionId, stepOrder },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        remarks: "Notified — no approval required",
      },
    });

    const remaining = await prisma.approval.findMany({
      where: {
        submissionId: ctx.submissionId,
        status: { notIn: ["APPROVED", "REJECTED"] },
      },
      orderBy: { stepOrder: "asc" },
    });

    if (remaining.length === 0) {
      await finalizeSubmission(ctx);
      return { finalized: true };
    }

    const nextStepOrder = remaining[0].stepOrder;

    await prisma.approval.updateMany({
      where: {
        submissionId: ctx.submissionId,
        status: { notIn: ["APPROVED", "REJECTED"] },
        stepOrder: nextStepOrder,
      },
      data: { status: "PENDING" },
    });

    await prisma.approval.updateMany({
      where: {
        submissionId: ctx.submissionId,
        status: { notIn: ["APPROVED", "REJECTED"] },
        stepOrder: { gt: nextStepOrder },
      },
      data: { status: "WAITING" },
    });
    // loop back and re-check the newly-PENDING step
  }

  throw new Error(
    `Notify-step cascade exceeded safety limit for submission ${ctx.submissionId} — check the approval flow configuration for a NOTIFY loop.`,
  );
}

async function finalizeSubmission(ctx: NotifyCascadeContext) {
  const lastNotified = await prisma.approval.findFirst({
    where: { submissionId: ctx.submissionId, status: "APPROVED" },
    include: { approver: true },
    orderBy: { approvedAt: "desc" },
  });

  await prisma.formSubmission.update({
    where: { id: ctx.submissionId },
    data: { status: "APPROVED" },
  });

  const mailOptions = {
    from: emailFrom,
    to: ctx.requestorEmail,
    subject: "Your Request Has Been Approved",
    template: "finalApproval",
    context: {
      status: "APPROVED",
      formTitle: ctx.formTitle,
      requestorName: ctx.requestorName,
      requestorStaffId: ctx.requestorStaffId,
      submittedAt: ctx.submittedAt,
      department: ctx.departmentName,
      finalApproverName: lastNotified?.approver.fullname ?? "System",
      requestLink: ctx.requestLink,
      requestDetails: ctx.requestDetails,
    },
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (mailErr) {
    console.error("Failed to send final approval email:", mailErr);
  }
}
