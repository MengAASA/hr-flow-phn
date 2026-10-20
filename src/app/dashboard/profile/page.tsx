// src/app/dashboard/profile/page.tsx
import ProfileComponent from "@/app/component/profile/ProfileComponent";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/"); //protected page
  }

  // if (!session?.user?.staffid) {
  //   return (
  //     <div className="text-red-500 p-6">
  //       Unauthorized access — please sign in.
  //     </div>
  //   );
  // }

  const getUser = await prisma.user.findUnique({
    where: {
      staffid: session.user.staffid,
    },
    include: {
      division: true,
      department: true,
      section: true,
    },
  });

  if (!getUser) {
    return (
      <div className="text-red-500 p-6">User not found in the database.</div>
    );
  }

  // One grouped count instead of four separate queries over the same rows.
  const statusCounts = await prisma.formSubmission.groupBy({
    by: ["status"],
    where: { createdById: getUser.id },
    _count: { _all: true },
  });
  const countFor = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count._all ?? 0;

  const totalSubmitted = statusCounts.reduce((sum, s) => sum + s._count._all, 0);
  const totalPending = countFor("PENDING");
  const totalApproved = countFor("APPROVED");
  const totalRejected = countFor("REJECTED");

  const stats = [
    {
      label: "Total Submitted",
      value: totalSubmitted,
      color: "text-indigo-700",
    },
    { label: "Pending", value: totalPending, color: "text-yellow-600" },
    { label: "Approved", value: totalApproved, color: "text-green-600" },
    { label: "Rejected", value: totalRejected, color: "text-red-600" },
  ];

  return (
    <div className="w-full font-poppins">
      <div>
        <h1 className="font-bold text-3xl">Profile</h1>
        <p className="text-indigo-800">
          Manage your personal information and view your activity
        </p>
      </div>
      <ProfileComponent userProfile={getUser} stats={stats} />
    </div>
  );
}

