import { Role } from "@/generated/enums";

// Pure role predicates, safe to import from client components. The server-side
// guards that use them live in admin-access.ts, which pulls in prisma and
// next-auth and must never reach the browser bundle.
//
// A user can hold more than one role (a primary organizational role plus any
// number of extra grants, e.g. HEAD_OF_SECTION + ADMIN), so every predicate
// here takes the caller's full role list rather than a single role.

// Roles allowed to reach the Admin dashboard and the endpoints behind it.
export const ADMIN_ROLES: Role[] = [
  Role.ADMIN,
  Role.FORM_ADMIN,
];

// Admins whose reach is limited to the form types assigned to them. Everyone
// else in ADMIN_ROLES administers the whole system.
export const SCOPED_ADMIN_ROLES: Role[] = [Role.FORM_ADMIN];

// Combines a user's primary role with any extra roles into one flat list,
// deduped. Used to build the list these predicates check against.
export function flattenRoles(
  role: string | null | undefined,
  extraRoles?: { role: string }[] | null,
): string[] {
  return Array.from(
    new Set(
      [role, ...(extraRoles ?? []).map((r) => r.role)].filter(
        (r): r is string => Boolean(r),
      ),
    ),
  );
}

// The only role that may reconfigure the system: form types, approval flows,
// and other people's accounts. Everything else in ADMIN_ROLES is read-only.
export function isFullAdminRole(roles: string[] | null | undefined): boolean {
  return !!roles && roles.includes(Role.ADMIN);
}

export function isAdminRole(roles: string[] | null | undefined): boolean {
  return !!roles && roles.some((r) => (ADMIN_ROLES as string[]).includes(r));
}

// A scoped (FORM_ADMIN) admin whose reach is limited to their assigned form
// types. A user who also holds full ADMIN is never scoped, even if a
// FORM_ADMIN grant is also present on their account.
export function isScopedAdminRole(roles: string[] | null | undefined): boolean {
  return (
    !!roles &&
    roles.includes(Role.FORM_ADMIN) &&
    !roles.includes(Role.ADMIN)
  );
}
