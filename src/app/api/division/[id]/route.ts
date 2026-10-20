import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireFullAdmin } from "@/src/lib/admin-access";
import {
  getOrgUnitUsage,
  isOrgUnitInUse,
  orgUnitInUseResponse,
  parseUnitName,
} from "@/src/lib/org-units";

// Rename and/or (de)activate a division. Body: { name?, isActive? }
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const id = Number((await context.params).id);

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { name?: string; isActive?: boolean } = {};

    if (body?.name !== undefined) {
      const name = parseUnitName(body.name);
      if (!name) {
        return NextResponse.json({ error: "Division name is required" }, { status: 400 });
      }
      const duplicate = await prisma.division.findFirst({
        where: { name, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "A division with this name already exists" }, { status: 409 });
      }
      data.name = name;
    }

    if (typeof body?.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const updated = await prisma.division.update({ where: { id }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating division:", error);
    return NextResponse.json({ error: "Failed to update division" }, { status: 500 });
  }
}

// Hard delete, refused while anything still references the division.
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const id = Number((await context.params).id);

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    const usage = await getOrgUnitUsage("division", id);
    if (isOrgUnitInUse(usage)) {
      return orgUnitInUseResponse("division", usage);
    }

    await prisma.division.delete({ where: { id } });
    return NextResponse.json({ message: "Division deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting division:", error);
    return NextResponse.json({ error: "Failed to delete division" }, { status: 500 });
  }
}
