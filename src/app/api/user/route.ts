import { isAdminRole } from "@/src/lib/admin-access";
import { flattenRoles } from "@/src/lib/admin-roles";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hash } from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Convert 0 values to null for database fields that should be optional
    const processedBody = {
      ...body,
      division:
        body.division === 0 || body.division === "0" ? null : body.division,
      department:
        body.department === 0 || body.department === "0"
          ? null
          : body.department,
      section: body.section === 0 || body.section === "0" ? null : body.section,
    };

    const { password, staffid, email, division, department, section, ...rest } =
      processedBody;

    // Type assertions to ensure string types
    const staffIdString = String(staffid);
    const emailString = String(email);
    const passwordString = String(password);

    const checkStaffId = await prisma.user.findUnique({
      where: {
        staffid: staffIdString,
      },
    });

    if (checkStaffId) {
      return NextResponse.json(
        { error: "Staff id already exist" },
        { status: 400 }
      );
    }

    const checkEmail = await prisma.user.findUnique({
      where: {
        email: emailString,
      },
    });

    if (checkEmail) {
      return NextResponse.json(
        { error: "Email already exist" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(passwordString, 12);

    // Handle number conversions - use null for empty values
    const divisionId = division ? Number(division) : null;
    const departmentId = department ? Number(department) : null;
    const sectionId = section ? Number(section) : null;

    const createUser = await prisma.user.create({
      data: {
        password: hashedPassword,
        staffid: staffIdString,
        email: emailString,
        divisionId: divisionId,
        departmentId: departmentId,
        sectionId: sectionId,
        ...rest,
      },
    });

    return NextResponse.json(
      { message: "New user added successfully", user: createUser },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Forms let any staff member pick a colleague (e.g. "Immediate Superior",
    // or the staff-lookup on the Employee Monthly Performance Review form),
    // so any authenticated user gets a basic directory including org-unit
    // fields. Admin screens (user management, approval flow setup) get the
    // full detail below.
    if (!isAdminRole(session.user?.roles)) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullname: true,
          staffid: true,
          role: true,
          designation: true,
          divisionId: true,
          division: { select: { name: true } },
          departmentId: true,
          department: { select: { name: true } },
          sectionId: true,
          section: { select: { name: true } },
        },
      });
      return NextResponse.json(users);
    }

    const users = await prisma.user.findMany({
      include: {
        division: true,
        department: true,
        section: true,
        formTypeScopes: { select: { formTypeId: true } },
        roles: { select: { role: true } },
      },
    });
    const usersWithRoles = users.map((u) => ({
      ...u,
      roles: flattenRoles(u.role, u.roles),
    }));
    return NextResponse.json(usersWithRoles);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

