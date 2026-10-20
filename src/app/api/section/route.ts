import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireFullAdmin } from "@/src/lib/admin-access";
import { activeFilter, parseUnitName } from "@/src/lib/org-units";


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const departmentId = searchParams.get("departmentId");

        const getSection = await prisma.section.findMany({
            where: {
                departmentId: Number(departmentId),
                ...activeFilter(req),
            },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(getSection, { status: 200 });
    }
    catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Body: { name, departmentId }
export async function POST(req: NextRequest) {
    try {
        const denied = await requireFullAdmin();
        if (denied) return denied;

        const body = await req.json();
        const name = parseUnitName(body?.name);
        const departmentId = Number(body?.departmentId);
        if (!name || !departmentId) {
            return NextResponse.json({ error: "Section name and department are required" }, { status: 400 });
        }

        const department = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!department) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        const duplicate = await prisma.section.findFirst({ where: { name, departmentId } });
        if (duplicate) {
            return NextResponse.json({ error: "This department already has a section with this name" }, { status: 409 });
        }

        const createSection = await prisma.section.create({ data: { name, departmentId } });
        return NextResponse.json(createSection, { status: 201 });
    }
    catch (error) {
        console.error("Error creating section:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
