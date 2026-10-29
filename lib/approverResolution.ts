import { Prisma, RequesterDivisionMode, Role, User } from "@/generated/client";
import { prisma } from "./prisma";

export type StepScope = {
  divisionId: number | null;
  departmentId: number | null;
  sectionId: number | null;
};

export type RequesterCondition = {
  requesterDivisionMode: RequesterDivisionMode;
  requesterDivisions: { divisionId: number }[];
};

/**
 * Whether a step is part of the chain for this requester, based on the
 * step's requester-division condition (ALL / ONLY listed / EXCEPT listed).
 * A requester with no division never matches a listed division.
 */
export function stepAppliesToRequester(
  step: RequesterCondition,
  requesterDivisionId: number | null,
): boolean {
  if (step.requesterDivisionMode === "ALL") return true;

  const listed = step.requesterDivisions.some(
    (d) => requesterDivisionId !== null && d.divisionId === requesterDivisionId,
  );
  return step.requesterDivisionMode === "ONLY" ? listed : !listed;
}

/**
 * Validates the requester-division condition sent by the approval flow admin
 * form. ONLY/EXCEPT need at least one division; ALL stores none.
 */
export function parseRequesterCondition(
  mode: unknown,
  divisionIds: unknown,
): { mode: RequesterDivisionMode; divisionIds: number[] } | { error: string } {
  const parsedMode: RequesterDivisionMode =
    mode === "ONLY" || mode === "EXCEPT" ? mode : "ALL";
  if (parsedMode === "ALL") return { mode: "ALL", divisionIds: [] };

  const ids = Array.isArray(divisionIds)
    ? [...new Set(divisionIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];
  if (ids.length === 0) {
    return { error: "Select at least one requester division for this condition." };
  }
  return { mode: parsedMode, divisionIds: ids };
}

export type FallbackConfig = {
  fallbackRole: Role | null;
  combineWithFallback: boolean;
};

/**
 * Builds the User where-clause for a role-based approval step: honors the
 * step's explicit division/department/section scope, and only falls back to
 * the submitter's own org unit when the step has no explicit scope at all.
 */
export function buildRoleWhere(
  role: Role,
  step: StepScope,
  currentUser: User,
  excludeApproverIds: number[],
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    role,
    id: { notIn: excludeApproverIds },
  };

  if (step.divisionId !== null) where.divisionId = Number(step.divisionId);
  if (step.departmentId !== null) where.departmentId = Number(step.departmentId);
  if (step.sectionId !== null) where.sectionId = Number(step.sectionId);

  if (
    step.divisionId === null &&
    step.departmentId === null &&
    step.sectionId === null
  ) {
    if (role === "HEAD_OF_DEPARTMENT") where.departmentId = currentUser.departmentId;
    else if (role === "HEAD_OF_DIVISION") where.divisionId = currentUser.divisionId;
    else if (role === "HEAD_OF_SECTION") where.sectionId = currentUser.sectionId;
  }

  return where;
}

/**
 * Resolves the FORM_FIELD approver source: the requester names an approver
 * via a field on their own submission (e.g. "Immediate Superior"), and that
 * user becomes the step's sole approver.
 *
 * The requester picks this person themselves, so the only integrity check
 * available is role-based: whoever they name must actually hold supervisory
 * authority (i.e. not a plain STAFF peer), otherwise a requester could name
 * any colleague and have them rubber-stamp the request.
 */
export async function resolveFormFieldApprover(
  submittedData: Record<string, unknown>,
  step: { order: number; formFieldKey: string | null },
  currentUser: User,
): Promise<{ approver: User } | { error: string }> {
  const fieldValue = step.formFieldKey ? submittedData[step.formFieldKey] : undefined;
  const staffId = typeof fieldValue === "string" ? fieldValue : undefined;
  const resolved = staffId
    ? await prisma.user.findUnique({ where: { staffid: staffId } })
    : null;

  if (!resolved || resolved.id === currentUser.id) {
    return {
      error: `No valid approver found for step ${step.order} (field "${step.formFieldKey}")`,
    };
  }

  if (resolved.role === "STAFF") {
    return {
      error: `The selected approver for step ${step.order} (field "${step.formFieldKey}") must hold a supervisory role.`,
    };
  }

  return { approver: resolved };
}

/**
 * Applies the admin-configured fallback role on top of an already-resolved
 * base approver list: in "combine" mode both pools are simultaneously
 * eligible; in "fallback only" mode the fallback pool is used only when the
 * base pool came back empty.
 */
export async function applyFallbackRole(
  approvers: User[],
  step: StepScope & FallbackConfig,
  currentUser: User,
  excludeApproverIds: number[],
): Promise<User[]> {
  if (!step.fallbackRole) return approvers;

  const fallbackWhere = buildRoleWhere(
    step.fallbackRole,
    step,
    currentUser,
    excludeApproverIds,
  );

  if (step.combineWithFallback) {
    const fallbackApprovers = await prisma.user.findMany({ where: fallbackWhere });
    const existingIds = new Set(approvers.map((a) => a.id));
    return [...approvers, ...fallbackApprovers.filter((a) => !existingIds.has(a.id))];
  }

  if (approvers.length === 0) {
    return prisma.user.findMany({ where: fallbackWhere });
  }

  return approvers;
}
