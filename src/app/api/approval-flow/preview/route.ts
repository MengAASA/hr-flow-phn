import { requireFullAdmin } from "@/src/lib/admin-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { resolveApprovalChain } from "@/lib/approvalChain";
import { hasFixedApprovalMode } from "@/lib/utils";

// Dry run of the approval chain a given requester would get for a form type.
// Nothing is written; this runs the same resolver as submission.
export async function GET(req: NextRequest) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;

    const formTypeId = Number(req.nextUrl.searchParams.get("formTypeId"));
    const userId = Number(req.nextUrl.searchParams.get("userId"));
    if (!formTypeId || !userId) {
      return NextResponse.json(
        { error: "formTypeId and userId are required" },
        { status: 400 },
      );
    }

    const [formType, requester] = await Promise.all([
      prisma.formType.findUnique({ where: { id: formTypeId } }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { division: true, department: true, section: true },
      }),
    ]);
    if (!formType) {
      return NextResponse.json({ error: "Form type not found" }, { status: 404 });
    }
    if (!requester) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chain = await resolveApprovalChain({
      formTypeId,
      formTypeName: formType.name,
      requester,
      formData: {},
      preview: true,
    });
    if ("error" in chain) {
      return NextResponse.json({ error: chain.error }, { status: 400 });
    }

    const toPerson = (u: {
      id: number;
      fullname: string;
      staffid: string;
      role: string;
      designation: string | null;
    }) => ({
      id: u.id,
      fullname: u.fullname,
      staffid: u.staffid,
      role: u.role,
      designation: u.designation,
    });

    return NextResponse.json({
      formType: { id: formType.id, name: formType.name },
      // Grievance and Employee Review add their own routing on top of the
      // configured steps, so the preview is only an approximation for them.
      customRouting: hasFixedApprovalMode(formType.name),
      requester: {
        ...toPerson(requester),
        division: requester.division?.name ?? null,
        department: requester.department?.name ?? null,
        section: requester.section?.name ?? null,
      },
      steps: chain.entries.map((entry) => ({
        stepId: entry.step.id,
        order: entry.step.order,
        stepType: entry.step.stepType,
        approvalMode: entry.step.approvalMode,
        status: entry.status,
        reason: entry.status === "SKIPPED" ? entry.reason : null,
        approvers: entry.status === "ACTIVE" ? entry.approvers.map(toPerson) : [],
      })),
    });
  } catch (error) {
    console.error("Error previewing approval chain:", error);
    return NextResponse.json({ error: "Failed to preview approval chain" }, { status: 500 });
  }
}
