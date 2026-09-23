import Image from "next/image";
import React, { useEffect, useState } from "react";

function formatDisplayDate(value: string | Date | null | undefined): string {
  if (!value) return "-";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "-" : value.toLocaleDateString("en-GB");
  }

  const rawValue = value.trim();
  const parsedDate = new Date(rawValue);

  return Number.isNaN(parsedDate.getTime())
    ? rawValue
    : parsedDate.toLocaleDateString("en-GB");
}

export interface BannerTableRowProps {
  referenceId?: string | null;
  title: string;
  name: string;
  department?: string | null;
  createddate: string | Date | null | undefined;
  lastApprovalDate?: string | Date | null;
  status?: string;
  onClick?: () => void;
  profileImg?: string;
}

export default function BannerTableRow({
  referenceId,
  title,
  name,
  department,
  createddate,
  lastApprovalDate,
  status,
  onClick,
  profileImg,
}: BannerTableRowProps) {
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [formattedLastApprovalDate, setFormattedLastApprovalDate] = useState<string>("");

  useEffect(() => {
    setFormattedDate(formatDisplayDate(createddate));
  }, [createddate]);

  useEffect(() => {
    setFormattedLastApprovalDate(formatDisplayDate(lastApprovalDate));
  }, [lastApprovalDate]);

  const statusColor =
    status === "APPROVED"
      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
      : status === "REJECTED"
        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
        : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400";

  const openForm = () => {
    if (onClick) {
      onClick();
    }
  };

  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0]?.[0]?.toUpperCase() ?? "?");

  return (
    <tr
      onClick={openForm}
      className="cursor-pointer divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
    >
      <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {referenceId || "-"}
      </td>

      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {department || "-"}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-700 text-white font-semibold w-8 h-8 flex items-center justify-center rounded-full text-xs overflow-hidden flex-shrink-0">
            {profileImg ? (
              <Image
                src={profileImg}
                alt="Profile"
                width={32}
                height={32}
                sizes="32px"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <span className="font-medium text-indigo-700 dark:text-indigo-400 text-xs">{name}</span>
        </div>
      </td>

      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {formattedDate}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        {status && (
          <span
            className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}
          >
            {status.toLowerCase()}
          </span>
        )}
      </td>

      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {title}
      </td>

      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {formattedLastApprovalDate}
      </td>
    </tr>
  );
}
