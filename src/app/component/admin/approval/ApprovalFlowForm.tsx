"use client";

import React, { useEffect, useState } from "react";
import PrimaryButton from "../../ui/PrimaryButton";
import { IoReturnDownBack } from "react-icons/io5";
import Label from "../../ui/Label";
import { Input } from "../../ui/Input";
import ComboBox from "../../ui/ComboBox";
import {
  Department,
  Division,
  FormType,
  Section,
  UserType,
} from "@/app/types/types";
import { roles } from "../../../../../lib/data";
import { Role } from "@/generated/client";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { ApprovalFlowStep } from "./ApprovalFlow";
import MultiComboBox from "../../ui/MultiComboBox";
import CheckBox from "../../ui/CheckBox";
import { withBasePath } from "@/lib/base-path";
import { FormApproverFieldOptions } from "../../../../../lib/hrformcomponents";
import { hasFixedApprovalMode, sanitizeName } from "../../../../../lib/utils";

const APPROVER_SOURCE_OPTIONS = [
  { id: "ROLE", name: "Role-based" },
  { id: "MANUAL", name: "Manual (specific people)" },
  { id: "FORM_FIELD", name: "Form Field (from submission)" },
];

const FALLBACK_ROLE_OPTIONS = [{ id: "", name: "None" }, ...roles];

const APPROVAL_MODE_OPTIONS = [
  { id: "ALL", name: "All approvers required" },
  { id: "ANY", name: "Any one approver" },
];

const REQUESTER_DIVISION_MODE_OPTIONS = [
  {
    id: "ALL",
    name: "All requesters",
    description: "Every requester goes through this step.",
  },
  {
    id: "ONLY",
    name: "Only these divisions",
    description: "Only requesters from the divisions selected below.",
  },
  {
    id: "EXCEPT",
    name: "All except these divisions",
    description: "Every requester outside the divisions selected below.",
  },
];

const STEP_TYPE_OPTIONS = [
  {
    id: "APPROVER",
    name: "Requires Approval",
    description: "The assigned people must approve or reject before the flow continues.",
  },
  {
    id: "NOTIFY",
    name: "Notify Only",
    description: "The assigned people are emailed for information; the flow continues automatically.",
  },
];

interface ApprovalFlowFormProps {
  handleBack?: () => void;
  onUpdate?: () => void;
  formType: FormType[];
  divisions: Division[];
  departments: Department[];
  sections: Section[];
  setSelectedDivision: (id: string) => void;
  setSelectedDepartment: (id: string) => void;
  selectedStep?: ApprovalFlowStep | null;
}

export default function ApprovalFlowForm({
  handleBack,
  onUpdate,
  formType,
  divisions,
  departments,
  sections,
  setSelectedDivision,
  setSelectedDepartment,
  selectedStep,
}: ApprovalFlowFormProps) {
  const [data, setData] = useState({
    formTypeId: "",
    order: "",
    role: "",
    fallbackRole: "",
    combineWithFallback: false,
    division: "",
    department: "",
    section: "",
    approver: [] as string[],
    approverSource: "ROLE",
    formFieldKey: "",
    approvalMode: "ALL",
    stepType: "APPROVER",
    requesterDivisionMode: "ALL",
    requesterDivisions: [] as string[],
  });
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const styleLink = `flex flex-col gap-y-2`;

  // The shared list only holds active divisions; keep the step's saved one in
  // it so a since-deactivated division still shows by name, not its id.
  const savedDivision = selectedStep?.division;
  const divisionMenu =
    savedDivision && !divisions.some((d) => d.id === savedDivision.id)
      ? [...divisions, savedDivision]
      : divisions;

  // Same for the requester-division condition: keep any saved division that
  // has since been deactivated, so it can still be seen and removed.
  const requesterDivisionMenu = [
    ...divisions,
    ...(selectedStep?.requesterDivisions ?? [])
      .map((r) => r.division)
      .filter(
        (d): d is Division => !!d && !divisions.some((x) => x.id === d.id),
      ),
  ];

  useEffect(() => {
    if (selectedStep) {
      const divisionId = selectedStep.divisionId?.toString() ?? "";
      const departmentId = selectedStep.departmentId?.toString() ?? "";
      setData({
        formTypeId: selectedStep.formTypeId.toString(),
        order: selectedStep.order.toString(),
        role: selectedStep.role,
        fallbackRole: selectedStep.fallbackRole || "",
        combineWithFallback: selectedStep.combineWithFallback ?? false,
        division: divisionId,
        // Ids, not names: the API saves these as numbers.
        department: departmentId,
        section: selectedStep.sectionId?.toString() ?? "",
        approver: selectedStep.approvalStepApprovers
          ? selectedStep.approvalStepApprovers.map((a) => a.user.id.toString())
          : [],
        approverSource: selectedStep.approverSource || "ROLE",
        formFieldKey: selectedStep.formFieldKey || "",
        approvalMode: selectedStep.approvalMode || "ALL",
        stepType: selectedStep.stepType || "APPROVER",
        requesterDivisionMode: selectedStep.requesterDivisionMode || "ALL",
        requesterDivisions: (selectedStep.requesterDivisions ?? []).map((r) =>
          r.divisionId.toString(),
        ),
      });
      // Load the department/section menus for the saved scope so the
      // dropdowns can show names for the saved ids.
      setSelectedDivision(divisionId);
      setSelectedDepartment(departmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStep]);

  useEffect(() => {
    const getAllUser = async () => {
      const res = await axios.get(withBasePath("/api/user"));
      setUsers(res.data);
    };

    getAllUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      data.requesterDivisionMode !== "ALL" &&
      data.requesterDivisions.length === 0
    ) {
      toast.error("Select at least one requester division, or choose All requesters");
      return;
    }
    const url = selectedStep
      ? withBasePath(`/api/approval-flow/${selectedStep.id}`)
      : withBasePath(`/api/approval-flow`);
    const method = selectedStep ? axios.put : axios.post;
    setLoading(true);
    try {
      // These form types ignore approvalMode server-side; keep the stored
      // value in sync with reality so the list view doesn't show a mode
      // that isn't actually in effect.
      const payload = approvalModeLocked
        ? { ...data, approvalMode: "ALL", stepType: "APPROVER" }
        : data;
      await method(url, payload);
      if (method === axios.put) {
        toast.success("Approval Flow Step updated successfully");
      } else {
        toast.success("Approval Flow Step added successfully"); // ✅ no id
      }
      if (onUpdate) onUpdate();

      setTimeout(() => {
        if (handleBack) handleBack();
      }, 1000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error adding Approval Flow Step"); // ✅ no id
    } finally {
      setLoading(false);
    }
  };

  const addDashOption = (menu: { id: number; name: string }[]) => {
    if (!menu.some((item) => item.name === "-")) {
      return [{ id: 0, name: "-" }, ...menu];
    }
    return menu;
  };

  const selectedFormType = formType.find(
    (f) => f.id.toString() === data.formTypeId,
  );
  const fieldOptions = selectedFormType
    ? (FormApproverFieldOptions[sanitizeName(selectedFormType.name)] ?? [])
    : [];
  const approvalModeLocked = hasFixedApprovalMode(selectedFormType?.name);

  return (
    <>
      <div className="text-xs">
        <Toaster position="top-right" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Add Approval Step
          </h2>
          <PrimaryButton
            name="Back to list"
            icon={<IoReturnDownBack className="w-5 h-5" />}
            onClick={handleBack}
            className="text-indigo-900 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-xs font-medium cursor-pointer"
          />
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Step */}
          <section className="flex flex-col gap-y-4">
            <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">Step</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className={styleLink}>
                <Label
                  name="Form Type"
                  htmlFor="formType"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={formType.map((f) => ({
                    id: f.id.toString(),
                    name: f.name,
                  }))}
                  onSelect={(item) => {
                    setData((prev) => ({
                      ...prev,
                      formTypeId: item ? item.id.toString() : "",
                      formFieldKey: "", // available fields depend on the form type
                    }));
                  }}
                  selectedValue={data.formTypeId}
                />
              </div>

              <div className={styleLink}>
                <Label
                  name="Order"
                  htmlFor="order"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <Input
                  id="order"
                  name="order"
                  type="number"
                  placeholder="Order"
                  value={data.order}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>

          <div className="w-full border-t border-gray-200 dark:border-gray-700" />

          {/* Applies To */}
          <section className="flex flex-col gap-y-4">
            <div>
              <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
                Applies To
              </h3>
              <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-1">
                Which requesters go through this step, based on the requester&apos;s
                division. Requesters it doesn&apos;t apply to skip straight to the next step.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {REQUESTER_DIVISION_MODE_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-x-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                    data.requesterDivisionMode === option.id
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
                      : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="requesterDivisionMode"
                    value={option.id}
                    checked={data.requesterDivisionMode === option.id}
                    onChange={() =>
                      setData((prev) => ({
                        ...prev,
                        requesterDivisionMode: option.id,
                      }))
                    }
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span className="flex flex-col">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {option.name}
                    </span>
                    <span className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {data.requesterDivisionMode !== "ALL" && (
              <div className={styleLink}>
                <Label
                  name="Requester Divisions"
                  htmlFor="requesterDivisions"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <MultiComboBox
                  menu={requesterDivisionMenu.map((d) => ({ id: d.id, name: d.name }))}
                  selectedValues={data.requesterDivisions}
                  onSelect={(items) => {
                    setData((prev) => ({
                      ...prev,
                      requesterDivisions: items.map((i) => i.id.toString()),
                    }));
                  }}
                />
              </div>
            )}
          </section>

          <div className="w-full border-t border-gray-200 dark:border-gray-700" />

          {!approvalModeLocked && (
            <>
              {/* Step Type */}
              <section className="flex flex-col gap-y-4">
                <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
                  Step Type
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {STEP_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start gap-x-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        data.stepType === option.id
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
                          : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="stepType"
                        value={option.id}
                        checked={data.stepType === option.id}
                        onChange={() =>
                          setData((prev) => ({ ...prev, stepType: option.id }))
                        }
                        className="mt-0.5 accent-indigo-600"
                      />
                      <span className="flex flex-col">
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {option.name}
                        </span>
                        <span className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </>
          )}

          {/* Who Approves */}
          <section className="flex flex-col gap-y-4">
            <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
              {data.stepType === "NOTIFY" ? "Who Gets Notified" : "Who Approves"}
            </h3>

            <div className={styleLink}>
              <Label
                name="Approver Source"
                htmlFor="approverSource"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              />
              <ComboBox
                menu={APPROVER_SOURCE_OPTIONS}
                onSelect={(item) => {
                  setData((prev) => ({
                    ...prev,
                    approverSource: (item?.id as string) || "ROLE",
                  }));
                }}
                selectedValue={data.approverSource}
              />
            </div>

            {data.approverSource === "ROLE" && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={styleLink}>
                    <Label
                      name="Role"
                      htmlFor="role"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                    <ComboBox
                      menu={roles}
                      onSelect={(item) => {
                        setData((prev) => ({
                          ...prev,
                          role: item?.id as Role, // cast to Role type
                        }));
                      }}
                      selectedValue={data.role}
                    />
                  </div>

                  <div className={styleLink}>
                    <Label
                      name="Fallback Role"
                      htmlFor="fallbackRole"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                    <ComboBox
                      menu={FALLBACK_ROLE_OPTIONS}
                      onSelect={(item) => {
                        const value = (item?.id as string) || "";
                        setData((prev) => ({
                          ...prev,
                          fallbackRole: value,
                          combineWithFallback: value
                            ? prev.combineWithFallback
                            : false,
                        }));
                      }}
                      selectedValue={data.fallbackRole}
                    />
                  </div>
                </div>

                {data.fallbackRole && (
                  <div
                    className="flex items-center gap-x-2 cursor-pointer w-fit -mt-2"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        combineWithFallback: !prev.combineWithFallback,
                      }))
                    }
                  >
                    <CheckBox checked={data.combineWithFallback} />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {data.combineWithFallback
                        ? "Combine: both roles are eligible at the same time (whichever approves first, wins)"
                        : "Fallback only: use this role only if the role above has no one assigned"}
                    </span>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <div className={styleLink}>
                    <Label
                      name="Division"
                      htmlFor="division"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                    <ComboBox
                      menu={addDashOption(divisionMenu)}
                      onSelect={(item) => {
                        const divisionId = item ? item.id.toString() : "";
                        setData((prev) => ({
                          ...prev,
                          division: divisionId,
                          department: "",
                          section: "",
                        }));
                        setSelectedDivision(divisionId); // ✅ trigger parent handler
                      }}
                      selectedValue={data.division}
                    />
                  </div>
                  <div className={styleLink}>
                    <Label
                      name="Department"
                      htmlFor="department"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                    <ComboBox
                      menu={addDashOption(departments)}
                      onSelect={(item) => {
                        const departmentId = item ? item.id.toString() : "";
                        setData((prev) => ({
                          ...prev,
                          department: departmentId,
                          section: "",
                        }));
                        setSelectedDepartment(departmentId);
                      }}
                      selectedValue={data.department}
                    />
                  </div>

                  <div className={styleLink}>
                    <Label
                      name="Section"
                      htmlFor="section"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                    <ComboBox
                      menu={addDashOption(sections)}
                      onSelect={(item) => {
                        const sectionId = item ? item.id.toString() : "";
                        setData((prev) => ({
                          ...prev,
                          section: sectionId,
                        }));
                      }}
                      selectedValue={data.section}
                    />
                  </div>
                </div>
              </>
            )}

            {data.approverSource === "MANUAL" && (
              <div className={styleLink}>
                <Label
                  name="Approver"
                  htmlFor="approver"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <MultiComboBox
                  menu={users.map((i) => ({ id: i.id, name: i.fullname }))}
                  selectedValues={data.approver}
                  onSelect={(items) => {
                    setData((prev) => ({
                      ...prev,
                      approver: items.map((i) => i.id.toString()),
                    }));
                  }}
                />
              </div>
            )}

            {data.approverSource === "FORM_FIELD" && (
              <div className={styleLink}>
                <Label
                  name="Form Field"
                  htmlFor="formFieldKey"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                {fieldOptions.length > 0 ? (
                  <ComboBox
                    menu={fieldOptions.map((f) => ({
                      id: f.key,
                      name: f.label,
                    }))}
                    onSelect={(item) => {
                      setData((prev) => ({
                        ...prev,
                        formFieldKey: (item?.id as string) || "",
                      }));
                    }}
                    selectedValue={data.formFieldKey}
                  />
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-md px-3 py-2">
                    {selectedFormType
                      ? `No approver-eligible fields are registered for "${selectedFormType.name}" yet.`
                      : "Select a Form Type above to see its available fields."}
                  </p>
                )}
              </div>
            )}
          </section>

          {data.approverSource !== "FORM_FIELD" && data.stepType !== "NOTIFY" && (
            <>
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />

              {/* Approval Behavior */}
              <section className="flex flex-col gap-y-4">
                <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
                  Approval Behavior
                </h3>
                {approvalModeLocked ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-md px-3 py-2 max-w-md">
                    {`"${selectedFormType?.name}" uses its own built-in approval flow (any one approver at this step decides). The Approval Mode setting does not apply to this form type.`}
                  </p>
                ) : (
                  <div className={`${styleLink} max-w-sm`}>
                    <Label
                      name="Approval Mode"
                      htmlFor="approvalMode"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                    <ComboBox
                      menu={APPROVAL_MODE_OPTIONS}
                      onSelect={(item) => {
                        setData((prev) => ({
                          ...prev,
                          approvalMode: (item?.id as string) || "ALL",
                        }));
                      }}
                      selectedValue={data.approvalMode}
                    />
                  </div>
                )}
              </section>
            </>
          )}

          <div className="flex justify-end">
            <PrimaryButton
              name={loading ? "Saving..." : "Save"}
              type="submit"
              disabled={loading}
              className="bg-indigo-800 max-w-3xs flex text-xs cursor-pointer text-white px-4 py-2 rounded-sm hover:bg-indigo-700"
            />
          </div>
        </form>
      </div>
    </>
  );
}
