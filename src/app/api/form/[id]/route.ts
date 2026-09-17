import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { authOptions } from "@/src/lib/auth-options";
import {
  getScopedFormTypeIds,
  isScopedAdminRole,
} from "@/src/lib/admin-access";
import { getServerSession } from "next-auth";
import { advancePastNotifySteps } from "@/lib/notifyStepCascade";

const webLink = process.env.NEXTAUTH_URL;

type FormDataType = Record<string, unknown> & {
  division?: string;
  department?: string;
  section?: string;
};

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

  await prisma.approval.updateMany({
    where: {
      submissionId,
      status: {
        notIn: ["APPROVED", "REJECTED"],
      },
      stepOrder: nextStepOrder,
    },
    data: { status: "PENDING" },
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

  return remainingApprovals[0];
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const formId = Number(id);

    if (!formId)
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 }
      );

    const formDetails = await prisma.formSubmission.findUnique({
      where: { id: formId },
      include: {
        formType: { select: { name: true } },
        createdBy: { select: { fullname: true, staffid: true, email: true } },
        attachments: true,
        approvals: true,
      },
    });

    if (!formDetails) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // A form-scoped admin may only open submissions of the form types assigned
    // to them — except their own submissions and ones they are an approver on,
    // which they hold in their ordinary capacity as a staff member.
    if (isScopedAdminRole(session.user?.roles)) {
      const scopedIds = await getScopedFormTypeIds(
        session.user?.roles,
        session.user?.staffid,
      );
      const isOwn = formDetails.createdBy.staffid === session.user?.staffid;
      const viewer = isOwn
        ? null
        : await prisma.user.findUnique({
            where: { staffid: session.user.staffid },
            select: { id: true },
          });
      const isApprover =
        !!viewer && formDetails.approvals.some((a) => a.approverId === viewer.id);

      if (
        !isOwn &&
        !isApprover &&
        !(scopedIds ?? []).includes(formDetails.formTypeId)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Cast to your expected type
    const formData = formDetails.formData as FormDataType;

    const divisionId = formData?.division
      ? Number(formData.division)
      : undefined;
    const departmentId = formData?.department
      ? Number(formData.department)
      : undefined;
    const sectionId = formData?.section ? Number(formData.section) : undefined;

    const [divisionName, departmentName, sectionName] = await Promise.all([
      divisionId
        ? prisma.division.findUnique({
            where: { id: divisionId },
            select: { name: true },
          })
        : null,
      departmentId
        ? prisma.department.findUnique({
            where: { id: departmentId },
            select: { name: true },
          })
        : null,
      sectionId
        ? prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true },
          })
        : null,
    ]);

    return NextResponse.json({
      ...formDetails,
      divisionName: divisionName?.name || null,
      departmentName: departmentName?.name || null,
      sectionName: sectionName?.name || null,
    });
  } catch (error) {
    console.error("Error fetching form details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { newStatus, remarks } = body;
    const { id } = await context.params;
    const approvalId = Number(id);

    if (!approvalId || !newStatus) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    // Fetch approval + submission + approvals + form type
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        submission: {
          include: {
            approvals: { orderBy: { stepOrder: "asc" } },
            formType: true,
            createdBy: true,
          },
        },
      },
    });

    if (!approval || !approval.submission) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    const submission = approval.submission;
    const submissionId = submission.id;

    // Check if grievance
    const isGrievance =
      submission.formType?.name?.trim().toLowerCase() === "grievance report";

    // Update THIS approval
    await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        remarks: remarks ? "Admin: " + remarks : null,
        approvedAt: newStatus === "APPROVED" ? new Date() : null,
      },
    });

    // ======================================================
    // ⭐ SPECIAL LOGIC FOR GRIEVANCE (auto-approve remaining)
    // ======================================================
    if (newStatus === "APPROVED" && isGrievance) {
      const laterApprovals = submission.approvals.filter(
        (a: (typeof submission.approvals)[number]) =>
          a.stepOrder > approval.stepOrder
      );

      // Approve all future approval steps ONLY
      await Promise.all(
        laterApprovals.map((a: (typeof submission.approvals)[number]) =>
          prisma.approval.update({
            where: { id: a.id },
            data: { status: "APPROVED", approvedAt: new Date() },
          })
        )
      );

      // Finally mark submission as fully approved
      await prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: "APPROVED" },
      });

      return NextResponse.json({
        message:
          "Grievance: remaining approval steps auto-approved successfully",
      });
    }

    // ======================================================
    // NORMAL LOGIC FOR OTHER FORM TYPES
    // ======================================================

    if (newStatus === "APPROVED") {
      const nextStep = await normalizeApprovalQueue(submissionId);

      if (nextStep) {
        // Auto-resolve any leading run of NOTIFY-only steps — this admin
        // override bypasses the normal approve/reject route, so nothing
        // else would ever advance past them.
        const requestor = submission.createdBy;
        const requestorDepartment = requestor.departmentId
          ? await prisma.department.findUnique({ where: { id: requestor.departmentId } })
          : null;

        const cascadeResult = await advancePastNotifySteps({
          submissionId,
          formTypeId: submission.formTypeId,
          formTitle: submission.formType?.name ?? "",
          requestorName: requestor.fullname,
          requestorStaffId: requestor.staffid,
          requestorEmail: requestor.email,
          departmentName: requestorDepartment?.name ?? "-",
          submittedAt: submission.createdAt.toLocaleString(),
          requestLink: `${webLink}/dashboard/approval?id=${submissionId}&name=${submission.formType?.name}`,
        });

        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: { status: cascadeResult.finalized ? "APPROVED" : "PENDING" },
        });
      } else {
        await prisma.formSubmission.update({
          where: { id: submissionId },
          data: { status: "APPROVED" },
        });
      }
    }

    // Rejection logic
    else if (newStatus === "REJECTED") {
      const laterApprovals = submission.approvals.filter(
        (a: (typeof submission.approvals)[number]) =>
          a.stepOrder >= approval.stepOrder
      );

      await Promise.all(
        laterApprovals.map((a: (typeof laterApprovals)[number]) =>
          prisma.approval.update({
            where: { id: a.id },
            data: { status: "REJECTED" },
          })
        )
      );

      await prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: "REJECTED" },
      });
    }

    return NextResponse.json({
      message: "Approval and form status updated successfully",
    });
  } catch (error) {
    console.error("Admin status update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
