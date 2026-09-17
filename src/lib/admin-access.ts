import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/src/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  isAdminRole,
  isFullAdminRole,
  isScopedAdminRole,
} from "@/src/lib/admin-roles";

export {
  ADMIN_ROLES,
  SCOPED_ADMIN_ROLES,
  isAdminRole,
  isFullAdminRole,
  isScopedAdminRole,
} from "@/src/lib/admin-roles";

// The form types an admin may see, or null when they are unrestricted.
// A scoped admin with no assignment gets an empty array — which filters
// everything out, rather than accidentally showing them everything.
export async function getScopedFormTypeIds(
  roles: string[] | null | undefined,
  staffid: string | null | undefined,
): Promise<number[] | null> {
  if (!isScopedAdminRole(roles)) return null;
  if (!staffid) return [];

  const scopes = await prisma.formTypeAdmin.findMany({
    where: { user: { staffid } },
    select: { formTypeId: true },
  });

  return scopes.map((s) => s.formTypeId);
}

// Prisma `where` fragment for a submission query under the caller's scope.
export function scopedSubmissionWhere(formTypeIds: number[] | null) {
  return formTypeIds === null ? {} : { formTypeId: { in: formTypeIds } };
}

// Guard for admin-only route handlers. Returns a response to hand straight
// back when the caller may not proceed, or null when the request is allowed.
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminRole(session.user?.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// Guard for endpoints that reconfigure the system — form types, approval
// flows, other people's accounts. A scoped admin passes requireAdmin but must
// not reach these: hiding the tab is presentation, this is the actual control.
export async function requireFullAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFullAdminRole(session.user?.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// requireAdmin plus the caller's form-type scope, for handlers that return
// submission data. `formTypeIds` is null for an unrestricted admin.
export async function requireAdminScope(): Promise<
  { denied: NextResponse } | { denied: null; formTypeIds: number[] | null }
> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAdminRole(session.user?.roles)) {
    return {
      denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    denied: null,
    formTypeIds: await getScopedFormTypeIds(
      session.user?.roles,
      session.user?.staffid,
    ),
  };
}

// A scoped admin must not administer form types outside their assignment.
export async function isFormTypeInScope(
  formTypeIds: number[] | null,
  formTypeId: number,
): Promise<boolean> {
  return formTypeIds === null || formTypeIds.includes(formTypeId);
}
