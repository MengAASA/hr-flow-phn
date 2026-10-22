"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  DataSourceCard,
  TrendPoint,
  abbreviateDepartment,
  abbreviateDivision,
  abbreviatePlant,
  categoryOptions,
  chartBarColors,
  currentDate,
  formatCount,
  matchesCategory,
  monthNames,
  preferredPlantOrder,
  useManpowerEmployees,
} from "./manpowerShared";

function HeadcountBarChart({
  data,
  title,
  description,
  gridColor,
}: {
  data: TrendPoint[];
  title: string;
  description: string;
  gridColor: string;
}) {
  const topDivision = data[0];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm font-poppins min-w-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
        <span>Count</span>
        <span>Division</span>
      </div>

      <ChartContainer className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: 0, bottom: 18 }}
            barCategoryGap={12}
          >
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              angle={-20}
              interval={0}
              textAnchor="end"
              height={52}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullLabel ??
                payload?.[0]?.payload?.label ??
                ""
              }
              formatter={(value) => [`${value ?? 0}`, "Count"]}
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
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.label}-${index}`}
                  fill={chartBarColors[index % chartBarColors.length]}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value) => formatCount(Number(value ?? 0))}
                style={{ fontSize: 11, fill: "#374151" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {topDivision && (
        <p className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-400">
          Top division: {topDivision.fullLabel ?? topDivision.label}
        </p>
      )}
    </div>
  );
}

function EmploymentTypeDonutChart({
  permanentCount,
  contractCount,
}: {
  permanentCount: number;
  contractCount: number;
}) {
  const totalEmploymentCount = permanentCount + contractCount;
  const formatPercentage = (value: number) =>
    totalEmploymentCount === 0
      ? "0.0%"
      : `${((value / totalEmploymentCount) * 100).toFixed(1)}%`;

  const data = [
    { name: "Permanent", value: permanentCount, color: "#0d9488" },
    { name: "Contract", value: contractCount, color: "#c026d3" },
  ];

  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Employment Type
      </p>
      <ChartContainer className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              paddingAngle={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const numericValue = Number(value ?? 0);
                return [
                  `${formatCount(numericValue)} (${formatPercentage(numericValue)})`,
                  "Count",
                ];
              }}
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
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span className="h-3 w-3 rounded-full bg-teal-600" />
          <span>
            Permanent: {formatCount(permanentCount)} (
            {formatPercentage(permanentCount)})
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span className="h-3 w-3 rounded-full bg-fuchsia-600" />
          <span>
            Contract: {formatCount(contractCount)} (
            {formatPercentage(contractCount)})
          </span>
        </div>
      </div>
    </article>
  );
}

function PermanentContractByPlantChart({
  data,
}: {
  data: {
    plant: string;
    permanent: number;
    contract: number;
    male: number;
    female: number;
  }[];
}) {
  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Permanent vs Contract by Plant
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Bars: Permanent vs Contract · Lines: Male vs Female
      </p>

      <ChartContainer className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 18 }}
          >
            <CartesianGrid
              stroke="#e5e7eb"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="plant"
              angle={-20}
              interval={0}
              textAnchor="end"
              height={52}
              tickFormatter={(value: string) => abbreviatePlant(value)}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value: number) => formatCount(value)}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <Tooltip
              labelFormatter={(label) => label}
              formatter={(value, name) => [
                formatCount(Number(value ?? 0)),
                name,
              ]}
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
            <Bar
              dataKey="permanent"
              name="Permanent"
              stackId="status"
              fill="#4338ca"
              isAnimationActive={false}
            >
              <LabelList
                dataKey="permanent"
                position="center"
                formatter={(value) => (Number(value ?? 0) ? formatCount(Number(value)) : "")}
                style={{ fontSize: 10, fontWeight: 600, fill: "#ffffff" }}
              />
            </Bar>
            <Bar
              dataKey="contract"
              name="Contract"
              stackId="status"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="contract"
                position="center"
                formatter={(value) => (Number(value ?? 0) ? formatCount(Number(value)) : "")}
                style={{ fontSize: 10, fontWeight: 600, fill: "#ffffff" }}
              />
            </Bar>
            <Line
              type="monotone"
              dataKey="male"
              name="Male"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3, fill: "#0ea5e9", stroke: "#ffffff", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="female"
              name="Female"
              stroke="#ec4899"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ec4899", stroke: "#ffffff", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span className="h-3 w-3 rounded-full bg-indigo-700" />
          <span>Permanent</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          <span>Contract</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span className="h-3 w-3 rounded-full bg-sky-500" />
          <span>Male</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span className="h-3 w-3 rounded-full bg-pink-500" />
          <span>Female</span>
        </div>
      </div>
    </article>
  );
}

const divisionChartColors = [
  "#4338ca",
  "#0f766e",
  "#b45309",
  "#be185d",
  "#0ea5e9",
  "#7c3aed",
  "#16a34a",
  "#dc2626",
  "#ca8a04",
  "#0891b2",
];

function ManpowerByDivisionChart({
  data,
}: {
  data: { division: string; label: string; value: number }[];
}) {
  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Manpower by Division
      </p>
      <ChartContainer className="mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke="#e5e7eb"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              interval={0}
              height={30}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value: number) => formatCount(value)}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.division ?? ""
              }
              formatter={(value) => [formatCount(Number(value ?? 0)), "Count"]}
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
            <Bar
              dataKey="value"
              name="Count"
              background={{ fill: "#f3f4f6" }}
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.division}
                  fill={divisionChartColors[index % divisionChartColors.length]}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value) => formatCount(Number(value ?? 0))}
                style={{ fontSize: 11, fill: "#374151" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </article>
  );
}

function ManpowerByDepartmentChart({
  data,
}: {
  data: { department: string; label: string; value: number }[];
}) {
  const chartHeight = Math.max(data.length * 28, 160);

  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Manpower by Department
      </p>
      <div className="mt-4 h-[500px] w-full overflow-y-auto">
        <ChartContainer className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              barCategoryGap="30%"
              barSize={12}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                stroke="#e5e7eb"
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tickFormatter={(value: number) => formatCount(value)}
                tick={{ fill: "#6b7280", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={180}
                tick={{ fill: "#6b7280", fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.department ?? ""
                }
                formatter={(value) => [
                  formatCount(Number(value ?? 0)),
                  "Count",
                ]}
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
              <Bar
                dataKey="value"
                name="Count"
                background={{ fill: "#f3f4f6" }}
                radius={[0, 6, 6, 0]}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.department}
                    fill={
                      divisionChartColors[index % divisionChartColors.length]
                    }
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value) => formatCount(Number(value ?? 0))}
                  style={{ fontSize: 11, fill: "#374151" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </article>
  );
}

function LocalForeignChart({
  localCount,
  foreignCount,
}: {
  localCount: number;
  foreignCount: number;
}) {
  const total = localCount + foreignCount;
  const getPercentage = (value: number) =>
    total === 0 ? 0 : (value / total) * 100;
  const formatPercentage = (value: number) => `${getPercentage(value).toFixed(1)}%`;

  return (
    <div className="">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Local vs Foreign
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              Local
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-emerald-900 dark:text-emerald-300">
            {localCount}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {formatPercentage(localCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/60">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${getPercentage(localCount)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-orange-100 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-400">
              Foreign
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-orange-900 dark:text-orange-300">
            {foreignCount}
          </p>
          <p className="mt-1 text-xs font-medium text-orange-700 dark:text-orange-400">
            {formatPercentage(foreignCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-orange-100 dark:bg-orange-900/60">
            <div
              className="h-full rounded-full bg-orange-600"
              style={{ width: `${getPercentage(foreignCount)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutiveMixCard({
  executiveCount,
  nonExecutiveCount,
}: {
  executiveCount: number;
  nonExecutiveCount: number;
}) {
  const total = executiveCount + nonExecutiveCount;
  const getPercentage = (value: number) =>
    total === 0 ? 0 : (value / total) * 100;
  const formatPercentage = (value: number) => `${getPercentage(value).toFixed(1)}%`;

  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Executive vs Non Executive
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-400">
            Executive
          </p>
          <p className="mt-2 text-xl font-semibold text-sky-900 dark:text-sky-300">
            {formatCount(executiveCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-sky-700 dark:text-sky-400">
            {formatPercentage(executiveCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-sky-900/60">
            <div
              className="h-full rounded-full bg-sky-600"
              style={{ width: `${getPercentage(executiveCount)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-400">
            Non Executive
          </p>
          <p className="mt-2 text-xl font-semibold text-violet-900 dark:text-violet-300">
            {formatCount(nonExecutiveCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-400">
            {formatPercentage(nonExecutiveCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/60">
            <div
              className="h-full rounded-full bg-violet-600"
              style={{ width: `${getPercentage(nonExecutiveCount)}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function LabourMixCard({
  directCount,
  indirectCount,
  adminCount,
}: {
  directCount: number;
  indirectCount: number;
  adminCount: number;
}) {
  const total = directCount + indirectCount + adminCount;
  const getPercentage = (value: number) =>
    total === 0 ? 0 : (value / total) * 100;
  const formatPercentage = (value: number) =>
    `${getPercentage(value).toFixed(1)}%`;

  const chartData = [
    {
      label: "Total Direct",
      percentage: getPercentage(directCount),
      color: "#059669",
    },
    {
      label: "Total Indirect",
      percentage: getPercentage(indirectCount),
      color: "#d97706",
    },
    {
      label: "General Admin",
      percentage: getPercentage(adminCount),
      color: "#e11d48",
    },
  ];

  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Total Direct vs Total Indirect vs General Admin
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            Total Direct
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-900 dark:text-emerald-300">
            {formatCount(directCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {formatPercentage(directCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/60">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${getPercentage(directCount)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Total Indirect
          </p>
          <p className="mt-2 text-xl font-semibold text-amber-900 dark:text-amber-300">
            {formatCount(indirectCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            {formatPercentage(indirectCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/60">
            <div
              className="h-full rounded-full bg-amber-600"
              style={{ width: `${getPercentage(indirectCount)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">
            General Admin
          </p>
          <p className="mt-2 text-xl font-semibold text-rose-900 dark:text-rose-300">
            {formatCount(adminCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
            {formatPercentage(adminCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-rose-100 dark:bg-rose-900/60">
            <div
              className="h-full rounded-full bg-rose-600"
              style={{ width: `${getPercentage(adminCount)}%` }}
            />
          </div>
        </div>
      </div>

      <ChartContainer className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              stroke="#e5e7eb"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: "#6b7280", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [
                `${Number(value ?? 0).toFixed(1)}%`,
                "Share",
              ]}
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
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
              <LabelList
                dataKey="percentage"
                position="top"
                formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
                style={{ fontSize: 11, fill: "#374151" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </article>
  );
}

function GenderMixCard({
  maleCount,
  femaleCount,
}: {
  maleCount: number;
  femaleCount: number;
}) {
  const total = maleCount + femaleCount;
  const getPercentage = (value: number) =>
    total === 0 ? 0 : (value / total) * 100;
  const formatPercentage = (value: number) => `${getPercentage(value).toFixed(1)}%`;

  return (
    <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Male vs Female
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">
            Male
          </p>
          <p className="mt-2 text-xl font-semibold text-indigo-900 dark:text-indigo-300">
            {formatCount(maleCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
            {formatPercentage(maleCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${getPercentage(maleCount)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-pink-50 dark:bg-pink-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-700 dark:text-pink-400">
            Female
          </p>
          <p className="mt-2 text-xl font-semibold text-pink-900 dark:text-pink-300">
            {formatCount(femaleCount)}
          </p>
          <p className="mt-1 text-xs font-medium text-pink-700 dark:text-pink-400">
            {formatPercentage(femaleCount)}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-pink-100 dark:bg-pink-900/60">
            <div
              className="h-full rounded-full bg-pink-600"
              style={{ width: `${getPercentage(femaleCount)}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ManpowerBreakdownComponent() {
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
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
    duplicateWarning,
    confirmDuplicateUpload,
    cancelDuplicateUpload,
  } = useManpowerEmployees(() => {
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

  const yearOptions = Array.from(
    new Set([
      currentDate.getFullYear(),
      ...employees
        .map((employee) => employee.snapshotYear)
        .filter((year): year is number => typeof year === "number"),
    ]),
  ).sort((a, b) => b - a);

  const periodMatchedEmployees = employees.filter(
    (employee) =>
      employee.snapshotYear === selectedYear &&
      employee.snapshotMonth === selectedMonth,
  );

  const filteredEmployees = periodMatchedEmployees.filter((employee) => {
    if (selectedPlant !== "All Plants" && employee.plant !== selectedPlant) {
      return false;
    }

    if (
      selectedDepartment !== "All Departments" &&
      employee.department !== selectedDepartment
    ) {
      return false;
    }

    if (
      selectedDivision !== "All Divisions" &&
      employee.division !== selectedDivision
    ) {
      return false;
    }

    return matchesCategory(employee, selectedCategory);
  });

  // Legacy records without a snapshot period have no reference date to test
  // "active" against anymore, so they're simply treated as active as-is.
  const activeEmployees = filteredEmployees;

  const totalManpower = filteredEmployees.length;
  const totalDirectCount = activeEmployees.filter(
    (employee) => employee.labourCategory === "DIRECT LABOUR",
  ).length;
  const totalIndirectCount = activeEmployees.filter(
    (employee) => employee.labourCategory === "MFG OVERHEAD",
  ).length;
  const totalAdminCount = activeEmployees.filter(
    (employee) => employee.labourCategory === "GENERAL ADMIN",
  ).length;
  const executiveCount = activeEmployees.filter(
    (employee) => employee.employeeType === "EXECUTIVE",
  ).length;
  const nonExecutiveCount = activeEmployees.filter(
    (employee) => employee.employeeType === "NON EXECUTIVE",
  ).length;
  const localCount = activeEmployees.filter(
    (employee) => employee.citizenship === "LOCAL",
  ).length;
  const foreignCount = activeEmployees.filter(
    (employee) => employee.citizenship === "FOREIGN",
  ).length;

  const permanentCount = activeEmployees.filter(
    (employee) => employee.employeeStatus === "PERMANENT",
  ).length;

  const contractCount = activeEmployees.filter(
    (employee) => employee.employeeStatus === "CONTRACT",
  ).length;

  const maleCount = activeEmployees.filter(
    (employee) => employee.gender === "M",
  ).length;

  const femaleCount = activeEmployees.filter(
    (employee) => employee.gender === "F",
  ).length;

  const buildPlantDivisionData = (plantName: string) =>
    Array.from(
      employees
        .filter((employee) => employee.plant === plantName)
        .filter(
          (employee) =>
            employee.snapshotYear === selectedYear &&
            employee.snapshotMonth === selectedMonth,
        )
        .filter((employee) =>
          selectedDepartment === "All Departments"
            ? true
            : employee.department === selectedDepartment,
        )
        .filter((employee) =>
          selectedDivision === "All Divisions"
            ? true
            : employee.division === selectedDivision,
        )
        .filter((employee) => matchesCategory(employee, selectedCategory))
        .reduce((map, employee) => {
          const currentCount = map.get(employee.division) ?? 0;
          map.set(employee.division, currentCount + 1);
          return map;
        }, new Map<string, number>()),
    )
      .map(([division, value]) => ({
        division,
        value,
      }))
      .sort((a, b) => b.value - a.value || a.division.localeCompare(b.division))
      .slice(0, 4)
      .map(({ division, value }) => ({
        label: abbreviateDivision(division),
        fullLabel: division,
        value,
      }))
      .sort((a, b) => b.value - a.value);

  const availableChartPlants = Array.from(
    new Set(
      activeEmployees
        .map((employee) => employee.plant)
        .filter((plant) =>
          selectedPlant === "All Plants" ? true : plant === selectedPlant,
        ),
    ),
  );

  const chartPlants = [
    ...preferredPlantOrder.filter((plant) =>
      availableChartPlants.includes(plant),
    ),
    ...availableChartPlants
      .filter((plant) => !preferredPlantOrder.includes(plant))
      .sort(),
  ];

  const permanentContractByPlant = chartPlants.map((plant) => {
    const plantEmployees = activeEmployees.filter(
      (employee) => employee.plant === plant,
    );

    return {
      plant,
      permanent: plantEmployees.filter(
        (employee) => employee.employeeStatus === "PERMANENT",
      ).length,
      contract: plantEmployees.filter(
        (employee) => employee.employeeStatus === "CONTRACT",
      ).length,
      male: plantEmployees.filter((employee) => employee.gender === "M").length,
      female: plantEmployees.filter((employee) => employee.gender === "F")
        .length,
    };
  });

  const manpowerByDivision = Array.from(
    activeEmployees.reduce((map, employee) => {
      const currentCount = map.get(employee.division) ?? 0;
      map.set(employee.division, currentCount + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([division, value]) => ({
      division,
      label: abbreviateDivision(division),
      value,
    }))
    .sort((a, b) => b.value - a.value || a.division.localeCompare(b.division));

  const manpowerByDepartment = Array.from(
    activeEmployees.reduce((map, employee) => {
      const currentCount = map.get(employee.department) ?? 0;
      map.set(employee.department, currentCount + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([department, value]) => ({
      department,
      label: abbreviateDepartment(department),
      value,
    }))
    .sort(
      (a, b) => b.value - a.value || a.department.localeCompare(b.department),
    );

  return (
    <section className="space-y-6 font-poppins">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-800 via-indigo-700 to-sky-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-100">
              Workforce Planning
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Manpower Breakdown
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Composition of the workforce for the selected period, broken
              down by plant, department, division, and category.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                Month
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-white/20 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 outline-none transition focus:border-indigo-300"
              >
                {monthNames.slice(1).map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                Year
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
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
        duplicateWarning={duplicateWarning}
        onConfirmDuplicates={confirmDuplicateUpload}
        onCancelDuplicates={cancelDuplicateUpload}
      />

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filters
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Refine the manpower dashboard by plant, department, division, and
            category.
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0 xl:col-start-1 xl:row-start-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Manpower
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {totalManpower}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Total loaded manpower records for the applied filters.
          </p>
        </article>
        <div className="h-full xl:col-start-1 xl:row-start-2">
          <ExecutiveMixCard
            executiveCount={executiveCount}
            nonExecutiveCount={nonExecutiveCount}
          />
        </div>
        <div className="h-full sm:col-span-2 xl:col-start-2 xl:col-span-2 xl:row-start-1 xl:row-span-2">
          <LabourMixCard
            directCount={totalDirectCount}
            indirectCount={totalIndirectCount}
            adminCount={totalAdminCount}
          />
        </div>
        <article className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm min-w-0 xl:col-start-4 xl:row-start-1">
          <LocalForeignChart
            localCount={localCount}
            foreignCount={foreignCount}
          />
        </article>
        <div className="h-full xl:col-start-4 xl:row-start-2">
          <GenderMixCard maleCount={maleCount} femaleCount={femaleCount} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EmploymentTypeDonutChart
          permanentCount={permanentCount}
          contractCount={contractCount}
        />
        <div className="sm:col-span-2 xl:col-span-3">
          <PermanentContractByPlantChart data={permanentContractByPlant} />
        </div>
      </div>

      <div className="grid gap-4">
        <ManpowerByDivisionChart data={manpowerByDivision} />
      </div>

      <div className="grid gap-4">
        <ManpowerByDepartmentChart data={manpowerByDepartment} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {chartPlants.map((plantName, index) => {
          const data = buildPlantDivisionData(plantName);
          const gridColors = ["#ccfbf1", "#e0e7ff", "#fef3c7", "#ede9fe"];

          if (data.length === 0) {
            return null;
          }

          return (
            <HeadcountBarChart
              key={plantName}
              data={data}
              title={plantName}
              description=""
              gridColor={gridColors[index % gridColors.length]}
            />
          );
        })}
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No Data Loaded
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Upload an Excel workbook to populate the manpower dashboard.
          </p>
        </div>
      ) : (
        periodMatchedEmployees.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              No Data For {monthNames[selectedMonth]} {selectedYear}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Pick a different month/year above, or upload a workbook for
              this period.
            </p>
          </div>
        )
      )}
    </section>
  );
}
