"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { IoClose } from "react-icons/io5";
import type * as XlsxModule from "xlsx";

// xlsx is large and only needed when someone uploads a workbook or downloads
// the template, so it is loaded on first use instead of with the page.
let xlsx: typeof XlsxModule | null = null;
async function loadXlsx(): Promise<typeof XlsxModule> {
  xlsx ??= await import("xlsx");
  return xlsx;
}

export function ChartContainer({
  className,
  style,
  children,
}: {
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={className} style={style}>
      {mounted ? children : null}
    </div>
  );
}

export type EmployeeRecord = {
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

export type TrendPoint = {
  label: string;
  fullLabel?: string;
  value: number;
  highlight?: boolean;
  year?: number;
  month?: number;
};

export type ManpowerUploadMeta = {
  id: number;
  fileName: string;
  fileType: string | null;
  fileSize: number;
  recordCount: number;
  createdAt: string;
  snapshotMonth: number;
  snapshotYear: number;
  uploadedBy?: {
    fullname: string;
    staffid: string;
  };
};

export type ManpowerDashboardData = {
  employees: EmployeeRecord[];
  uploads: ManpowerUploadMeta[];
};

export const monthNames = [
  "All Months",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const monthShortNames = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const categoryOptions = [
  "All Categories",
  "Direct Labour",
  "Mfg Overhead",
  "General Admin",
  "Executive",
  "Non Executive",
  "Permanent",
  "Contract",
  "Local",
  "Foreign",
];

export const currentDate = new Date();
export const chartBarColors = ["#0f766e", "#4338ca", "#b45309", "#7c3aed"];
export const preferredPlantOrder = [
  "SHAH ALAM 1 PLANT",
  "SHAH ALAM 2 PLANT",
  "PEGOH PLANT",
  "RASA PLANT",
  "BUKIT BERUNTUNG PLANT",
  "FIF TANJUNG MALIM",
  "PEKAN PLANT",
  "TANJUNG MALIM 2",
  "ALAM IMPIAN PLANT",
];

export const plantAbbreviations: Record<string, string> = {
  "SHAH ALAM 1 PLANT": "SA1",
  "SHAH ALAM 2 PLANT": "SA2",
  "PEGOH PLANT": "PGH",
  "RASA PLANT": "RASA",
  "BUKIT BERUNTUNG PLANT": "BB",
  "FIF TANJUNG MALIM": "FIFTGM",
  "PEKAN PLANT": "PKN",
  "TANJUNG MALIM 2": "TGM2",
  "ALAM IMPIAN PLANT": "AI",
};

export function abbreviatePlant(plant: string) {
  return plantAbbreviations[plant] ?? plant;
}

export const divisionAbbreviations: Record<string, string> = {
  "BUSINESS DEVELOPMENT & STRATEGY": "BD",
  "DHMSB OPERATIONS": "DHMSB",
  "ENGINEERING AND RD": "ENGINEERING",
  "FINANCE PROCUREMENT AND IT": "FPIT",
  "HUMAN CAPITAL AND ESG": "HC",
  "OPERATION MANAGEMENT": "OPERATIONS",
  "QUALITY MANAGEMENT": "QUALITY",
  "CEO OFFICE": "CEO",
  "BUSINESS COORDINATOR": "BC",
};

export function abbreviateDivision(division: string) {
  const normalized = division.trim().toUpperCase();
  return divisionAbbreviations[normalized] ?? division;
}

export const departmentAbbreviations: Record<string, string> = {
  "MANUFACTURING AND SCM - TM 1": "MFG SCM TM1",
  "QUALITY ASSURANCE & CONTROL SA 1": "QAQC SA1",
  "MANUFACTURING AND SCM - PEKAN": "MFG SCM PEKAN",
  "MANUFACTURING AND SCM - PEGOH": "MFG SCM PEGOH",
  FINANCE: "FINANCE",
  "HICOM INTELLIGENT MOBILITY": "HICOM MOBILITY",
  "REWARDS AND ADMIN": "REWARDS ADMIN",
  "MANUFACTURING AND SCM - SA1": "MFG SCM SA1",
  "PROGRAM MANAGEMENT II": "PROGRAM MGMT II",
  "INVENTORY MGMT AND PLANNING": "INV & PLAN",
  "MANUFACTURING AND SCM - BB/RASA": "MFG SCM BB/RASA",
  "QUALITY ASSURANCE & CONTROL SA 2": "QAQC SA2",
  "FACILITY AND ENERGY MANAGEMENT": "FACILITY & ENERGY",
  "QUALITY ASSURANCE & CONTROL - BB, RASA, TM 1 AND TM 2": "QAQC BB/RASA",
  "CULTURE AND TALENT MANAGEMENT": "CULTURE & TALENT",
  "PROCESS ENGINEERING": "PROCESS ENG",
  "IT AND DIGITALISATION": "IT & DIGITAL",
  "QUALITY ASSURANCE & CONTROL-DEV - MLK PKN": "QAQC DEV MLK",
  "PROGRAM MANAGEMENT III": "PROGRAM MGMT III",
  "MANUFACTURING AND SCM - SA 2": "MFG SCM SA2",
  "EQUIPMENT MAINT I - SA 1, SA 2, DHMSB, PEGOH": "EQUIP MAINT I",
  "MFG & SCM - DHMSB": "MFG SCM DHMSB",
  "MANUFACTURING AND SCM - TM 2": "MFG SCM TM2",
  "PROGRAM MANAGEMENT I": "PROGRAM MGMT I",
  "EQUIPMENT MAINT II - BB, RASA, TM1, TM2": "EQUIP MAINT II",
  "RESEARCH AND DEVELOPMENT": "R&D",
  "TOOLING DESIGN AND DEVELOPMENT": "TOOLING DEV",
  "PROCUREMENT & VENDOR DEV": "PROC & VENDOR",
  "CEO OFFICE": "CEO OFFICE",
  "ESG HEALTH AND SAFETY": "ESG H&S",
  "COSTING AND COMMERCIAL": "COST & COMM",
  "QMS & SQ": "QMS & SQ",
  "QUALITY DEVELOPMENT": "QUALITY DEV",
  "BUSINESS DEVELOPMENT": "BUSINESS DEV",
  OPERATIONS: "OPERATIONS",
  "ENERGY SOLUTION": "ENERGY SOL",
  "ENGINEERING MANAGEMENT I": "ENGINEERING I",
  "OPERATION III": "OPERATION III",
  "PROGRAM MANAGEMENT": "PROGRAM MGMT",
  "-": "-",
  "ENGINEERING MANAGEMENT II": "ENGINEERING II",
  "OPERATION II": "OPERATION II",
  "OPERATION I AND IMP": "OP I & IMP",
  "OPERATION IV": "OPERATION IV",
  "QUALITY MANAGEMENT": "QUALITY MGMT",
  "QUALITY OPERATIONS": "QUALITY OPS",
  "ENERGY MGMT AUTHORITY LIASON": "ENERGY MGMT",
};

export function abbreviateDepartment(department: string) {
  const normalized = department.trim().toUpperCase();
  return departmentAbbreviations[normalized] ?? department;
}

export const monthNumberByName: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeNullableText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

export function normalizeGender(value: unknown) {
  const normalized = normalizeText(value).toUpperCase();

  if (normalized === "M" || normalized === "MALE") {
    return "M";
  }

  if (normalized === "F" || normalized === "FEMALE") {
    return "F";
  }

  return normalized;
}

export function formatCount(value: number) {
  return value.toLocaleString();
}

export function normalizeExcelDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()}`;
  }

  // Only reached while parsing an upload, by which point loadXlsx() has run.
  if (typeof value === "number" && xlsx) {
    const parsedDate = xlsx.SSF.parse_date_code(value);

    if (parsedDate) {
      return `${parsedDate.m}/${parsedDate.d}/${parsedDate.y}`;
    }
  }

  return normalizeText(value);
}

export function parseSheetPeriod(sheetName: string) {
  const normalizedSheetName = sheetName.trim().toLowerCase();
  const monthMatch = normalizedSheetName.match(
    /(?:^|[^a-z])(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:[^a-z]|$)/i,
  );
  const yearMatch = normalizedSheetName.match(/(?:19|20)?\d{2,4}/);

  if (!monthMatch || !yearMatch) {
    return { snapshotMonth: null, snapshotYear: null };
  }

  const matchedMonth = monthMatch[1].toLowerCase();
  const snapshotMonth = monthNumberByName[matchedMonth] ?? null;
  const rawYear = yearMatch[0];
  const numericYear = Number(rawYear);
  const snapshotYear = rawYear.length === 2 ? 2000 + numericYear : numericYear;

  return {
    snapshotMonth,
    snapshotYear,
  };
}

export function mapWorksheetRowsToEmployees(
  rows: Record<string, unknown>[],
  sheetName?: string,
) {
  const { snapshotMonth, snapshotYear } = parseSheetPeriod(sheetName ?? "");

  return rows
    .map((row) => ({
      empNo: normalizeText(row.EmpNo),
      division: normalizeText(row.Division),
      department: normalizeText(row.Department),
      section: normalizeText(row.Section_Occ),
      plant: normalizeText(row.Team),
      gender: normalizeGender(row.Sex),
      labourCategory: normalizeText(row.Level_Occ).toUpperCase(),
      employeeType: normalizeText(row.Employee_Type).toUpperCase(),
      employeeStatus: normalizeText(row.Employee_Status).toUpperCase(),
      citizenship: normalizeText(row.Citizenship).toUpperCase(),
      joinDate: normalizeExcelDate(row.Date_Join),
      resignationDate: normalizeNullableText(
        normalizeExcelDate(row.Date_Resignation),
      ),
      snapshotMonth,
      snapshotYear,
    }))
    .filter(
      (employee) =>
        employee.empNo &&
        employee.division &&
        employee.department &&
        employee.section &&
        employee.plant &&
        employee.joinDate,
    );
}

export function parseDate(value: string | null) {
  if (!value) return null;

  const [month, day, year] = value.split("/").map(Number);
  if (!month || !day || !year) return null;

  const normalizedYear =
    year < 100 ? (year >= 70 ? 1900 + year : 2000 + year) : year;

  return new Date(normalizedYear, month - 1, day);
}

export function isActiveAt(employee: EmployeeRecord, date: Date) {
  const joinDate = parseDate(employee.joinDate);
  const resignationDate = parseDate(employee.resignationDate);

  if (!joinDate) return false;

  return joinDate <= date && (!resignationDate || resignationDate > date);
}

export function isActiveWithinPeriod(
  employee: EmployeeRecord,
  startDate: Date,
  endDate: Date,
) {
  const joinDate = parseDate(employee.joinDate);
  const resignationDate = parseDate(employee.resignationDate);

  if (!joinDate) return false;

  return (
    joinDate <= endDate && (!resignationDate || resignationDate >= startDate)
  );
}

export function matchesCategory(employee: EmployeeRecord, category: string) {
  if (category === "All Categories") return true;

  const normalizedCategory = category.toUpperCase();

  return (
    employee.labourCategory === normalizedCategory ||
    employee.employeeType === normalizedCategory ||
    employee.employeeStatus === normalizedCategory ||
    (normalizedCategory === "LOCAL" && employee.citizenship === "MALAYSIAN") ||
    (normalizedCategory === "FOREIGN" &&
      employee.citizenship !== "" &&
      employee.citizenship !== "MALAYSIAN")
  );
}

export function matchesPlantDepartmentDivisionCategory(
  employee: EmployeeRecord,
  filters: {
    plant: string;
    department: string;
    division: string;
    category: string;
  },
) {
  if (filters.plant !== "All Plants" && employee.plant !== filters.plant) {
    return false;
  }

  if (
    filters.department !== "All Departments" &&
    employee.department !== filters.department
  ) {
    return false;
  }

  if (
    filters.division !== "All Divisions" &&
    employee.division !== filters.division
  ) {
    return false;
  }

  return matchesCategory(employee, filters.category);
}

export function useManpowerEmployees(
  onLoaded?: (employees: EmployeeRecord[]) => void,
) {
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [uploadMessage, setUploadMessage] = useState(
    "Upload an Excel workbook to load manpower dashboard data.",
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSavedData, setIsLoadingSavedData] = useState(true);

  const applyEmployees = (nextEmployees: EmployeeRecord[], message: string) => {
    setEmployees(nextEmployees);
    setUploadMessage(message);
    onLoadedRef.current?.(nextEmployees);
  };

  const loadSavedData = async () => {
    try {
      const response = await fetch(withBasePath("/api/manpower-dashboard"));

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error("Failed to fetch saved manpower data.");
        }

        return;
      }

      const payload: { data: ManpowerDashboardData | null } =
        await response.json();

      if (!payload.data || payload.data.employees.length === 0) {
        return;
      }

      const periodsLabel = payload.data.uploads
        .map((upload) => `${monthNames[upload.snapshotMonth]} ${upload.snapshotYear}`)
        .join(", ");

      applyEmployees(
        payload.data.employees,
        `Loaded ${payload.data.employees.length} employee records across ${payload.data.uploads.length} period(s): ${periodsLabel}.`,
      );
    } catch (error) {
      console.error(error);
      setUploadMessage(
        "Unable to load the latest saved manpower workbook. You can upload a new Excel file.",
      );
    } finally {
      setIsLoadingSavedData(false);
    }
  };

  useEffect(() => {
    loadSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    period: { month: number; year: number },
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage(`Reading ${file.name} and saving it to the database...`);

      const [buffer, XLSX] = await Promise.all([file.arrayBuffer(), loadXlsx()]);
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setUploadMessage(
          "The uploaded workbook does not contain any worksheet.",
        );
        return;
      }

      const parsedEmployees = workbook.SheetNames.flatMap((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            defval: "",
            raw: false,
          },
        );

        return mapWorksheetRowsToEmployees(rows);
      }).map((employee) => ({
        ...employee,
        snapshotMonth: period.month,
        snapshotYear: period.year,
      }));

      if (parsedEmployees.length === 0) {
        setUploadMessage(
          "No valid manpower rows were found. Expected columns include EmpNo, Department, Team, Level_Occ, Employee_Type, Employee_Status, Education_Category, Date_Join, and Date_Resignation.",
        );
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("employees", JSON.stringify(parsedEmployees));
      formData.append("month", String(period.month));
      formData.append("year", String(period.year));

      const response = await fetch(withBasePath("/api/manpower-dashboard"), {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save manpower workbook.");
      }

      setUploadMessage(
        `Saved ${parsedEmployees.length} employee records for ${monthNames[period.month]} ${period.year}. Refreshing...`,
      );

      // Uploads accumulate one period per month/year, so re-fetch the merged
      // picture from the server rather than replacing local state outright.
      await loadSavedData();
    } catch (error) {
      console.error("Failed to read workbook:", error);
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "The Excel file could not be read. Please upload a valid .xlsx file.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return {
    fileInputRef,
    employees,
    uploadMessage,
    isUploading,
    isLoadingSavedData,
    handleFileUpload,
  };
}

const manpowerTemplateHeaders = [
  "EmpNo",
  "Division",
  "Department",
  "Section_Occ",
  "Team",
  "Sex",
  "Level_Occ",
  "Employee_Type",
  "Employee_Status",
  "Citizenship",
  "Date_Join",
  "Date_Resignation",
];

const manpowerTemplateSampleRow = [
  "T1234",
  "OPERATION MANAGEMENT",
  "MANUFACTURING AND SCM - SA1",
  "ASSEMBLY - SA1",
  "SHAH ALAM 1 PLANT",
  "M",
  "DIRECT LABOUR",
  "NON EXECUTIVE",
  "PERMANENT",
  "MALAYSIAN",
  "1/15/2023",
  "",
];

export async function downloadManpowerTemplate() {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.aoa_to_sheet([
    manpowerTemplateHeaders,
    manpowerTemplateSampleRow,
  ]);
  worksheet["!cols"] = manpowerTemplateHeaders.map(() => ({ wch: 22 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Manpower");
  XLSX.writeFile(workbook, "manpower-upload-template.xlsx");
}

export function DataSourceCard({
  uploadMessage,
  isUploading,
  isLoadingSavedData,
  employeeCount,
  fileInputRef,
  onFileChange,
}: {
  uploadMessage: string;
  isUploading: boolean;
  isLoadingSavedData: boolean;
  employeeCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (
    event: ChangeEvent<HTMLInputElement>,
    period: { month: number; year: number },
  ) => void;
}) {
  const [isPickingPeriod, setIsPickingPeriod] = useState(false);
  const [pendingMonth, setPendingMonth] = useState(currentDate.getMonth() + 1);
  const [pendingYear, setPendingYear] = useState(currentDate.getFullYear());

  const yearOptions = Array.from(
    { length: 7 },
    (_, index) => currentDate.getFullYear() - 5 + index,
  );

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Data Source
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {uploadMessage}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Expected columns: {manpowerTemplateHeaders.join(", ")}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) =>
              onFileChange(event, { month: pendingMonth, year: pendingYear })
            }
            className="hidden"
          />

          <button
            type="button"
            onClick={downloadManpowerTemplate}
            className="inline-flex items-center whitespace-nowrap rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Template
          </button>

          <button
            type="button"
            onClick={() => setIsPickingPeriod(true)}
            disabled={isUploading || isLoadingSavedData}
            className="inline-flex items-center whitespace-nowrap rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
          >
            {isUploading
              ? "Saving..."
              : isLoadingSavedData
                ? "Loading..."
                : "Upload Excel File"}
          </button>
        </div>
      </div>

      {isPickingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Select Upload Period
              </h3>
              <button
                type="button"
                onClick={() => setIsPickingPeriod(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Choose which month and year this workbook represents.
              Re-uploading the same period replaces only that period&apos;s
              data.
            </p>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Month
                </span>
                <select
                  value={pendingMonth}
                  onChange={(e) => setPendingMonth(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none"
                >
                  {monthNames.slice(1).map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Year
                </span>
                <select
                  value={pendingYear}
                  onChange={(e) => setPendingYear(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPickingPeriod(false)}
                className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPickingPeriod(false);
                  fileInputRef.current?.click();
                }}
                className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          Active Records
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {employeeCount}
        </p>
      </div>
    </div>
  );
}
