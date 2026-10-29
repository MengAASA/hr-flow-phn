"use client";

import {
  Department,
  Division,
  FormType,
  Section,
  UserType,
} from "@/app/types/types";
import React, { useEffect, useState } from "react";
import ApprovalFlowForm from "./ApprovalFlowForm";
import ApprovalChainPreview from "./ApprovalChainPreview";
import CheckBox from "../../ui/CheckBox";
import axios from "axios";
import toast from "react-hot-toast";
import ConfirmModal from "../../ui/ConfirmModal";
import { withBasePath } from "@/lib/base-path";
import {
  motion,
  AnimatePresence,
  Variants,
  Reorder,
} from "framer-motion";
import { FormApproverFieldOptions } from "../../../../../lib/hrformcomponents";
import { hasFixedApprovalMode, sanitizeName } from "../../../../../lib/utils";

export interface ApprovalFlowStep {
  id: number;
  createdAt: Date;
  departmentId: number | null;
  divisionId: number | null;
  formTypeId: number;
  order: number;
  role: string;
  fallbackRole: string | null;
  combineWithFallback: boolean;
  sectionId: number | null;
  user?: UserType[];
  formType?: FormType;
  division?: Division;
  department?: Department;
  section?: Section;
  approvalStepApprovers: ApprovalStepApprover[];
  approverSource: string;
  formFieldKey: string | null;
  approvalMode: string;
  stepType: string;
  requesterDivisionMode: string;
  requesterDivisions?: ApprovalStepRequesterDivision[];
}

export interface ApprovalStepRequesterDivision {
  id: number;
  stepId: number;
  divisionId: number;
  division?: Division;
}

export interface ApprovalStepApprover {
  id: number;
  stepId: number;
  userId: number;
  user: UserType;
}

const SOURCE_LABELS: Record<string, string> = {
  ROLE: "Role",
  MANUAL: "Manual",
  FORM_FIELD: "Form Field",
};

const APPROVAL_MODE_LABELS: Record<string, string> = {
  ALL: "All required",
  ANY: "Any one",
};

function getFormFieldLabel(formTypeName: string | undefined, key: string | null) {
  if (!key) return "-";
  const options = formTypeName
    ? FormApproverFieldOptions[sanitizeName(formTypeName)]
    : undefined;
  return options?.find((f) => f.key === key)?.label ?? key;
}

function titleCaseRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function buildStepSummary(item: ApprovalFlowStep) {
  if (item.approverSource === "FORM_FIELD") {
    return `Whoever the requester selected as "${getFormFieldLabel(
      item.formType?.name,
      item.formFieldKey,
    )}"`;
  }

  if (item.approvalStepApprovers.length > 0) {
    return item.approverSource === "MANUAL"
      ? "Specific people (listed below)"
      : "Manually assigned approvers (overrides role-based resolution)";
  }

  if (item.approverSource === "MANUAL") {
    return "No approvers assigned yet";
  }

  // ROLE, resolved dynamically per submitter
  const scope = [item.division?.name, item.department?.name, item.section?.name]
    .filter(Boolean)
    .join(" → ");
  let text = `${titleCaseRole(item.role)}${
    scope ? ` (${scope})` : " (requester's own org unit)"
  }`;
  if (item.fallbackRole) {
    text += item.combineWithFallback
      ? `, together with ${titleCaseRole(item.fallbackRole)}`
      : `, or ${titleCaseRole(item.fallbackRole)} if none assigned`;
  }
  return text;
}

function buildAppliesToSummary(item: ApprovalFlowStep) {
  if (item.requesterDivisionMode === "ALL") return null;
  const names = (item.requesterDivisions ?? [])
    .map((r) => r.division?.name ?? `#${r.divisionId}`)
    .join(", ");
  return item.requesterDivisionMode === "ONLY"
    ? `Only requesters from: ${names}`
    : `All requesters except: ${names}`;
}

interface ApprovalFlowProps {
  approvalStep: ApprovalFlowStep[];
  formType: FormType[];
  divisions: Division[];
  departments: Department[];
  sections: Section[];
  setSelectedDivision: (id: string) => void;
  setSelectedDepartment: (id: string) => void;
}

export default function ApprovalFlow({
  formType,
  divisions,
  departments,
  sections,
  setSelectedDivision,
  setSelectedDepartment,
}: ApprovalFlowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedStep, setSelectedStep] = useState<ApprovalFlowStep | null>(
    null,
  );
  const [approvalFlow, setApprovalFlow] = useState<ApprovalFlowStep[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleAddForm = () => {
    setSelectedStep(null);
    setIsAdding(true);
  };
  const handleBack = () => {
    setIsAdding(false);
    setDeleteMode(false);
  };

  const toggleSelect = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const handleDeleteClick = () => {
    if (deleteMode) setShowConfirmModal(true);
    else {
      setDeleteMode(true);
      toast("Select rows to delete");
    }
  };

  const handleConfirmDelete = async () => {
    setShowConfirmModal(false);
    await handleDeleteSelected();
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedRows([]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows.length) return toast.error("No rows selected");
    try {
      setLoading(true);
      await axios.post(withBasePath("/api/approval-flow/delete"), {
        ids: selectedRows,
      });
      toast.success("Deleted successfully");
      setDeleteMode(false);
      setSelectedRows([]);
      await fetchApprovalSteps();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (step: ApprovalFlowStep) => {
    if (deleteMode) toggleSelect(step.id);
    else {
      setSelectedStep(step);
      setIsAdding(true);
    }
  };

  const fetchApprovalSteps = async () => {
    try {
      setLoading(true);
      const res = await axios.get(withBasePath("/api/approval-flow"));
      const data = res.data;
      setApprovalFlow(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching approval steps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalSteps();
  }, []);

  const handleNewData = async () => {
    await fetchApprovalSteps();
    setIsAdding(false);
  };

  // Framer Motion variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } },
  };

  const grouped = approvalFlow.reduce(
    (acc, step) => {
      const key = step.formTypeId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(step);
      return acc;
    },
    {} as Record<number, ApprovalFlowStep[]>,
  );

  const handleSaveOrder = async (newOrder: ApprovalFlowStep[]) => {
    try {
      const updated = newOrder.map((item, index) => ({
        id: item.id,
        order: index + 1,
      }));

      await axios.post(withBasePath("/api/approval-flow/update-order"), {
        steps: updated,
      });

      toast.success("Order updated");
    } catch {
      toast.error("Failed to update order");
    }
  };

  return (
    <div className="p-6 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
      <AnimatePresence mode="wait">
        {!isAdding ? (
          <motion.div
            key="table-view"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Approval Step
              </h2>

              <div className="flex items-center gap-2">
                {deleteMode ? (
                  <>
                    <button
                      onClick={handleDeleteClick}
                      disabled={loading}
                      className="bg-red-600 text-white text-xs px-4 py-2 rounded-sm hover:bg-red-700 transition cursor-pointer disabled:bg-gray-400"
                    >
                      {loading
                        ? "Deleting..."
                        : `Confirm Delete (${selectedRows.length})`}
                    </button>
                    <button
                      onClick={cancelDeleteMode}
                      className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs px-4 py-2 rounded-sm hover:bg-gray-400 dark:hover:bg-gray-600 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowPreview((prev) => !prev)}
                      className={`text-xs px-4 py-2 rounded-sm transition cursor-pointer ${
                        showPreview
                          ? "bg-sky-700 text-white hover:bg-sky-800"
                          : "bg-sky-600 text-white hover:bg-sky-700"
                      }`}
                    >
                      {showPreview ? "Hide Preview" : "Preview Chain"}
                    </button>
                    <button
                      onClick={() => setDragMode((prev) => !prev)}
                      className={`text-xs px-4 py-2 rounded-sm transition cursor-pointer ${
                        dragMode
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-600 text-white hover:bg-gray-700"
                      }`}
                    >
                      {dragMode ? "Disable Reorder" : "Enable Reorder"}
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      className="bg-red-600 text-white text-xs px-4 py-2 rounded-sm hover:bg-red-700 transition cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleAddForm}
                      className="bg-indigo-800 text-white text-xs px-4 py-2 rounded-sm hover:bg-indigo-700 transition cursor-pointer"
                    >
                      + Add Step
                    </button>
                  </>
                )}
              </div>
            </div>

            {showPreview && (
              <ApprovalChainPreview
                formType={formType}
                steps={approvalFlow}
                describeStep={buildStepSummary}
              />
            )}

            {loading ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                Loading latest approval flow steps ...
              </p>
            ) : (
              <div className="w-full flex flex-col gap-4">
                {/* Body - Optimized for smooth drag control */}
                {Object.entries(grouped).map(([formTypeId, steps]) => {
                  const sortedSteps = [...steps].sort(
                    (a, b) => a.order - b.order,
                  );

                  return (
                    <div
                      key={formTypeId}
                      className="w-full overflow-x-auto rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
                    >
                      {/* Form Type Header */}
                      <div className="bg-gray-100 dark:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300 px-4 py-2 text-sm border-b border-gray-300 dark:border-gray-700">
                        {sortedSteps[0]?.formType?.name ?? "No Form Type"}
                      </div>

                      <Reorder.Group
                        axis="y"
                        values={sortedSteps}
                        onReorder={(newSteps) => {
                          const updatedSteps = newSteps.map((step, index) => ({
                            ...step,
                            order: index + 1, // <-- update order here
                          }));

                          setApprovalFlow((prev) => {
                            const others = prev.filter(
                              (s) => s.formTypeId !== Number(formTypeId),
                            );
                            return [...others, ...updatedSteps];
                          });

                          handleSaveOrder(updatedSteps); // save updated order
                        }}
                        className="divide-y divide-gray-100 dark:divide-gray-800"
                      >
                        {sortedSteps.map((item, index) => (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 40,
                              mass: 0.8,
                            }}
                            dragListener={dragMode && !deleteMode}
                            dragMomentum={false}
                            whileDrag={{
                              scale: 1.02,
                              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                              zIndex: 100,
                            }}
                            onDragStart={() => setIsDragging(true)}
                            onDragEnd={() => {
                              setTimeout(() => setIsDragging(false), 50);
                            }}
                            onClick={() => {
                              if (!isDragging && !dragMode) {
                                handleRowClick(item);
                              }
                            }}
                            className={`flex items-start gap-3 px-4 py-3 text-xs text-gray-700 dark:text-gray-300 transition-colors ${
                              deleteMode
                                ? selectedRows.includes(item.id)
                                  ? "bg-red-50 dark:bg-red-950/40"
                                  : "hover:bg-red-100 dark:hover:bg-red-900/40"
                                : "hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            } ${
                              dragMode
                                ? "cursor-grab active:cursor-grabbing touch-none"
                                : "touch-auto"
                            }`}
                          >
                            {deleteMode && (
                              <CheckBox
                                checked={selectedRows.includes(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="mt-1 shrink-0"
                              />
                            )}

                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-400 font-semibold text-[0.7rem] shrink-0 mt-0.5">
                              {index + 1}
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[0.6rem] font-semibold uppercase tracking-wide">
                                  {SOURCE_LABELS[item.approverSource] ?? "Role"}
                                </span>
                                {item.stepType === "NOTIFY" && (
                                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-[0.6rem] font-semibold uppercase tracking-wide">
                                    Notify Only
                                  </span>
                                )}
                                {item.approverSource !== "FORM_FIELD" &&
                                  item.stepType !== "NOTIFY" &&
                                  (hasFixedApprovalMode(item.formType?.name) ? (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                      title="This form type has its own built-in approval flow; Approval Mode does not apply."
                                    >
                                      Fixed by form
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wide ${
                                        item.approvalMode === "ANY"
                                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                      }`}
                                    >
                                      {APPROVAL_MODE_LABELS[item.approvalMode] ??
                                        item.approvalMode}
                                    </span>
                                  ))}
                              </div>

                              <p className="text-gray-800 dark:text-gray-200">
                                {buildStepSummary(item)}
                              </p>

                              {buildAppliesToSummary(item) && (
                                <p className="mt-0.5 text-sky-700 dark:text-sky-400">
                                  {buildAppliesToSummary(item)}
                                </p>
                              )}

                              {item.approvalStepApprovers.length > 0 && (
                                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                                  {item.approvalStepApprovers
                                    .sort((a, b) => a.id - b.id)
                                    .map((a) => a.user?.fullname ?? "No user")
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
          >
            <ApprovalFlowForm
              handleBack={handleBack}
              onUpdate={handleNewData}
              formType={formType}
              divisions={divisions}
              departments={departments}
              sections={sections}
              setSelectedDivision={setSelectedDivision}
              setSelectedDepartment={setSelectedDepartment}
              selectedStep={selectedStep}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Are you sure you want to delete ${selectedRows.length} selected approval step(s)?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmModal(false)}
        cancelText="Cancel"
        okText="Delete"
        title="Are you sure you want to delete this step?"
      />
    </div>
  );
}
