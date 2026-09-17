import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/src/lib/auth-options";
import { canAccessHarassmentReports } from "@/lib/compliance-officers";
import { prisma } from "@/lib/prisma";
import ComplianceDashboard from "@/app/component/compliance/ComplianceDashboard";

export default async function CompliancePage() {
  const session = await getServerSession(authOptions);

  if (!session || !(await canAccessHarassmentReports(session.user.staffid, session.user.roles))) {
    redirect("/");
  }

  const reports = await prisma.sexualHarassmentReport.findMany({
    include: { attachments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="w-full font-poppins">
      <div className="mb-4">
        <h1 className="font-bold text-3xl">Sexual Harassment Reports</h1>
        <p className="text-indigo-800">
          Restricted to designated compliance officers only.
        </p>
      </div>

      <ComplianceDashboard reports={reports} />
    </div>
  );
}
