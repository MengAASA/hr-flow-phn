import { requireFullAdmin } from "@/src/lib/admin-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { parseRequesterCondition } from "@/lib/approverResolution";

export async function POST(req: NextRequest) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const body = await req.json();

    const {
      formTypeId,
      order,
      role,
      fallbackRole,
      combineWithFallback,
      division,
      department,
      section,
      approver,
      approverSource,
      formFieldKey,
      approvalMode,
      stepType,
      requesterDivisionMode,
      requesterDivisions,
    } = body;

    // Treat "0" or "" as null
    const parseNullableNumber = (value: string) => {
      if (!value || value === "0") return null;
      return Number(value);
    };

    const requesterCondition = parseRequesterCondition(
      requesterDivisionMode,
      requesterDivisions,
    );
    if ("error" in requesterCondition) {
      return NextResponse.json({ error: requesterCondition.error }, { status: 400 });
    }

    const newApprovalFlow = await prisma.approvalFlowStep.create({
      data: {
        formTypeId: Number(formTypeId),
        order: Number(order),
        // "role" is unused when approverSource is MANUAL/FORM_FIELD, but the
        // column is required, so fall back to a harmless placeholder.
        role: role || "STAFF",
        fallbackRole: fallbackRole || null,
        combineWithFallback: Boolean(fallbackRole) && Boolean(combineWithFallback),
        divisionId: parseNullableNumber(division),
        departmentId: parseNullableNumber(department),
        sectionId: parseNullableNumber(section),
        approverSource: approverSource || "ROLE",
        formFieldKey: formFieldKey || null,
        approvalMode: approvalMode || "ALL",
        stepType: stepType === "NOTIFY" ? "NOTIFY" : "APPROVER",
        requesterDivisionMode: requesterCondition.mode,
        requesterDivisions: {
          create: requesterCondition.divisionIds.map((divisionId) => ({ divisionId })),
        },
      },
    });

    if (approver && approver.length > 0) {
      await prisma.approvalStepApprover.createMany({
        data: approver.map((id: string) => ({
          stepId: newApprovalFlow.id,
          userId: Number(id),
        })),
        skipDuplicates: true,
      });
    }

    const stepWithApprovers = await prisma.approvalFlowStep.findUnique({
      where: { id: newApprovalFlow.id },
      include: { approvalStepApprovers: { include: { user: true } } },
    });

    return NextResponse.json(stepWithApprovers);
  } catch (error) {
    console.error("Error creating approval flow:", error);
    return new Response("Error creating approval flow", { status: 500 });
  }
}

export async function GET() {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const approvalFlows = await prisma.approvalFlowStep.findMany({
      include: {
        formType: true,
        division: true,
        department: true,
        section: true,
        user: true,
        approvalStepApprovers: {
          include: { user: true },
        },
        requesterDivisions: { include: { division: true } },
      },
    });
    return NextResponse.json(approvalFlows);
  } catch (error) {
    console.error("Error fetching approval flows:", error);
    return new Response("Error fetching approval flows", { status: 500 });
  }
}

