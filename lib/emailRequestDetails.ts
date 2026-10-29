import { manpowerReasonOptions } from "./data";

export type RequestDetailRow = { label: string; value: string };

const MANPOWER_REQUISITION_FORM_NAME = "Man Power Requisition";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// "2026-12-18" → "18 Dec 2026". Stored as a date-only string, so format in
// UTC to avoid the server's timezone shifting the day.
function formatDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

function manpowerRows(data: Record<string, unknown>): RequestDetailRow[] {
  if (data.selectedOption === "replacement") {
    const incumbent = text(data.incumbentName);
    const lastDay = formatDate(data.lastWorkingDay);
    const rows: RequestDetailRow[] = [
      { label: "Reason of Requisition", value: "Replacement" },
    ];
    if (incumbent || lastDay) {
      rows.push({
        label: "Replacing",
        value: [incumbent, lastDay && `last working day ${lastDay}`]
          .filter(Boolean)
          .join(", "),
      });
    }
    return rows;
  }

  if (data.selectedOption === "additional") {
    const selected = Array.isArray(data.selectedReasons) ? data.selectedReasons : [];
    return [
      { label: "Reason of Requisition", value: "Additional" },
      ...manpowerReasonOptions
        .filter((o) => selected.includes(o.key))
        .map((o) => ({ label: o.label, value: text(data[o.key]) || "-" })),
    ];
  }

  return [];
}

/**
 * Form-specific rows appended to the "Request Details" table of notification
 * emails, so approvers see the key facts without opening the request.
 * Empty for form types that have none.
 */
export function getRequestDetailRows(
  formTypeName: string,
  formData: unknown,
): RequestDetailRow[] {
  const data =
    typeof formData === "string" ? JSON.parse(formData) : (formData ?? {});
  if (typeof data !== "object") return [];

  if (formTypeName === MANPOWER_REQUISITION_FORM_NAME) {
    return manpowerRows(data as Record<string, unknown>);
  }
  return [];
}
