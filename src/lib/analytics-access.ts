import { Role } from "@/generated/enums";

export const ANALYTICS_ROLES: Role[] = [
  Role.HEAD_OF_DEPARTMENT,
  Role.HEAD_OF_DIVISION,
  Role.TOP_MANAGEMENT,
  Role.ADMIN,
  Role.FORM_ADMIN,
];

export function canViewAnalytics(roles: string[] | null | undefined): boolean {
  return !!roles && roles.some((r) => (ANALYTICS_ROLES as string[]).includes(r));
}
