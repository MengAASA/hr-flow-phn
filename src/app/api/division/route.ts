import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireFullAdmin } from "@/src/lib/admin-access";
import { activeFilter, parseUnitName } from "@/src/lib/org-units";


export async function GET(req: NextRequest) {
    try {
        const getDivision = await prisma.division.findMany({
            where: activeFilter(req),
            orderBy: { name: "asc" },
        });
        return NextResponse.json(getDivision, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching divisions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const denied = await requireFullAdmin();
        if (denied) return denied;

        const body = await req.json();
        const name = parseUnitName(body?.name);
        if (!name) {
            return NextResponse.json({ error: "Division name is required" }, { status: 400 });
        }

        const duplicate = await prisma.division.findFirst({ where: { name } });
        if (duplicate) {
            return NextResponse.json({ error: "A division with this name already exists" }, { status: 409 });
        }

        const createDivision = await prisma.division.create({ data: { name } });
        return NextResponse.json(createDivision, { status: 201 });
    }
    catch (error) {
        console.error("Error creating division:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
