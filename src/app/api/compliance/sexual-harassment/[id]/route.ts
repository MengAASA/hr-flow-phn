import { NextRequest, NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { canAccessHarassmentReports } from "@/lib/compliance-officers";
import { prisma } from "@/lib/prisma";
import { transporter } from "@/lib/emailService";
import { SexualHarassmentReportStatus } from "@/generated/client";

const emailFrom = process.env.EMAIL;

const VALID_STATUSES = Object.values(SexualHarassmentReportStatus);

function hasAdminAccess(session: Session | null) {
  return !!session?.user?.roles?.includes("ADMIN");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!hasAdminAccess(session) && !(await canAccessHarassmentReports(session.user.staffid, session.user.roles)))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const report = await prisma.sexualHarassmentReport.findUnique({
      where: { id: reportId },
      include: { attachments: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ data: report }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sexual harassment report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!hasAdminAccess(session) && !(await canAccessHarassmentReports(session.user.staffid, session.user.roles)))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const { status, caseNotes } = await req.json();

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.sexualHarassmentReport.findUnique({
      where: { id: reportId },
      select: { reporterEmail: true, reporterName: true, staffId: true, departmentName: true, createdAt: true },
    });

    const updated = await prisma.sexualHarassmentReport.update({
      where: { id: reportId },
      data: {
        ...(status ? { status } : {}),
        ...(caseNotes !== undefined ? { caseNotes } : {}),
      },
    });

    if (status && existing?.reporterEmail) {
      const newStatus = status as SexualHarassmentReportStatus;
      const statusSubjectMap: Partial<Record<SexualHarassmentReportStatus, string>> = {
        UNDER_REVIEW: "Your Report Is Now Under Review",
        RESOLVED: "Your Report Has Been Resolved",
        CLOSED: "Your Report Has Been Closed",
      };
      const subject = statusSubjectMap[newStatus];

      if (subject) {
        try {
          const statusUpdateMail = {
            from: emailFrom,
            to: existing.reporterEmail,
            subject,
            template: "SexualHarassmentStatusUpdate",
            context: {
              subject,
              recipientName: existing.reporterName,
              reportId,
              reporterName: existing.reporterName,
              staffId: existing.staffId ?? "N/A",
              department: existing.departmentName ?? "N/A",
              submittedAt: new Date(existing.createdAt).toLocaleString(),
              updatedAt: new Date().toLocaleString(),
              caseNotes: caseNotes || null,
              isUnderReview: newStatus === "UNDER_REVIEW",
              isResolved: newStatus === "RESOLVED",
              isClosed: newStatus === "CLOSED",
            },
          };
          await transporter.sendMail(statusUpdateMail);
        } catch (mailErr) {
          console.error("Failed to send status update email:", mailErr);
        }
      }
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("Error updating sexual harassment report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
