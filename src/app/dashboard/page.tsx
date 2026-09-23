import DashboardComponent from "../component/dashboard/DashboardComponent";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); //protected page
  }

  const findUser = await prisma.user.findUnique({
    where: {
      staffid: session?.user?.staffid || "",
    },
  });

  if (!findUser) {
    return <p>User not found</p>;
  }

  const [
    countApprovedForms,
    totalForms,
    totalMembers,
    attentionApprovals,
    attentionCount,
    recentReviewed,
    recentOwnForms,
  ] = await Promise.all([
    prisma.formSubmission.count({
      where: { status: "APPROVED", createdById: findUser.id },
    }),
    prisma.formType.count(),
    prisma.user.count(),
    prisma.approval.findMany({
      where: { approverId: findUser.id, status: "PENDING" },
      include: {
        submission: {
          include: {
            createdBy: { select: { fullname: true, attachment: true } },
            formType: { select: { name: true } },
          },
        },
      },
      orderBy: { submission: { createdAt: "asc" } },
      take: 5,
    }),
    prisma.approval.count({
      where: { approverId: findUser.id, status: "PENDING" },
    }),
    prisma.approval.findMany({
      where: {
        approverId: findUser.id,
        status: { in: ["APPROVED", "REJECTED", "ESCALATED"] },
      },
      include: {
        submission: {
          include: {
            createdBy: { select: { fullname: true, attachment: true } },
            formType: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.formSubmission.findMany({
      where: {
        createdById: findUser.id,
        status: { in: ["APPROVED", "REJECTED", "CANCELLED"] },
      },
      include: {
        formType: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const recentActivity = [
    ...recentReviewed.map((approval) => ({
      key: `approval-${approval.id}`,
      submissionId: approval.submission.id,
      formTypeName: approval.submission.formType.name,
      status: approval.status,
      personName: approval.submission.createdBy.fullname,
      personAttachment: approval.submission.createdBy.attachment,
      role: "reviewer" as const,
      date: approval.updatedAt.toISOString(),
    })),
    ...recentOwnForms.map((form) => ({
      key: `form-${form.id}`,
      submissionId: form.id,
      formTypeName: form.formType.name,
      status: form.status,
      personName: null,
      personAttachment: null,
      role: "requester" as const,
      date: form.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <DashboardComponent
      countApprovedForms={countApprovedForms}
      totalForms={totalForms}
      totalMembers={totalMembers}
      userSession={session}
      attentionApprovals={attentionApprovals.map((approval) => ({
        approvalId: approval.id,
        submissionId: approval.submission.id,
        formTypeName: approval.submission.formType.name,
        requesterName: approval.submission.createdBy.fullname,
        requesterAttachment: approval.submission.createdBy.attachment,
        submittedAt: approval.submission.createdAt.toISOString(),
      }))}
      attentionCount={attentionCount}
      recentActivity={recentActivity}
    />
  );
}
