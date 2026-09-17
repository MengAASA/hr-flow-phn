import { prisma } from "@/lib/prisma";
import { getScopedFormTypeIds } from "@/src/lib/admin-access";

// Admins designate compliance officers by creating this FormType in the
// existing Admin > Form Type tab, then manually assigning approver(s) to it
// in the Admin > Approval Flow tab (the same manual-approver mechanism used
// by other forms). Only those manually-assigned users may review reports -
// role/department-based resolution is intentionally not used here.
const SEXUAL_HARASSMENT_FORM_TYPE_NAME = "Sexual Harassment Report";

async function getComplianceOfficerUserIds(): Promise<number[]> {
  const formType = await prisma.formType.findUnique({
    where: { name: SEXUAL_HARASSMENT_FORM_TYPE_NAME },
    include: {
      flowSteps: {
        include: { approvalStepApprovers: true },
      },
    },
  });

  if (!formType) return [];

  const userIds = formType.flowSteps.flatMap((step) =>
    step.approvalStepApprovers.map((approver) => approver.userId),
  );

  return Array.from(new Set(userIds));
}

export async function isComplianceOfficer(
  staffid: string | null | undefined,
): Promise<boolean> {
  if (!staffid) return false;

  const userIds = await getComplianceOfficerUserIds();
  if (userIds.length === 0) return false;

  const user = await prisma.user.findUnique({ where: { staffid } });
  if (!user) return false;

  return userIds.includes(user.id);
}

/**
 * Whether someone may read harassment reports. Two routes in:
 *
 *  1. Designated compliance officer — a manual approver on the Sexual
 *     Harassment Report form type (see above).
 *  2. A FORM_ADMIN scoped to that same form type in Admin > User Listing.
 *
 * The second exists so the scope checkbox grants what it appears to grant.
 * Reports are not FormSubmission rows, so the ordinary submission filter can
 * never cover them — this is the explicit bridge instead.
 */
export async function canAccessHarassmentReports(
  staffid: string | null | undefined,
  roles: string[] | null | undefined,
): Promise<boolean> {
  if (!staffid) return false;

  if (await isComplianceOfficer(staffid)) return true;

  const scopedIds = await getScopedFormTypeIds(roles, staffid);
  if (scopedIds === null) return false;

  const formType = await prisma.formType.findUnique({
    where: { name: SEXUAL_HARASSMENT_FORM_TYPE_NAME },
    select: { id: true },
  });

  return !!formType && scopedIds.includes(formType.id);
}

export async function getComplianceOfficerEmails(): Promise<string[]> {
  const userIds = await getComplianceOfficerUserIds();
  if (userIds.length === 0) return [];

  const officers = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { email: true },
  });

  return officers.map((o) => o.email);
}
