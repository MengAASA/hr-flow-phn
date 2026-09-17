import { authOptions } from "@/src/lib/auth-options";
import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import ApprovalComponent from "@/app/component/approval/ApprovalComponent";
import { redirect } from "next/navigation";
import { canAccessHarassmentReports } from "@/lib/compliance-officers";

export default async function Approval() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); //protected page
  }

  const staffid = session?.user?.staffid;

  if (!staffid) {
    return <p>User not logged in</p>;
  }

  const user = await prisma.user.findUnique({
    where: { staffid },
    include: { department: true },
  });

  if (!user) {
    return <p>User not found</p>;
  }

  const [pendingApprovals, selfFormsRaw] = await Promise.all([
    prisma.approval.findMany({
      where: {
        approverId: user.id,
        // status: "PENDING"
      },
      include: {
        submission: {
          include: {
            createdBy: { include: { department: true } },
            formType: true,
            approvals: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
      orderBy: {
        stepOrder: "asc",
      },
    }),
    prisma.formSubmission.findMany({
      where: {
        createdById: user.id,
      },
      include: {
        formType: true, // ✅ include related form type
        approvals: { orderBy: { stepOrder: "asc" } },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const approvalsWithLevels = pendingApprovals.map(
    (approval: (typeof pendingApprovals)[number]) => {
      const allSteps = approval.submission.approvals;
      const uniqueStepOrders = [...new Set(allSteps.map((a) => a.stepOrder))].sort(
        (a, b) => a - b,
      );
      const stepOrderToLevel = new Map(
        uniqueStepOrders.map((stepOrder, index) => [stepOrder, index + 1]),
      );
      const totalLevel = uniqueStepOrders.length;

      const activeApproval = allSteps.find(
        (a: (typeof allSteps)[number]) => a.status === "PENDING"
      );
      const activeLevel = activeApproval
        ? (stepOrderToLevel.get(activeApproval.stepOrder) ?? totalLevel)
        : totalLevel;

      // ✅ Normalize formData so it’s always an object
      const normalizedFormData =
        typeof approval.submission.formData === "string"
          ? JSON.parse(approval.submission.formData)
          : approval.submission.formData ?? null;

      return {
        ...approval,
        totalLevel,
        currentLevel: stepOrderToLevel.get(approval.stepOrder) ?? totalLevel,
        activeLevel,
        submission: {
          ...approval.submission,
          formData: normalizedFormData, // ✅ fix type mismatch
        },
      };
    }
  );

  const selfForms = selfFormsRaw.map((form: typeof selfFormsRaw[number]) => ({
    ...form,
    formData:
      typeof form.formData === "string"
        ? JSON.parse(form.formData)
        : form.formData,
  }));

  const officer = await canAccessHarassmentReports(staffid, session.user.roles);
  const [sexualHarassmentReports, sexualHarassmentReportsHistory] = officer
    ? await Promise.all([
        prisma.sexualHarassmentReport.findMany({
          where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
          orderBy: { createdAt: "desc" },
          select: { id: true, reporterName: true, description: true, status: true, createdAt: true },
        }),
        prisma.sexualHarassmentReport.findMany({
          where: { status: { in: ["RESOLVED", "CLOSED"] } },
          orderBy: { createdAt: "desc" },
          select: { id: true, reporterName: true, description: true, status: true, createdAt: true },
        }),
      ])
    : [[], []];

  return (
    <div className="w-full font-poppins">
      <div>
        <h1 className="font-bold text-3xl">Approval</h1>
        <p className="text-indigo-800">
          Review and manage pending approval requests.
        </p>
      </div>

      <ApprovalComponent
        pendingApprovals={approvalsWithLevels}
        selfForms={selfForms}
        user={user}
        sexualHarassmentReports={sexualHarassmentReports.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        sexualHarassmentReportsHistory={sexualHarassmentReportsHistory.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

