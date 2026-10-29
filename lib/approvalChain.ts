import { ApprovalFlowStep, User } from "@/generated/client";
import { prisma } from "./prisma";
import {
  applyFallbackRole,
  buildRoleWhere,
  resolveFormFieldApprover,
  stepAppliesToRequester,
} from "./approverResolution";

const MANPOWER_REQUISITION_FORM_NAME = "Man Power Requisition";

export type ChainStep = ApprovalFlowStep & {
  requesterDivisions: { divisionId: number }[];
};

export type ChainSkipReason =
  // The step's requester-division condition excludes this requester.
  | "REQUESTER_DIVISION"
  // Man Power Requisition: a Head of Department requester skips the first
  // Head of Department step.
  | "HOD_REQUESTER"
  // Nobody resolved, or everyone resolved is the requester or already
  // assigned to an earlier step.
  | "NO_APPROVERS";

export type ChainEntry =
  | { step: ChainStep; status: "ACTIVE"; approvers: User[] }
  | { step: ChainStep; status: "SKIPPED"; reason: ChainSkipReason }
  // Preview only: the approver is whoever the requester picks on the form.
  | { step: ChainStep; status: "FORM_FIELD" };

/**
 * Works out the approval chain a requester would get for a form type: which
 * steps apply and who approves each one. Used by submission (to create the
 * Approval rows) and by the admin chain preview, so both always agree.
 *
 * With `preview`, a FORM_FIELD step whose field isn't filled in is reported
 * as FORM_FIELD instead of failing the whole chain.
 */
export async function resolveApprovalChain({
  formTypeId,
  formTypeName,
  requester,
  formData,
  preview = false,
}: {
  formTypeId: number;
  formTypeName: string;
  requester: User;
  formData: Record<string, unknown>;
  preview?: boolean;
}): Promise<{ entries: ChainEntry[] } | { error: string }> {
  const steps = await prisma.approvalFlowStep.findMany({
    where: { formTypeId },
    include: { requesterDivisions: { select: { divisionId: true } } },
    orderBy: { order: "asc" },
  });

  const entries: ChainEntry[] = [];
  const assignedApprovers: number[] = [];
  let hasActiveStep = false;

  const shouldSkipFirstDepartmentApprovalForManpower =
    formTypeName === MANPOWER_REQUISITION_FORM_NAME &&
    requester.role === "HEAD_OF_DEPARTMENT";
  let hasSkippedInitialDepartmentStep = false;

  for (const step of steps) {
    if (!stepAppliesToRequester(step, requester.divisionId)) {
      entries.push({ step, status: "SKIPPED", reason: "REQUESTER_DIVISION" });
      continue;
    }

    if (
      shouldSkipFirstDepartmentApprovalForManpower &&
      !hasSkippedInitialDepartmentStep &&
      !hasActiveStep &&
      step.role === "HEAD_OF_DEPARTMENT"
    ) {
      hasSkippedInitialDepartmentStep = true;
      entries.push({ step, status: "SKIPPED", reason: "HOD_REQUESTER" });
      continue;
    }

    const manualApprovers = await prisma.approvalStepApprover.findMany({
      where: { stepId: step.id },
      include: { user: true },
    });

    let approvers: User[] = [];

    if (step.approverSource === "FORM_FIELD" && step.formFieldKey) {
      // Approver comes from a value the requester picked on the form itself
      if (preview && !formData[step.formFieldKey]) {
        entries.push({ step, status: "FORM_FIELD" });
        hasActiveStep = true;
        continue;
      }
      const resolved = await resolveFormFieldApprover(formData, step, requester);
      if ("error" in resolved) return { error: resolved.error };
      approvers = [resolved.approver];
    } else if (step.approverSource === "MANUAL" || manualApprovers.length > 0) {
      // Manual approvers, when present, override role-based resolution
      approvers = manualApprovers.map((a) => a.user);
    } else {
      approvers = await prisma.user.findMany({
        where: buildRoleWhere(step.role, step, requester, assignedApprovers),
      });

      // Legacy fallback for step 1 (kept as-is for backward compatibility)
      if (
        approvers.length === 0 &&
        step.order === 1 &&
        step.role === "HEAD_OF_DEPARTMENT"
      ) {
        approvers = await prisma.user.findMany({
          where: {
            role: "HEAD_OF_DIVISION",
            divisionId: requester.divisionId,
            id: { notIn: assignedApprovers },
          },
        });
      }

      // Admin-configured fallback/combine role (generic, any step/form)
      approvers = await applyFallbackRole(approvers, step, requester, assignedApprovers);
    }

    // The requester never approves their own request, and nobody is
    // assigned to more than one step.
    approvers = approvers.filter(
      (a) => a.id !== requester.id && !assignedApprovers.includes(a.id),
    );

    if (approvers.length === 0) {
      entries.push({ step, status: "SKIPPED", reason: "NO_APPROVERS" });
      continue;
    }

    assignedApprovers.push(...approvers.map((a) => a.id));
    hasActiveStep = true;
    entries.push({ step, status: "ACTIVE", approvers });
  }

  return { entries };
}
