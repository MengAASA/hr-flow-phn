"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  DataSourceCard,
  categoryOptions,
  currentDate,
  formatCount,
  matchesPlantDepartmentDivisionCategory,
  monthShortNames,
  useManpowerEmployees,
} from "./manpowerShared";

type PeriodPoint = {
  key: string;
  label: string;
  year: number;
  month: number;
  total: number;
  permanent: number;
  contract: number;
  local: number;
  foreign: number;
  male: number;
  female: number;
};

function TrendLineChart({
  title,
  description,
  data,
  series,
}: {
  title: string;
  description?: string;
  data: PeriodPoint[];
  series: { key: keyof PeriodPoint; name: string; color: string }[];
}) {
  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {description}
        </p>
      )}
      <ChartContainer className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid
              stroke="#e5e7eb"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              interval={0}
              angle={-20}
              textAnchor="end"
              height={52}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value: number) => formatCount(value)}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [formatCount(Number(value ?? 0)), name]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                padding: "8px 10px",
                fontSize: "12px",
              }}
              itemStyle={{ fontSize: "12px" }}
              labelStyle={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#111827",
              }}
              wrapperStyle={{ outline: "none" }}
            />
            {series.map((s) => (
              <Line
                key={String(s.key)}
                type="monotone"
                dataKey={s.key as string}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3, fill: s.color, stroke: "#ffffff", strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
        {series.map((s) => (
          <div
            key={String(s.key)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.name}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ChangeCard({
  label,
  value,
  suffix,
  fromLabel,
  toLabel,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  fromLabel?: string;
  toLabel?: string;
}) {
  const isPositive = (value ?? 0) > 0;
  const isNegative = (value ?? 0) < 0;

  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <h2
        className={`mt-3 text-3xl font-semibold ${
          value === null
            ? "text-gray-400 dark:text-gray-500"
            : isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : isNegative
                ? "text-rose-600 dark:text-rose-400"
                : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value === null
          ? "—"
          : `${isPositive ? "+" : ""}${formatCount(value)}${suffix ?? ""}`}
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {fromLabel && toLabel
          ? `${fromLabel} → ${toLabel}`
          : "Not enough periods loaded yet."}
      </p>
    </article>
  );
}

export default function ManpowerTrendComponent() {
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getFullYear().toString(),
  );
  const [selectedPlant, setSelectedPlant] = useState("All Plants");
  const [selectedDepartment, setSelectedDepartment] = useState(
    "All Departments",
  );
  const [selectedDivision, setSelectedDivision] = useState("All Divisions");
  const [selectedCategory, setSelectedCategory] = useState(categoryOptions[0]);

  const {
    fileInputRef,
    employees,
    uploadMessage,
    isUploading,
    isLoadingSavedData,
    handleFileUpload,
  } = useManpowerEmployees(() => {
    setSelectedYear(currentDate.getFullYear().toString());
    setSelectedPlant("All Plants");
    setSelectedDepartment("All Departments");
    setSelectedDivision("All Divisions");
    setSelectedCategory("All Categories");
  });

  const plantOptions = [
    "All Plants",
    ...Array.from(new Set(employees.map((employee) => employee.plant))).sort(),
  ];

  const departmentOptions = [
    "All Departments",
    ...Array.from(
      new Set(employees.map((employee) => employee.department)),
    ).sort(),
  ];

  const divisionOptions = [
    "All Divisions",
    ...Array.from(
      new Set(employees.map((employee) => employee.division)),
    ).sort(),
  ];

  const periodEmployees = employees.filter(
    (employee) => employee.snapshotMonth && employee.snapshotYear,
  );

  const yearOptions = [
    "All Years",
    ...Array.from(
      new Set([
        currentDate.getFullYear(),
        ...periodEmployees.map((employee) => employee.snapshotYear as number),
      ]),
    )
      .sort((a, b) => b - a)
      .map((year) => year.toString()),
  ];

  const filters = {
    plant: selectedPlant,
    department: selectedDepartment,
    division: selectedDivision,
    category: selectedCategory,
  };

  const filteredPeriodEmployees = periodEmployees.filter(
    (employee) =>
      (selectedYear === "All Years" ||
        employee.snapshotYear === Number(selectedYear)) &&
      matchesPlantDepartmentDivisionCategory(employee, filters),
  );

  const periodMap = new Map<string, PeriodPoint>();

  filteredPeriodEmployees.forEach((employee) => {
    const year = employee.snapshotYear as number;
    const month = employee.snapshotMonth as number;
    const key = `${year}-${month}`;

    if (!periodMap.has(key)) {
      periodMap.set(key, {
        key,
        label: `${monthShortNames[month]} ${year}`,
        year,
        month,
        total: 0,
        permanent: 0,
        contract: 0,
        local: 0,
        foreign: 0,
        male: 0,
        female: 0,
      });
    }

    const point = periodMap.get(key)!;
    point.total += 1;

    if (employee.employeeStatus === "PERMANENT") point.permanent += 1;
    if (employee.employeeStatus === "CONTRACT") point.contract += 1;
    if (employee.citizenship === "MALAYSIAN") point.local += 1;
    if (employee.citizenship !== "" && employee.citizenship !== "MALAYSIAN")
      point.foreign += 1;
    if (employee.gender === "M") point.male += 1;
    if (employee.gender === "F") point.female += 1;
  });

  const periods = Array.from(periodMap.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );

  const hasTrendData = periods.length > 0;
  const latestPeriod = periods[periods.length - 1];
  const previousPeriod = periods.length > 1 ? periods[periods.length - 2] : null;

  const changeFromPrevious =
    previousPeriod && latestPeriod
      ? latestPeriod.total - previousPeriod.total
      : null;
  const peakPeriod = periods.reduce<PeriodPoint | null>(
    (peak, period) => (!peak || period.total > peak.total ? period : peak),
    null,
  );

  return (
    <section className="space-y-6 font-poppins">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-800 via-indigo-700 to-sky-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-100">
              Workforce Planning
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Manpower Trend</h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Headcount movement across every uploaded monthly snapshot, so
              you can see growth or attrition over time instead of a single
              point in time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            <label className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                Year
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 outline-none transition focus:border-indigo-300"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <DataSourceCard
        uploadMessage={uploadMessage}
        isUploading={isUploading}
        isLoadingSavedData={isLoadingSavedData}
        employeeCount={employees.length}
        fileInputRef={fileInputRef}
        onFileChange={handleFileUpload}
      />

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filters
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scope the trend to a plant, department, division, or category.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Plant
            </span>
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 outline-none transition focus:border-indigo-300"
            >
              {plantOptions.map((plant) => (
                <option key={plant} value={plant}>
                  {plant}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Department
            </span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 outline-none transition focus:border-indigo-300"
            >
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Division
            </span>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 outline-none transition focus:border-indigo-300"
            >
              {divisionOptions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Category
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 outline-none transition focus:border-indigo-300"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasTrendData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Latest Headcount
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {formatCount(latestPeriod.total)}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                As of {latestPeriod.label}
              </p>
            </article>
            <ChangeCard
              label="Change vs Previous Month"
              value={changeFromPrevious}
              fromLabel={previousPeriod?.label}
              toLabel={latestPeriod.label}
            />
            <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Peak Headcount
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {formatCount(peakPeriod!.total)}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Reached in {peakPeriod!.label}
              </p>
            </article>
          </div>

          <div className="grid gap-4">
            <TrendLineChart
              title="Total Headcount Trend"
              description="Total employee count for each uploaded monthly snapshot."
              data={periods}
              series={[{ key: "total", name: "Total Headcount", color: "#4338ca" }]}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TrendLineChart
              title="Permanent vs Contract Trend"
              data={periods}
              series={[
                { key: "permanent", name: "Permanent", color: "#4338ca" },
                { key: "contract", name: "Contract", color: "#f59e0b" },
              ]}
            />
            <TrendLineChart
              title="Local vs Foreign Trend"
              data={periods}
              series={[
                { key: "local", name: "Local", color: "#059669" },
                { key: "foreign", name: "Foreign", color: "#ea580c" },
              ]}
            />
          </div>

          <div className="grid gap-4">
            <TrendLineChart
              title="Male vs Female Trend"
              data={periods}
              series={[
                { key: "male", name: "Male", color: "#0ea5e9" },
                { key: "female", name: "Female", color: "#ec4899" },
              ]}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No Trend Data Yet
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Trend charts need multiple monthly snapshots. Upload a workbook
            with month-named sheets (e.g. &quot;Jan 2024&quot;, &quot;Feb
            2024&quot;) to see headcount movement over time.
          </p>
        </div>
      )}
    </section>
  );
}
