import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireFullAdmin } from "@/src/lib/admin-access";
import { activeFilter, parseUnitName } from "@/src/lib/org-units";


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const divisionId = searchParams.get("divisionId");

        const getDepartment = await prisma.department.findMany({
            where: {
                divisionId: Number(divisionId),
                ...activeFilter(req),
            },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(getDepartment, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching departments:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Body: { name, divisionId }
export async function POST(req: NextRequest) {
    try {
        const denied = await requireFullAdmin();
        if (denied) return denied;

        const body = await req.json();
        const name = parseUnitName(body?.name);
        const divisionId = Number(body?.divisionId);
        if (!name || !divisionId) {
            return NextResponse.json({ error: "Department name and division are required" }, { status: 400 });
        }

        const division = await prisma.division.findUnique({ where: { id: divisionId } });
        if (!division) {
            return NextResponse.json({ error: "Division not found" }, { status: 404 });
        }

        const duplicate = await prisma.department.findFirst({ where: { name, divisionId } });
        if (duplicate) {
            return NextResponse.json({ error: "This division already has a department with this name" }, { status: 409 });
        }

        const createDepartment = await prisma.department.create({ data: { name, divisionId } });
        return NextResponse.json(createDepartment, { status: 201 });
    }
    catch (error) {
        console.error("Error creating department:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
