import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { canAccessHarassmentReports } from "@/lib/compliance-officers";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ isComplianceOfficer: false }, { status: 200 });
  }

  const officer = await canAccessHarassmentReports(session.user.staffid, session.user.roles);
  return NextResponse.json({ isComplianceOfficer: officer }, { status: 200 });
}
