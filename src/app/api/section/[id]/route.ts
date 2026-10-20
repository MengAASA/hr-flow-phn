import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireFullAdmin } from "@/src/lib/admin-access";
import {
  getOrgUnitUsage,
  isOrgUnitInUse,
  orgUnitInUseResponse,
  parseUnitName,
} from "@/src/lib/org-units";

// Rename and/or (de)activate a section. Body: { name?, isActive? }
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const id = Number((await context.params).id);

    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { name?: string; isActive?: boolean } = {};

    if (body?.name !== undefined) {
      const name = parseUnitName(body.name);
      if (!name) {
        return NextResponse.json({ error: "Section name is required" }, { status: 400 });
      }
      const duplicate = await prisma.section.findFirst({
        where: { name, departmentId: existing.departmentId, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "This department already has a section with this name" }, { status: 409 });
      }
      data.name = name;
    }

    if (typeof body?.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const updated = await prisma.section.update({ where: { id }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

// Hard delete, refused while anything still references the section.
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const id = Number((await context.params).id);

    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const usage = await getOrgUnitUsage("section", id);
    if (isOrgUnitInUse(usage)) {
      return orgUnitInUseResponse("section", usage);
    }

    await prisma.section.delete({ where: { id } });
    return NextResponse.json({ message: "Section deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
