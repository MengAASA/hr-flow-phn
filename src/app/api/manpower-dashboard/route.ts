import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { canViewAnalytics } from "@/lib/analytics-access";
import { prisma } from "../../../../lib/prisma";

type EmployeeRecord = {
  empNo: string;
  division: string;
  department: string;
  section: string;
  plant: string;
  gender: string;
  labourCategory: string;
  employeeType: string;
  employeeStatus: string;
  citizenship: string;
  joinDate: string;
  resignationDate: string | null;
  snapshotMonth?: number | null;
  snapshotYear?: number | null;
};

function isEmployeeRecordArray(value: unknown): value is EmployeeRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.empNo === "string" &&
        typeof item.department === "string" &&
        typeof item.plant === "string" &&
        typeof item.joinDate === "string",
    )
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!canViewAnalytics(session?.user?.roles)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Sorted in JS rather than via `orderBy`: MySQL's filesort has to buffer
    // whole rows for a sort, and these rows carry a large `employeeData`
    // JSON blob, which blows past the server's sort_buffer_size.
    const unorderedUploads = await prisma.manpowerUpload.findMany({
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        recordCount: true,
        createdAt: true,
        snapshotMonth: true,
        snapshotYear: true,
        employeeData: true,
        uploadedBy: {
          select: {
            fullname: true,
            staffid: true,
          },
        },
      },
    });

    if (unorderedUploads.length === 0) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    const uploads = unorderedUploads.sort(
      (a, b) => a.snapshotYear - b.snapshotYear || a.snapshotMonth - b.snapshotMonth,
    );

    const employees = uploads.flatMap((upload) => {
      if (!isEmployeeRecordArray(upload.employeeData)) {
        console.error(
          "Manpower upload has invalid employeeData shape:",
          upload.id,
        );
        return [];
      }

      return upload.employeeData;
    });

    return NextResponse.json({
      data: {
        employees,
        uploads: uploads.map(({ employeeData: _employeeData, ...upload }) => upload),
      },
    });
  } catch (error) {
    console.error("Failed to fetch manpower upload:", error);
    return NextResponse.json(
      { error: "Failed to fetch manpower upload." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.staffid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewAnalytics(session.user.roles)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { staffid: session.user.staffid },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const rawEmployees = formData.get("employees");
    const rawMonth = formData.get("month");
    const rawYear = formData.get("year");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (typeof rawEmployees !== "string") {
      return NextResponse.json(
        { error: "Employee data is required" },
        { status: 400 },
      );
    }

    const snapshotMonth = Number(rawMonth);
    const snapshotYear = Number(rawYear);

    if (
      !Number.isInteger(snapshotMonth) ||
      snapshotMonth < 1 ||
      snapshotMonth > 12 ||
      !Number.isInteger(snapshotYear) ||
      snapshotYear < 2000 ||
      snapshotYear > 2100
    ) {
      return NextResponse.json(
        { error: "A valid month and year are required" },
        { status: 400 },
      );
    }

    const parsedEmployees: unknown = JSON.parse(rawEmployees);

    if (!isEmployeeRecordArray(parsedEmployees) || parsedEmployees.length === 0) {
      return NextResponse.json(
        { error: "Employee data is invalid" },
        { status: 400 },
      );
    }

    // The chosen month/year is the source of truth for the whole upload,
    // regardless of what the client-side sheet-name parsing guessed.
    const employeesForPeriod = parsedEmployees.map((employee) => ({
      ...employee,
      snapshotMonth,
      snapshotYear,
    }));

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const upload = await prisma.manpowerUpload.upsert({
      where: {
        snapshotMonth_snapshotYear: { snapshotMonth, snapshotYear },
      },
      create: {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileContent: fileBuffer,
        employeeData: employeesForPeriod,
        recordCount: employeesForPeriod.length,
        snapshotMonth,
        snapshotYear,
        uploadedById: user.id,
      },
      update: {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileContent: fileBuffer,
        employeeData: employeesForPeriod,
        recordCount: employeesForPeriod.length,
        uploadedById: user.id,
      },
    });

    return NextResponse.json({
      message: "Manpower workbook saved successfully.",
      data: {
        id: upload.id,
        fileName: upload.fileName,
        recordCount: upload.recordCount,
        createdAt: upload.createdAt,
        snapshotMonth: upload.snapshotMonth,
        snapshotYear: upload.snapshotYear,
        employees: employeesForPeriod,
      },
    });
  } catch (error) {
    console.error("Failed to save manpower upload:", error);
    return NextResponse.json(
      { error: "Failed to save manpower upload." },
      { status: 500 },
    );
  }
}

