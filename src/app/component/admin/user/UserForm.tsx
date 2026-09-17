import {
  Department,
  Division,
  FormType,
  Section,
  UserType,
} from "@/app/types/types";
import MultiComboBox from "../../ui/MultiComboBox";
import Label from "../../ui/Label";
import { Input } from "../../ui/Input";
import { useState } from "react";
import ComboBox from "../../ui/ComboBox";
import { roles } from "../../../../../lib/data";
import PrimaryButton from "../../ui/PrimaryButton";
import { IoReturnDownBack } from "react-icons/io5";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Role } from "@/generated/client";
import { withBasePath } from "@/lib/base-path";


// Assigning these grants more than a filtered submission list.
const SENSITIVE_FORM_TYPES = ["Sexual Harassment Report"];

interface UserFormProps {
  user: UserType;
  onBack: () => void;
  divisions: Division[];
  departments: Department[];
  sections: Section[];
  formTypes: FormType[];
  readOnly?: boolean;
  setSelectedDivision: (id: string) => void;
  setSelectedDepartment: (id: string) => void;
  onUpdate: () => void;
}

function UserForm({
  user,
  onBack,
  divisions,
  departments,
  sections,
  formTypes,
  readOnly = false,
  setSelectedDivision,
  setSelectedDepartment,
  onUpdate,
}: UserFormProps) {
  const [data, setData] = useState<UserType>(user);
  const [additionalRoles, setAdditionalRoles] = useState<string[]>(
    (user.roles ?? []).filter((r) => r !== user.role),
  );
  const [formTypeScopes, setFormTypeScopes] = useState<string[]>(
    (user.formTypeScopes ?? []).map((s) => s.formTypeId.toString()),
  );
  const [selectedDivision, setDivision] = useState<string>(
    user.division?.name || ""
  );
  const [selectedDepartment, setDepartment] = useState<string>(
    user.department?.name || ""
  );
  const [selectedSection, setSection] = useState<string>(
    user.section?.name || ""
  );
  const styleLink = `flex flex-col gap-y-2`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFormAdmin =
    data.role === "FORM_ADMIN" || additionalRoles.includes("FORM_ADMIN");

  const addDashOption = (menu: { id: number; name: string }[]) => {
    if (!menu.some((item) => item.name === "-")) {
      return [{ id: 0, name: "-" }, ...menu];
    }
    return menu;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Belt and braces: the API rejects these callers anyway, but a disabled
    // form should never fire a request in the first place.
    if (readOnly) return;
    const formattedData = {
      ...data,
      division: data.divisionId?.toString() || "",
      department: data.departmentId?.toString() || "",
      section: data.sectionId?.toString() || "",
      // Sent only for the scoped role; the API clears the assignment for
      // anyone else, so demoting a form admin cannot leave orphaned scope.
      formTypeScopes: isFormAdmin ? formTypeScopes.map(Number) : [],
      additionalRoles,
    };
    try {
      await axios.put(withBasePath(`/api/user/${user.staffid}`), formattedData);
      toast.success("Successfully updated user");
      onUpdate(); // 👈 notify parent to refresh data
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Unable to update the user");
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs">
        <Toaster position="top-right" />
      </div>
      <PrimaryButton
        name="Back to list"
        icon={<IoReturnDownBack className="w-5 h-5" />}
        onClick={onBack}
        className="text-indigo-800 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-medium cursor-pointer"
      />

      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        {readOnly ? "User" : "Edit User"}: {data.fullname ?? ""} (
        {data.staffid ?? ""})
      </h2>

      <form className="space-y-4 flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className={styleLink}>
          <Label
            name="Full Name"
            htmlFor="fullname"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <Input
            disabled={readOnly}
            id="fullname"
            name="fullname"
            type="text"
            value={data.fullname ?? ""}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className={styleLink}>
          <Label
            name="Email"
            htmlFor="email"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <Input
            disabled={readOnly}
            id="email"
            name="email"
            type="text"
            value={data.email ?? ""}
            onChange={handleChange}
            placeholder="Email"
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className={styleLink}>
          <Label
            name="Staff Id"
            htmlFor="staffid"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <Input
            disabled={readOnly}
            id="staffid"
            name="staffid"
            type="text"
            value={data.staffid ?? ""}
            onChange={handleChange}
            placeholder="Staff Id"
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className={styleLink}>
          <Label
            name="Division"
            htmlFor="division"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <ComboBox
            disabled={readOnly}
            menu={addDashOption(divisions)}
            selectedValue={selectedDivision}
            onSelect={(item) => {
              const value = item ? item.name : "";
              setDivision(value);
              setSelectedDivision(item?.id.toString() || "");
              setDepartment("");
              setSection("");
              setSelectedDepartment("");

              setData((prev) => ({
                ...prev,
                // division: item
                //   ? {
                //       id: Number(item.id), // ✅ ensure number
                //       name: item.name,
                //     }
                //   : null,
                divisionId: item ? Number(item.id) : null,
                department: null,
                section: null,
              }));
            }}
          />
        </div>
        <div className={styleLink}>
          <Label
            name="Department"
            htmlFor="department"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <ComboBox
            disabled={readOnly}
            menu={addDashOption(departments)}
            selectedValue={selectedDepartment}
            onSelect={(item) => {
              const value = item ? item.name : "";
              setDepartment(value);
              setSelectedDepartment(item?.id.toString() || "");
              setSection("");

              setData((prev) => ({
                ...prev,
                // department: item
                //   ? {
                //       id: Number(item.id),
                //       name: item.name,
                //     }
                //   : null,
                departmentId: item ? Number(item.id) : null,
                section: null,
              }));
            }}
          />
        </div>
        <div className={styleLink}>
          <Label
            name="Section"
            htmlFor="section"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <ComboBox
            disabled={readOnly}
            menu={addDashOption(sections)}
            selectedValue={selectedSection}
            onSelect={(item) => {
              const value = item ? item.name : "";
              setSection(value);

              setData((prev) => ({
                ...prev,
                // section: item
                //   ? {
                //       id: Number(item.id),
                //       name: item.name,
                //     }
                //   : null,
                sectionId: item ? Number(item.id) : null,
              }));
            }}
          />
        </div>
        <div className={styleLink}>
          <Label
            name="Designation"
            htmlFor="designation"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <Input
            disabled={readOnly}
            id="designation"
            name="designation"
            type="text"
            value={data.designation ?? ""}
            onChange={handleChange}
            placeholder="Designation"
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className={styleLink}>
          <Label
            name="Role"
            htmlFor="role"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <ComboBox
            disabled={readOnly}
            menu={roles}
            selectedValue={data.role}
            onSelect={(item) => {
              const newRole = item?.id as Role;
              setData((prev) => ({
                ...prev,
                role: newRole, // cast to Role type
              }));
              // Keep the primary role out of the additional-roles list —
              // it's already represented by the field above.
              setAdditionalRoles((prev) => prev.filter((r) => r !== newRole));
            }}
          />
        </div>

        <div className={styleLink}>
          <Label
            name="Additional Roles"
            htmlFor="additionalRoles"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          />
          <MultiComboBox
            disabled={readOnly}
            menu={roles.filter(
              (r) => r.id !== "STAFF" && r.id !== data.role,
            )}
            selectedValues={additionalRoles}
            onSelect={(items) =>
              setAdditionalRoles(items.map((i) => i.id.toString()))
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Roles granted on top of the primary role above (e.g. also making a
            Head of Section an Admin).
          </p>
        </div>

        {isFormAdmin && (
          <div className={styleLink}>
            <Label
              name="Forms this admin can manage"
              htmlFor="formTypeScopes"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100"
            />
            <MultiComboBox
              disabled={readOnly}
              menu={formTypes.map((f) => ({
                id: f.id,
                // Flagged inline: this one grants access to confidential
                // harassment reports, not just a list of submissions.
                name: SENSITIVE_FORM_TYPES.includes(f.name)
                  ? `${f.name} — confidential`
                  : f.name,
              }))}
              selectedValues={formTypeScopes}
              onSelect={(items) =>
                setFormTypeScopes(items.map((i) => i.id.toString()))
              }
            />
            {formTypeScopes.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No forms selected — this admin will see nothing.
              </p>
            )}
            {formTypes.some(
              (f) =>
                SENSITIVE_FORM_TYPES.includes(f.name) &&
                formTypeScopes.includes(f.id.toString()),
            ) && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Grants access to confidential harassment reports, including
                reporter identities.
              </p>
            )}
          </div>
        )}

        {readOnly ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2">
            View only. Changing user details or roles requires a full admin.
          </p>
        ) : (
          <div className="flex justify-end">
            <PrimaryButton
              name="Save Changes"
              type="submit"
              className="bg-indigo-800 max-w-3xs flex text-xs cursor-pointer text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            />
          </div>
        )}
      </form>
    </div>
  );
}

export { UserForm };
