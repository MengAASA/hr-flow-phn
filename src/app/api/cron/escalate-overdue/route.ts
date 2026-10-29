import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { transporter } from "../../../../../lib/emailService";
import { Prisma } from "@/generated/client";
import { getGrievanceStepDeadline } from "../../../../../lib/grievance-deadline";
import { getRequestDetailRows } from "../../../../../lib/emailRequestDetails";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

type ApprovalWithRelations = Prisma.ApprovalGetPayload<{
  include: {
    approver: true;
    submission: {
      include: {
        createdBy: {
          include: { department: true; division: true; section: true };
        };
        formType: true;
      };
    };
  };
}>;

export async function GET() {
  try {
    const now = new Date();

    // 1️⃣ Find overdue approvals (not escalated yet)
    const overdueApprovals: ApprovalWithRelations[] =
      await prisma.approval.findMany({
        where: {
          status: "PENDING",
          deadline: { lte: now },
          escalated: false,
        },
        include: {
          approver: true,
          submission: {
            include: {
              createdBy: {
                include: { department: true, division: true, section: true },
              },
              formType: true,
            },
          },
        },
      });

    if (overdueApprovals.length === 0) {
      return NextResponse.json({ message: "No overdue approvals found" });
    }

    // 2️⃣ Group by submissionId + stepOrder
    const grouped = overdueApprovals.reduce(
      (
        acc: Record<string, ApprovalWithRelations[]>,
        a: ApprovalWithRelations,
      ) => {
        const key = `${a.submissionId}-${a.stepOrder}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(a);
        return acc;
      },
      {},
    );

    // 3️⃣ Process each step in order
    for (const key in grouped) {
      const group = grouped[key];
      const firstApproval = group[0]; // for submission info

      // Determine the next existing step order (may not be consecutive if a step was skipped)
      const nextStepRow = await prisma.approval.findFirst({
        where: {
          submissionId: firstApproval.submissionId,
          stepOrder: { gt: firstApproval.stepOrder },
          status: "WAITING",
        },
        orderBy: { stepOrder: "asc" },
        select: { stepOrder: true },
      });

      if (!nextStepRow) continue; // already at final step

      // Next step: fetch all WAITING approvals at the next existing step
      const nextStepApprovals: ApprovalWithRelations[] =
        await prisma.approval.findMany({
          where: {
            submissionId: firstApproval.submissionId,
            stepOrder: nextStepRow.stepOrder,
            status: "WAITING",
          },
          include: {
            approver: true,
            submission: {
              include: {
                createdBy: {
                  include: { department: true, division: true, section: true },
                },
                formType: true,
              },
            },
          },
        });

      const hasStepAfterNext = await prisma.approval.findFirst({
        where: {
          submissionId: firstApproval.submissionId,
          stepOrder: { gt: nextStepRow.stepOrder },
        },
        select: { stepOrder: true },
      });
      const isLastStep = !hasStepAfterNext;

      // Grievance reports use their own step schedule (5/5/7.../10 days);
      // every other form type keeps the default 7 days (21 on the last step).
      const isGrievance =
        firstApproval.submission.formType.name.trim().toLowerCase() ===
        "grievance report";
      const newDeadline = isGrievance
        ? getGrievanceStepDeadline(nextStepRow.stepOrder, isLastStep)
        : new Date(Date.now() + (isLastStep ? 21 : 7) * 24 * 60 * 60 * 1000);

      // 4️⃣ Email recipients
      // TO: first approver in next step
      const recipientEmail =
        nextStepApprovals[0]?.approver.email || firstApproval.approver.email;

      // CC: all other approvers in next step
      const ccEmails = nextStepApprovals
        .map((a: ApprovalWithRelations) => a.approver.email)
        .filter((email: string) => email !== recipientEmail);

      // 5️⃣ Send escalation email for this step
      const mailOptions = {
        from: emailFrom,
        to: recipientEmail,
        cc: ccEmails,
        subject: `Escalation: ${firstApproval.submission.formType.name} pending > 5 days`,
        template: "overdueAction",
        context: {
          hcdName: nextStepApprovals[0]?.approver.fullname,
          formTitle: firstApproval.submission.formType.name,
          requestorName: firstApproval.submission.createdBy.fullname,
          requestorStaffId: firstApproval.submission.createdBy.staffid,
          currentStepApprovers: nextStepApprovals
            .map((a: ApprovalWithRelations) => a.approver.fullname)
            .join(", "),
          department:
            firstApproval.submission.createdBy.department?.name || "-",
          submittedAt: new Date(
            firstApproval.submission.createdAt,
          ).toLocaleString(),
          approvalLink: `${webLink}/dashboard/approval?id=${firstApproval.submission.id}&name=${firstApproval.submission.formType.name}`,
          previousApproverName: group[0].approver.fullname,
          requestDetails: getRequestDetailRows(
            firstApproval.submission.formType.name,
            firstApproval.submission.formData,
          ),
        },
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error("Failed to send escalation email:", mailErr);
      }

      // 6️⃣ Mark all approvals in current step as escalated
      await prisma.approval.updateMany({
        where: { id: { in: group.map((a: ApprovalWithRelations) => a.id) } },
        data: { escalated: true, status: "ESCALATED" },
      });

      // 7️⃣ Activate all next step approvals together
      if (nextStepApprovals.length > 0) {
        await prisma.approval.updateMany({
          where: {
            id: {
              in: nextStepApprovals.map((a: ApprovalWithRelations) => a.id),
            },
          },
          data: { status: "PENDING", deadline: newDeadline },
        });
      }
    }

    return NextResponse.json({
      message: `Escalated ${
        Object.keys(grouped).length
      } step(s) to next level.`,
    });
  } catch (error) {
    console.error("Escalation error:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
