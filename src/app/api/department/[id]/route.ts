import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireFullAdmin } from "@/src/lib/admin-access";
import {
  getOrgUnitUsage,
  isOrgUnitInUse,
  orgUnitInUseResponse,
  parseUnitName,
} from "@/src/lib/org-units";

// Rename and/or (de)activate a department. Body: { name?, isActive? }
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const id = Number((await context.params).id);

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { name?: string; isActive?: boolean } = {};

    if (body?.name !== undefined) {
      const name = parseUnitName(body.name);
      if (!name) {
        return NextResponse.json({ error: "Department name is required" }, { status: 400 });
      }
      const duplicate = await prisma.department.findFirst({
        where: { name, divisionId: existing.divisionId, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "This division already has a department with this name" }, { status: 409 });
      }
      data.name = name;
    }

    if (typeof body?.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const updated = await prisma.department.update({ where: { id }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

// Hard delete, refused while anything still references the department.
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireFullAdmin();
    if (denied) return denied;
    const id = Number((await context.params).id);

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const usage = await getOrgUnitUsage("department", id);
    if (isOrgUnitInUse(usage)) {
      return orgUnitInUseResponse("department", usage);
    }

    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ message: "Department deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
