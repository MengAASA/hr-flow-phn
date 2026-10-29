import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { transporter } from "../../../../../lib/emailService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { Prisma } from "@/generated/client";
import { getGrievanceStepDeadline } from "../../../../../lib/grievance-deadline";
import { isEmployeeReviewFormType, isGrievanceFormType } from "../../../../../lib/utils";
import { advancePastNotifySteps } from "@/lib/notifyStepCascade";
import { getRequestDetailRows } from "@/lib/emailRequestDetails";

const emailFrom = process.env.EMAIL;
const webLink = process.env.NEXTAUTH_URL;

type ApprovalWithSubmission = Prisma.ApprovalGetPayload<{
  include: {
    approver: true;
    submission: {
      include: {
        approvals: { include: { approver: true } };
        createdBy: true;
      };
    };
  };
}>;

const DAY = 24 * 60 * 60 * 1000;

async function normalizeApprovalQueue(submissionId: number) {
  const remainingApprovals = await prisma.approval.findMany({
    where: {
      submissionId,
      status: {
        notIn: ["APPROVED", "REJECTED"],
      },
    },
    orderBy: { stepOrder: "asc" },
  });

  if (remainingApprovals.length === 0) {
    return null;
  }

  const nextStepOrder = remainingApprovals[0].stepOrder;
  const maxStepOrder = remainingApprovals[remainingApprovals.length - 1].stepOrder;
  const isLastStep = nextStepOrder === maxStepOrder;
  const deadline = new Date(Date.now() + (isLastStep ? 21 : 7) * DAY);

  await prisma.approval.updateMany({
    where: {
      submissionId,
      status: {
        notIn: ["APPROVED", "REJECTED"],
      },
      stepOrder: nextStepOrder,
    },
    data: { status: "PENDING", deadline },
  });

  await prisma.approval.updateMany({
    where: {
      submissionId,
      status: {
        notIn: ["APPROVED", "REJECTED"],
      },
      stepOrder: { gt: nextStepOrder },
    },
    data: { status: "WAITING" },
  });

  return prisma.approval.findMany({
    where: {
      submissionId,
      stepOrder: nextStepOrder,
      status: "PENDING",
    },
    include: { approver: true },
    orderBy: { id: "asc" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { approvalId, action, remarks } = await req.json();

    if (!approvalId || !action)
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );

    // 1️⃣ Find approval + submission + user + all approvals
    const approval: ApprovalWithSubmission | null =
      await prisma.approval.findUnique({
        where: { id: Number(approvalId) },
        include: {
          approver: true, // to get approver name/email
          submission: {
            include: {
              approvals: {
                include: { approver: true },
              },
              createdBy: true, // assuming relation to User
            },
          },
        },
      });

    if (!approval)
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 },
      );

    const submission = approval.submission;
    const submissionId = submission.id;
    const requestor = submission.createdBy;

    const formType = await prisma.formType.findUnique({
      where: {
        id: Number(submission.formTypeId),
      },
    });

    if (!formType) {
      return NextResponse.json(
        { error: "Form type not found" },
        { status: 400 },
      );
    }

    // The requestor's department is optional (heads of division and other
    // staff sit directly under a division). It only labels the notification
    // emails below, so a missing one must not block the approval itself.
    const findDepartment = requestor.departmentId
      ? await prisma.department.findUnique({
          where: { id: requestor.departmentId },
        })
      : null;
    const requestorDepartmentName = findDepartment?.name ?? "-";
    // Form-specific rows for the emails' details table (e.g. reason of requisition)
    const requestDetails = getRequestDetailRows(formType.name, submission.formData);

    // 2️⃣ Update current approval
    await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        remarks: remarks || null,
        approvedAt: new Date(),
      },
    });

    // 3️⃣ Handle next step
    const isGrievance = isGrievanceFormType(formType.name);

    if (action === "approve") {
      const isEmployeeReview = isEmployeeReviewFormType(formType.name);
      const currentFormData = submission.formData as Record<string, unknown> | null;
      const reviewStage = (currentFormData?.reviewStage as string) ?? "EVALUATOR_SUBMITTED";
      const today = new Date().toISOString().split("T")[0];

      // ── Employee Review: HCD acknowledgement step ──
      if (isEmployeeReview && reviewStage === "EMPLOYEE_SUBMITTED") {
        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: {
            status: "APPROVED",
            formData: {
              ...(currentFormData ?? {}),
              hcdAcknowledgement: approval.approver.fullname,
              hcdDate: today,
              reviewStage: "COMPLETED",
            },
          },
        });
        await prisma.approval.updateMany({
          where: { submissionId },
          data: { status: "APPROVED", approvedAt: new Date() },
        });
        const hcdAckMail = {
          from: emailFrom,
          to: requestor.email,
          subject: "Your Performance Review Has Been Acknowledged",
          template: "finalApproval",
          context: {
            status: "APPROVED",
            formTitle: formType.name,
            requestorName: requestor.fullname,
            requestorStaffId: requestor.staffid,
            submittedAt: submission.createdAt.toLocaleString(),
            department: requestorDepartmentName,
            finalApproverName: approval.approver.fullname,
            requestLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`,
          },
        };
        try { await transporter.sendMail(hcdAckMail); } catch { /* non-fatal */ }
        return NextResponse.json({ message: "Performance review acknowledged successfully" });
      }

      // ── Employee Review: HOD/HoDiv approval step ──
      if (isEmployeeReview && reviewStage === "EVALUATOR_SUBMITTED") {
        // Any-one-approves model: auto-approve all other approvers at the same step order
        await prisma.approval.updateMany({
          where: {
            submissionId,
            stepOrder: approval.stepOrder,
            status: { notIn: ["APPROVED", "REJECTED"] },
          },
          data: { status: "APPROVED", approvedAt: new Date() },
        });

        // Always pause for employee after HOD step — shift any WAITING steps (HCD) up to make room
        const employeeStepOrder = approval.stepOrder + 1;

        await prisma.approval.updateMany({
          where: { submissionId, status: "WAITING" },
          data: { stepOrder: { increment: 1 } },
        });

        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: {
            formData: {
              ...(currentFormData ?? {}),
              hodSignature: approval.approver.fullname,
              hodDate: today,
              reviewStage: "HOD_APPROVED",
            },
          },
        });

        // Create PENDING approval entry for the reviewed employee
        const employeeStaffId = currentFormData?.staffId as string | undefined;
        if (employeeStaffId) {
          const employee = await prisma.user.findUnique({ where: { staffid: employeeStaffId } });
          if (employee) {
            await prisma.approval.create({
              data: {
                submissionId,
                approverId: employee.id,
                stepOrder: employeeStepOrder,
                status: "PENDING",
              },
            });
            const employeeFillMail = {
              from: emailFrom,
              to: employee.email,
              subject: "Action Required: Please Fill In Your Performance Review Comments",
              template: "FormSubmission",
              context: {
                subject: "Your Performance Review Is Ready for Your Comments",
                recipientName: employee.fullname,
                formTitle: formType.name,
                requestorName: requestor.fullname,
                requestorStaffId: requestor.staffid,
                department: requestorDepartmentName,
                submittedAt: submission.createdAt.toLocaleString(),
                status: "Pending Your Comments",
                approvalLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`,
                isApprover: true,
              },
            };
            try { await transporter.sendMail(employeeFillMail); } catch { /* non-fatal */ }
          }
        }
        return NextResponse.json({ message: "Review approved. Employee notified to fill in comments." });
      }


      if (isGrievance) {
        // Mark submission as approved
        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: { status: "APPROVED" },
        });

        // Mark ALL approvals as approved
        await prisma.approval.updateMany({
          where: { submissionId },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
          },
        });

        const mailOptions = {
          from: emailFrom,
          to: requestor.email,
          subject: "Your Grievance Form Has Been Approved",
          template: "finalApproval",
          context: {
            status: "APPROVED",
            formTitle: formType.name,
            requestorName: requestor.fullname,
            requestorStaffId: requestor.staffid,
            submittedAt: submission.createdAt.toLocaleString(),
            department: requestorDepartmentName,
            finalApproverName: approval.approver.fullname,
            requestLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`,
          },
        };

        try {
          await transporter.sendMail(mailOptions);
        } catch (mailErr) {
          console.error("Failed to send grievance approval email:", mailErr);
        }

        return NextResponse.json({
          message: "Grievance form approved successfully",
        });
      }

      const currentStep = await prisma.approvalFlowStep.findFirst({
        where: { formTypeId: submission.formTypeId, order: approval.stepOrder },
      });

      if (currentStep?.approvalMode === "ANY") {
        // Any-one-approves: satisfy the rest of this step now that one approver has acted
        await prisma.approval.updateMany({
          where: {
            submissionId,
            stepOrder: approval.stepOrder,
            status: { notIn: ["APPROVED", "REJECTED"] },
          },
          data: { status: "APPROVED", approvedAt: new Date() },
        });
      }

      const nextStepApprovers = await normalizeApprovalQueue(submissionId);

      if (nextStepApprovers && nextStepApprovers.length > 0) {
        const requestLink = `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`;

        // Auto-resolve any leading run of NOTIFY-only steps before emailing
        // whoever the flow actually lands on next.
        const cascadeResult = await advancePastNotifySteps({
          submissionId,
          formTypeId: submission.formTypeId,
          formTitle: formType.name,
          requestorName: requestor.fullname,
          requestorStaffId: requestor.staffid,
          requestorEmail: requestor.email,
          departmentName: requestorDepartmentName,
          submittedAt: submission.createdAt.toLocaleString(),
          requestLink,
          requestDetails,
        });

        if (!cascadeResult.finalized && cascadeResult.approvers.length > 0) {
          const [firstNext, ...otherNext] = cascadeResult.approvers;
          const mailOptions = {
            from: emailFrom,
            to: firstNext.approver.email,
            cc: otherNext.map((a) => a.approver.email),
            subject: "Action Required: Request Pending Your Approval",
            template: "nextApproval",
            context: {
              nextApproverName: firstNext.approver.fullname,
              previousApproverName: approval.approver.fullname,
              formTitle: formType.name,
              requestorName: requestor.fullname,
              requestorStaffId: requestor.staffid,
              department: requestorDepartmentName,
              submittedAt: submission.createdAt.toLocaleString(),
              status: "Pending Approval",
              approvalLink: requestLink,
              requestDetails,
            },
          };

          try {
            await transporter.sendMail(mailOptions);
          } catch (mailErr) {
            console.error("Failed to send next-approver email:", mailErr);
          }
        }
      } else {
        // ✅ Final approval
        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: { status: "APPROVED" },
        });

        const mailOptions = {
          from: emailFrom,
          to: requestor.email,
          subject: "Your Request Has Been Approved",
          template: "finalApproval",
          context: {
            status: "APPROVED",
            formTitle: formType.name,
            requestorName: requestor.fullname,
            requestorStaffId: requestor.staffid,
            submittedAt: submission.createdAt.toLocaleString(),
            department: requestorDepartmentName,
            finalApproverName: approval.approver.fullname,
            requestLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`,
            requestDetails,
          },
        };

        try {
          await transporter.sendMail(mailOptions);
        } catch (mailErr) {
          console.error("Failed to send final approval email:", mailErr);
        }
      }
    } else {
      // ❌ Rejected
      if (isGrievance) {
        // For grievance: rejection escalates to the next step.
        // Only the last approver's rejection actually rejects the form.
        const nextWaiting = await prisma.approval.findFirst({
          where: {
            submissionId,
            stepOrder: { gt: approval.stepOrder },
            status: "WAITING",
          },
          orderBy: { stepOrder: "asc" },
          include: { approver: true },
        });

        if (nextWaiting) {
          // Not the last step — escalate to next step
          await prisma.approval.updateMany({
            where: { submissionId, stepOrder: approval.stepOrder },
            data: { status: "REJECTED" },
          });

          // Check if next step is the last
          const hasStepAfterNext = await prisma.approval.findFirst({
            where: { submissionId, stepOrder: { gt: nextWaiting.stepOrder } },
            select: { stepOrder: true },
          });
          const deadline = getGrievanceStepDeadline(nextWaiting.stepOrder, !hasStepAfterNext);

          await prisma.approval.updateMany({
            where: { submissionId, stepOrder: nextWaiting.stepOrder },
            data: { status: "PENDING", deadline },
          });

          // Notify next approver
          const escalationMail = {
            from: emailFrom,
            to: nextWaiting.approver.email,
            subject: "Action Required: Grievance Report Escalated to You",
            template: "nextApproval",
            context: {
              nextApproverName: nextWaiting.approver.fullname,
              previousApproverName: approval.approver.fullname,
              formTitle: formType.name,
              requestorName: requestor.fullname,
              requestorStaffId: requestor.staffid,
              department: requestorDepartmentName,
              submittedAt: submission.createdAt.toLocaleString(),
              status: "Escalated — Pending Your Review",
              approvalLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`,
            },
          };
          try {
            await transporter.sendMail(escalationMail);
          } catch (mailErr) {
            console.error("Failed to send grievance escalation email:", mailErr);
          }

          return NextResponse.json({ message: "Rejection escalated to next approver" });
        }

        // Last approver rejected — form is finally rejected
        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: { status: "REJECTED" },
        });
        await prisma.approval.updateMany({
          where: { submissionId, stepOrder: { gte: approval.stepOrder } },
          data: { status: "REJECTED" },
        });
      } else {
        // Non-grievance: rejection immediately kills the form
        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: { status: "REJECTED" },
        });
        await prisma.approval.updateMany({
          where: { submissionId, stepOrder: { gte: approval.stepOrder } },
          data: { status: "REJECTED" },
        });
      }

      const mailOptions = {
        from: emailFrom,
        to: requestor.email,
        subject: "Your Request Has Been Rejected",
        template: "rejectRequest",
        context: {
          status: "REJECTED",
          formTitle: formType.name,
          requestorName: requestor.fullname,
          requestorStaffId: requestor.staffid,
          submittedAt: submission.createdAt.toLocaleString(),
          department: requestorDepartmentName,
          rejectedBy: approval.approver.fullname,
          requestDetails,
          requestLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${formType.name}`,
        },
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error("Failed to send rejection email:", mailErr);
      }
    }

    return NextResponse.json({ message: "Action processed successfully" });
  } catch (error) {
    console.error("Approval action error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

