import { requireFullAdmin } from "@/src/lib/admin-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
export async function POST(req: NextRequest) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const { steps } = await req.json();

    // One transaction instead of a round trip per step — and a failure part
    // way through no longer leaves the flow half reordered.
    await prisma.$transaction(
      (steps as { id: number; order: number }[]).map((step) =>
        prisma.approvalFlowStep.updateMany({
          where: {
            id: step.id,
          },
          data: {
            order: step.order,
          },
        }),
      ),
    );

    return NextResponse.json(
      { message: "Successfully Updated" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
