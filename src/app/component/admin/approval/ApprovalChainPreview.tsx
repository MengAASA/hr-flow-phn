"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import ComboBox from "../../ui/ComboBox";
import Label from "../../ui/Label";
import { FormType, UserType } from "@/app/types/types";
import { withBasePath } from "@/lib/base-path";
import type { ApprovalFlowStep } from "./ApprovalFlow";

interface PreviewPerson {
  id: number;
  fullname: string;
  staffid: string;
  role: string;
  designation: string | null;
}

interface PreviewStep {
  stepId: number;
  order: number;
  stepType: string;
  approvalMode: string;
  status: "ACTIVE" | "SKIPPED" | "FORM_FIELD";
  reason: "REQUESTER_DIVISION" | "HOD_REQUESTER" | "NO_APPROVERS" | null;
  approvers: PreviewPerson[];
}

interface PreviewResult {
  formType: { id: number; name: string };
  customRouting: boolean;
  requester: PreviewPerson & {
    division: string | null;
    department: string | null;
    section: string | null;
  };
  steps: PreviewStep[];
}

const SKIP_REASON_TEXT: Record<NonNullable<PreviewStep["reason"]>, string> = {
  REQUESTER_DIVISION: "This step doesn't apply to requesters from this division.",
  HOD_REQUESTER: "The requester is a Head of Department, so the first Head of Department step is skipped.",
  NO_APPROVERS:
    "Nobody to assign: no one holds this role in the requester's unit, or the only match is the requester or someone already approving an earlier step.",
};

function titleCaseRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface ApprovalChainPreviewProps {
  formType: FormType[];
  steps: ApprovalFlowStep[];
  describeStep: (step: ApprovalFlowStep) => string;
}

// Lets an admin pick a form type and a requester and see the exact chain the
// system would build for them, including which steps are skipped and why.
export default function ApprovalChainPreview({
  formType,
  steps,
  describeStep,
}: ApprovalChainPreviewProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [formTypeId, setFormTypeId] = useState("");
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(withBasePath("/api/user"))
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  useEffect(() => {
    if (!formTypeId || !userId) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    axios
      .get(withBasePath("/api/approval-flow/preview"), {
        params: { formTypeId, userId },
      })
      .then((res) => {
        if (!cancelled) setResult(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setResult(null);
        setError(err.response?.data?.error ?? "Failed to preview approval chain");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formTypeId, userId]);

  const stepById = new Map(steps.map((s) => [s.id, s]));
  const activeSteps = result?.steps.filter((s) => s.status !== "SKIPPED") ?? [];

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
      <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
        Chain Preview
      </h3>
      <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-1 mb-4">
        Pick a form and a requester to see who would approve their submission,
        using the current flow and org data. Nothing is submitted.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-y-2">
          <Label
            name="Form Type"
            htmlFor="previewFormType"
            className="block text-xs font-medium text-gray-900 dark:text-gray-100"
          />
          <ComboBox
            menu={formType.map((f) => ({ id: f.id.toString(), name: f.name }))}
            onSelect={(item) => setFormTypeId(item ? item.id.toString() : "")}
            selectedValue={formTypeId}
          />
        </div>
        <div className="flex flex-col gap-y-2">
          <Label
            name="Requester"
            htmlFor="previewRequester"
            className="block text-xs font-medium text-gray-900 dark:text-gray-100"
          />
          <ComboBox
            menu={users.map((u) => ({
              id: u.id.toString(),
              name: `${u.fullname} (${u.staffid})`,
            }))}
            onSelect={(item) => setUserId(item ? item.id.toString() : "")}
            selectedValue={userId}
          />
        </div>
      </div>

      {loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Working out the chain ...</p>
      )}

      {error && !loading && (
        <p className="mt-4 text-xs text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {result && !loading && (
        <div className="mt-4 flex flex-col gap-3 text-xs">
          <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {result.requester.fullname}
            </span>{" "}
            · {titleCaseRole(result.requester.role)}
            {" · "}
            {[result.requester.division, result.requester.department, result.requester.section]
              .filter(Boolean)
              .join(" → ") || "No org unit"}
          </div>

          {result.customRouting && (
            <p className="text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-md px-3 py-2">
              {`"${result.formType.name}" has its own built-in routing on top of these steps, so the real chain may differ from this preview.`}
            </p>
          )}

          {result.steps.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              This form type has no approval steps configured.
            </p>
          ) : activeSteps.length === 0 ? (
            <p className="text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 rounded-md px-3 py-2">
              No step resolves to an approver, so this requester could not submit the form.
            </p>
          ) : null}

          <ol className="flex flex-col gap-2">
            {result.steps.map((s) => {
              const configured = stepById.get(s.stepId);
              const skipped = s.status === "SKIPPED";
              const position = activeSteps.indexOf(s) + 1;
              return (
                <li
                  key={s.stepId}
                  className={`flex items-start gap-3 rounded-md border px-3 py-2 ${
                    skipped
                      ? "border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full font-semibold text-[0.7rem] shrink-0 ${
                      skipped
                        ? "bg-gray-100 dark:bg-gray-800"
                        : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-400"
                    }`}
                  >
                    {skipped ? "–" : position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={skipped ? "line-through" : "text-gray-500 dark:text-gray-400"}>
                      Step {s.order}
                      {configured ? `: ${describeStep(configured)}` : ""}
                      {s.stepType === "NOTIFY" ? " (notify only)" : ""}
                    </p>
                    {s.status === "ACTIVE" && (
                      <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                        {s.approvers
                          .map((a) => `${a.fullname} (${titleCaseRole(a.role)})`)
                          .join(s.approvalMode === "ANY" ? " or " : ", ")}
                        {s.approvers.length > 1 && s.approvalMode !== "ANY" && (
                          <span className="font-normal text-gray-500 dark:text-gray-400">
                            {" "}
                            · all must approve
                          </span>
                        )}
                      </p>
                    )}
                    {s.status === "FORM_FIELD" && (
                      <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                        Whoever the requester picks on the form
                      </p>
                    )}
                    {skipped && s.reason && (
                      <p className="mt-0.5">Skipped: {SKIP_REASON_TEXT[s.reason]}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
