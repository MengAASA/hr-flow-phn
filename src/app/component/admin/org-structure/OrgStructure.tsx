"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  IoAdd,
  IoCheckmark,
  IoChevronForward,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
  IoPencil,
  IoTrashOutline,
} from "react-icons/io5";
import ConfirmModal from "../../ui/ConfirmModal";
import { withBasePath } from "@/lib/base-path";

interface OrgUnit {
  id: number;
  name: string;
  isActive: boolean;
}

type Level = "division" | "department" | "section";

const LEVEL_LABEL: Record<Level, string> = {
  division: "Division",
  department: "Department",
  section: "Section",
};

interface OrgStructureProps {
  // Lets the parent refresh the division dropdowns used by the other tabs.
  onDivisionsChange?: () => void;
}

// The API returns { error } on 400/404/409 — surface that rather than a
// generic message, since a refused delete explains what still uses the unit.
function apiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === "string") {
    return err.response.data.error;
  }
  return fallback;
}

export default function OrgStructure({ onDivisionsChange }: OrgStructureProps) {
  const [divisions, setDivisions] = useState<OrgUnit[]>([]);
  const [departments, setDepartments] = useState<OrgUnit[]>([]);
  const [sections, setSections] = useState<OrgUnit[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<OrgUnit | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<OrgUnit | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ level: Level; unit: OrgUnit } | null>(null);

  const fetchDivisions = useCallback(async () => {
    try {
      const res = await axios.get<OrgUnit[]>(withBasePath("/api/division?includeInactive=true"));
      setDivisions(res.data);
    } catch (err) {
      console.error("Failed to fetch divisions:", err);
    }
  }, []);

  const fetchDepartments = useCallback(async (divisionId: number) => {
    try {
      const res = await axios.get<OrgUnit[]>(
        withBasePath(`/api/department?divisionId=${divisionId}&includeInactive=true`),
      );
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  }, []);

  const fetchSections = useCallback(async (departmentId: number) => {
    try {
      const res = await axios.get<OrgUnit[]>(
        withBasePath(`/api/section?departmentId=${departmentId}&includeInactive=true`),
      );
      setSections(res.data);
    } catch (err) {
      console.error("Failed to fetch sections:", err);
    }
  }, []);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  // Keyed on the id so renaming the selected unit doesn't reset the drill-down.
  const selectedDivisionId = selectedDivision?.id;
  const selectedDepartmentId = selectedDepartment?.id;

  useEffect(() => {
    setSelectedDepartment(null);
    setSections([]);
    if (selectedDivisionId) fetchDepartments(selectedDivisionId);
    else setDepartments([]);
  }, [selectedDivisionId, fetchDepartments]);

  useEffect(() => {
    if (selectedDepartmentId) fetchSections(selectedDepartmentId);
    else setSections([]);
  }, [selectedDepartmentId, fetchSections]);

  // Re-read whichever list the change touched.
  const refresh = (level: Level) => {
    if (level === "division") {
      fetchDivisions();
      onDivisionsChange?.();
    } else if (level === "department" && selectedDivision) {
      fetchDepartments(selectedDivision.id);
    } else if (level === "section" && selectedDepartment) {
      fetchSections(selectedDepartment.id);
    }
  };

  const handleAdd = async (level: Level, name: string): Promise<boolean> => {
    const body =
      level === "division"
        ? { name }
        : level === "department"
          ? { name, divisionId: selectedDivision?.id }
          : { name, departmentId: selectedDepartment?.id };
    try {
      await axios.post(withBasePath(`/api/${level}`), body);
      toast.success(`${LEVEL_LABEL[level]} added`);
      refresh(level);
      return true;
    } catch (err) {
      toast.error(apiError(err, `Failed to add ${level}`));
      return false;
    }
  };

  const handleUpdate = async (
    level: Level,
    unit: OrgUnit,
    data: { name?: string; isActive?: boolean },
  ): Promise<boolean> => {
    try {
      const res = await axios.put<OrgUnit>(withBasePath(`/api/${level}/${unit.id}`), data);
      toast.success(
        data.isActive === undefined
          ? `${LEVEL_LABEL[level]} renamed`
          : `${LEVEL_LABEL[level]} ${data.isActive ? "activated" : "deactivated"}`,
      );
      // Keep the selected header in sync with a rename or status change.
      if (level === "division" && selectedDivision?.id === unit.id) setSelectedDivision(res.data);
      if (level === "department" && selectedDepartment?.id === unit.id) setSelectedDepartment(res.data);
      refresh(level);
      return true;
    } catch (err) {
      toast.error(apiError(err, `Failed to update ${level}`));
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { level, unit } = pendingDelete;
    setPendingDelete(null);
    try {
      await axios.delete(withBasePath(`/api/${level}/${unit.id}`));
      toast.success(`${LEVEL_LABEL[level]} deleted`);
      if (level === "division" && selectedDivision?.id === unit.id) setSelectedDivision(null);
      if (level === "department" && selectedDepartment?.id === unit.id) setSelectedDepartment(null);
      refresh(level);
    } catch (err) {
      toast.error(apiError(err, `Failed to delete ${level}`), { duration: 8000 });
    }
  };

  return (
    <div className="p-6 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
      <div className="text-xs">
        <Toaster position="top-right" />
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Organisation Structure</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Pick a division to see its departments, then a department to see its sections. Deactivated units
          are hidden from dropdowns but stay on existing users, approval flows and submissions. A unit can
          only be deleted when nothing uses it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UnitColumn
          level="division"
          units={divisions}
          selectedId={selectedDivision?.id}
          onSelect={setSelectedDivision}
          onAdd={(name) => handleAdd("division", name)}
          onUpdate={(unit, data) => handleUpdate("division", unit, data)}
          onDelete={(unit) => setPendingDelete({ level: "division", unit })}
        />
        <UnitColumn
          level="department"
          parent={selectedDivision}
          units={departments}
          selectedId={selectedDepartment?.id}
          onSelect={setSelectedDepartment}
          onAdd={(name) => handleAdd("department", name)}
          onUpdate={(unit, data) => handleUpdate("department", unit, data)}
          onDelete={(unit) => setPendingDelete({ level: "department", unit })}
          emptyParentMessage="Select a division to manage its departments."
        />
        <UnitColumn
          level="section"
          parent={selectedDepartment}
          units={sections}
          onAdd={(name) => handleAdd("section", name)}
          onUpdate={(unit, data) => handleUpdate("section", unit, data)}
          onDelete={(unit) => setPendingDelete({ level: "section", unit })}
          emptyParentMessage="Select a department to manage its sections."
        />
      </div>

      <ConfirmModal
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete ? LEVEL_LABEL[pendingDelete.level].toLowerCase() : ""}?`}
        message={`"${pendingDelete?.unit.name}" will be permanently deleted. This is refused if any user, approval flow, submission or child unit still uses it.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        cancelText="Cancel"
        okText="Delete"
      />
    </div>
  );
}

interface UnitColumnProps {
  level: Level;
  units: OrgUnit[];
  // For departments and sections: the unit they belong to. Undefined for the
  // division column, null while nothing is selected upstream.
  parent?: OrgUnit | null;
  selectedId?: number;
  onSelect?: (unit: OrgUnit) => void;
  onAdd: (name: string) => Promise<boolean>;
  onUpdate: (unit: OrgUnit, data: { name?: string; isActive?: boolean }) => Promise<boolean>;
  onDelete: (unit: OrgUnit) => void;
  emptyParentMessage?: string;
}

function UnitColumn({
  level,
  units,
  parent,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  emptyParentMessage,
}: UnitColumnProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const label = LEVEL_LABEL[level];
  const blocked = parent === null;

  // Drop any half-finished edit when the list switches to another parent.
  useEffect(() => {
    setEditingId(null);
    setNewName("");
  }, [parent?.id]);

  const submitNew = async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);
    if (await onAdd(newName.trim())) setNewName("");
    setAdding(false);
  };

  const submitEdit = async (unit: OrgUnit) => {
    const name = editName.trim();
    if (!name || name === unit.name) {
      setEditingId(null);
      return;
    }
    if (await onUpdate(unit, { name })) setEditingId(null);
  };

  const iconButton =
    "p-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer";

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-md min-h-80">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 rounded-t-md">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {label}s <span className="text-xs font-normal text-gray-500">({units.length})</span>
        </h3>
        {parent && (
          <p className="text-xs text-indigo-700 dark:text-indigo-400 truncate" title={parent.name}>
            in {parent.name}
          </p>
        )}
      </div>

      {blocked ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center">{emptyParentMessage}</p>
      ) : (
        <>
          <div className="flex gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
              placeholder={`New ${label.toLowerCase()} name`}
              className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-md py-1.5 px-2 text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={submitNew}
              disabled={!newName.trim() || adding}
              className="flex items-center gap-1 bg-indigo-800 text-white text-xs px-3 py-1.5 rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <IoAdd className="w-4 h-4" /> Add
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto max-h-[28rem] divide-y divide-gray-100 dark:divide-gray-800">
            {units.length === 0 && (
              <li className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center">
                No {label.toLowerCase()}s yet.
              </li>
            )}
            {units.map((unit) => {
              const isSelected = selectedId === unit.id;
              const isEditing = editingId === unit.id;
              return (
                <li
                  key={unit.id}
                  onClick={() => !isEditing && onSelect?.(unit)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs ${
                    onSelect && !isEditing ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitEdit(unit);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 min-w-0 border border-indigo-400 rounded py-1 px-2 text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button type="button" title="Save" onClick={() => submitEdit(unit)} className={iconButton}>
                        <IoCheckmark className="w-4 h-4 text-green-600" />
                      </button>
                      <button type="button" title="Cancel" onClick={() => setEditingId(null)} className={iconButton}>
                        <IoClose className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`flex-1 min-w-0 truncate ${
                          unit.isActive
                            ? "text-gray-800 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500 line-through"
                        } ${isSelected ? "font-semibold" : ""}`}
                        title={unit.name}
                      >
                        {unit.name}
                      </span>
                      {!unit.isActive && (
                        <span className="shrink-0 rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                      {/* Row actions must not also select the row. */}
                      <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => {
                            setEditingId(unit.id);
                            setEditName(unit.name);
                          }}
                          className={iconButton}
                        >
                          <IoPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title={unit.isActive ? "Deactivate" : "Activate"}
                          onClick={() => onUpdate(unit, { isActive: !unit.isActive })}
                          className={iconButton}
                        >
                          {unit.isActive ? (
                            <IoEyeOffOutline className="w-3.5 h-3.5" />
                          ) : (
                            <IoEyeOutline className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => onDelete(unit)}
                          className={`${iconButton} hover:text-red-600`}
                        >
                          <IoTrashOutline className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {onSelect && <IoChevronForward className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
