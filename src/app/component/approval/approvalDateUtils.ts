interface ApprovalStepLike {
  status: string;
  approvedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

const RESOLVED_STATUSES = ["APPROVED", "REJECTED", "ESCALATED"];

// Best-available date for when this specific approval step was resolved.
// Manual approve/reject sets approvedAt, but the overdue-escalation cron
// only flips status — it never sets approvedAt — so fall back to updatedAt
// (Prisma's @updatedAt still gets bumped by that update) for ESCALATED steps.
export function getApprovalActionDate(
  approval: ApprovalStepLike,
): string | Date | null {
  if (approval.approvedAt) return approval.approvedAt;
  if (RESOLVED_STATUSES.includes(approval.status)) {
    return approval.updatedAt ?? null;
  }
  return null;
}

// Latest resolved-step date among a submission's approval steps, or null if none resolved yet.
export function getLastApprovalDate(
  approvals?: ApprovalStepLike[],
): string | Date | null {
  if (!approvals || approvals.length === 0) return null;

  return approvals.reduce<string | Date | null>((latest, approval) => {
    const date = getApprovalActionDate(approval);
    if (!date) return latest;
    if (!latest) return date;
    return new Date(date) > new Date(latest) ? date : latest;
  }, null);
}
