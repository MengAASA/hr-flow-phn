import { authOptions } from "@/src/lib/auth-options";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import FormAnalyticsComponent from "@/app/component/analytics/FormAnalyticsComponent";
import { canViewAnalytics } from "@/lib/analytics-access";

const STATUS_LABELS = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

export default async function FormAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); //protected page
  }

  if (!canViewAnalytics(session.user.roles)) {
    return (
      <div className="text-red-500 p-6">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  // Insights are organisation-wide for everyone who can reach this page,
  // including form-scoped admins: the form-type scope limits which
  // submissions they administer, not which statistics they can read.
  const [submissions, pendingApprovals] = await Promise.all([
    prisma.formSubmission.findMany({
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
        formType: { select: { name: true } },
        createdBy: { select: { department: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.approval.findMany({
      where: { status: "PENDING" },
      select: { approver: { select: { fullname: true } } },
    }),
  ]);

  const totalSubmissions = submissions.length;

  const statusBreakdown = STATUS_LABELS.map((status) => ({
    status,
    count: submissions.filter((s) => s.status === status).length,
  }));

  const formTypeBreakdown = Array.from(
    submissions.reduce((map, s) => {
      const name = s.formType.name;
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const departmentCounts = Array.from(
    submissions.reduce((map, s) => {
      const name = s.createdBy?.department?.name ?? "Unassigned";
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topDepartments = departmentCounts.slice(0, 15);
  const otherDepartmentsCount = departmentCounts
    .slice(15)
    .reduce((sum, d) => sum + d.count, 0);
  const departmentBreakdown =
    otherDepartmentsCount > 0
      ? [...topDepartments, { name: "Other", count: otherDepartmentsCount }]
      : topDepartments;

  const now = new Date();
  const monthlyTrend = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(
      now.getFullYear(),
      now.getMonth() - (11 - index),
      1,
    );
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

    const submitted = submissions.filter(
      (s) => s.createdAt >= monthStart && s.createdAt < monthEnd,
    ).length;

    const resolved = submissions.filter(
      (s) =>
        s.status !== "PENDING" &&
        s.updatedAt >= monthStart &&
        s.updatedAt < monthEnd,
    ).length;

    return {
      label: monthDate.toLocaleString("en-GB", { month: "short" }),
      fullLabel: monthDate.toLocaleString("en-GB", {
        month: "long",
        year: "numeric",
      }),
      submitted,
      resolved,
    };
  });

  const resolvedSubmissions = submissions.filter((s) => s.status !== "PENDING");
  const avgTurnaroundDays =
    resolvedSubmissions.length > 0
      ? resolvedSubmissions.reduce(
          (sum, s) =>
            sum + (s.updatedAt.getTime() - s.createdAt.getTime()) / 86400000,
          0,
        ) / resolvedSubmissions.length
      : null;

  const approverWorkload = Array.from(
    pendingApprovals.reduce((map, a) => {
      const name = a.approver.fullname;
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <FormAnalyticsComponent
      totalSubmissions={totalSubmissions}
      statusBreakdown={statusBreakdown}
      formTypeBreakdown={formTypeBreakdown}
      departmentBreakdown={departmentBreakdown}
      monthlyTrend={monthlyTrend}
      avgTurnaroundDays={avgTurnaroundDays}
      approverWorkload={approverWorkload}
      totalPendingApprovals={pendingApprovals.length}
    />
  );
}
