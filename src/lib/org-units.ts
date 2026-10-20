import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Shared plumbing for the division / department / section admin endpoints.

export type OrgUnitLevel = "division" | "department" | "section";

export interface OrgUnitUsage {
  children: number;
  users: number;
  approvalSteps: number;
  submissions: number;
}

// Submissions keep the unit id inside the formData JSON (written as a string by
// the forms, but older rows may hold a number), so there is no foreign key to
// count — match the JSON path directly.
function submissionsReferencing(level: OrgUnitLevel, id: number) {
  const path = `$.${level}`;
  return prisma.formSubmission.count({
    where: {
      OR: [
        { formData: { path, equals: String(id) } },
        { formData: { path, equals: id } },
      ],
    },
  });
}

// Everything that would be orphaned, or fail on a foreign key, if this unit
// were deleted. Deletion is only allowed when every count is zero.
export async function getOrgUnitUsage(
  level: OrgUnitLevel,
  id: number,
): Promise<OrgUnitUsage> {
  // User and ApprovalFlowStep share the same three foreign key names.
  const fk =
    level === "division"
      ? { divisionId: id }
      : level === "department"
        ? { departmentId: id }
        : { sectionId: id };

  const [children, users, approvalSteps, submissions] = await Promise.all([
    level === "division"
      ? prisma.department.count({ where: { divisionId: id } })
      : level === "department"
        ? prisma.section.count({ where: { departmentId: id } })
        : Promise.resolve(0),
    prisma.user.count({ where: fk }),
    prisma.approvalFlowStep.count({ where: fk }),
    submissionsReferencing(level, id),
  ]);

  return { children, users, approvalSteps, submissions };
}

export function isOrgUnitInUse(usage: OrgUnitUsage): boolean {
  return Object.values(usage).some((n) => n > 0);
}

// The 409 handed back when a delete is refused, listing what still uses the
// unit so the admin knows what to move first — or to deactivate instead.
export function orgUnitInUseResponse(
  level: OrgUnitLevel,
  usage: OrgUnitUsage,
): NextResponse {
  const childLabel = level === "division" ? "department" : "section";
  const parts = [
    usage.children && `${usage.children} ${childLabel}(s)`,
    usage.users && `${usage.users} user(s)`,
    usage.approvalSteps && `${usage.approvalSteps} approval flow step(s)`,
    usage.submissions && `${usage.submissions} form submission(s)`,
  ].filter(Boolean);

  return NextResponse.json(
    {
      error: `This ${level} is still used by ${parts.join(", ")}. Deactivate it instead, or move those records first.`,
      usage,
    },
    { status: 409 },
  );
}

// Trimmed, non-empty name from a request body, or null when it is missing.
export function parseUnitName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name ? name : null;
}

// Admin screens pass ?includeInactive=true to see the whole tree; every
// dropdown elsewhere only gets the units still in use. A form showing a
// record's saved unit passes ?includeId=<id> so that unit stays listed (and
// shows its name) even after it was deactivated — the caller's other filters,
// e.g. the parent id, still apply to it.
export function activeFilter(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("includeInactive") === "true") return {};

  const includeId = Number(searchParams.get("includeId"));
  return includeId
    ? { OR: [{ isActive: true }, { id: includeId }] }
    : { isActive: true };
}
