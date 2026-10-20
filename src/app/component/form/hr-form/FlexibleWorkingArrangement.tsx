"use client";

import React, { useEffect, useState } from "react";
import { Input } from "../../ui/Input";
import Label from "../../ui/Label";
import ComboBox from "../../ui/ComboBox";
import DatePicker, { DateValueType } from "../../ui/DatePicker";
import TimePicker, { TimeValueType } from "../../ui/TimePicker";
import { TextArea } from "../../ui/TextArea";
import CheckBox from "../../ui/CheckBox";
import PrimaryButton from "../../ui/PrimaryButton";
import LoadingScreen from "../../ui/LoadingScreen";
import { DynamicFormProps } from "./HrFormsClient";
import { FlexibleWorkingArrangementTypes, UserInfo } from "@/app/types/types";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/base-path";

const INPUT_CLASS =
  "w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500";

const LABEL_CLASS = "block text-sm font-medium text-gray-900 dark:text-gray-100";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 7, name: "Sunday" },
];

const DECLARATION_TEXT =
  "I confirm that the information provided is accurate and that I will comply with company policies while working under this arrangement. I further acknowledge and agree that any misuse of this FWA facility may lead to disciplinary action by Company.";

type ArrangementTypeField =
  | "flexibleHours"
  | "flexibleDays"
  | "flexiblePlace"
  | "otherArrangement";

export default function FlexibleWorkingArrangement({
  user,
  onSubmitSuccess,
  formId,
  selfForm,
  readOnly = false,
}: DynamicFormProps & { readOnly?: boolean }) {
  const [data, setData] = useState<FlexibleWorkingArrangementTypes>({
    fullname: "",
    staffId: "",
    jobTitle: "",
    department: "",
    immediateSuperior: "",
    immediateSuperiorStaffId: "",
    dateOfRequest: new Date().toLocaleDateString("en-CA"),
    flexibleHours: false,
    flexibleDays: false,
    flexiblePlace: false,
    otherArrangement: false,
    otherArrangementSpecify: "",
    startDate: null,
    endDate: null,
    workingDayFrom: "",
    workingDayTo: "",
    workingTimeFrom: "",
    workingTimeTo: "",
    workLocation: "",
    reason: "",
    declaration: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    immediateSuperior?: string;
    dateOfRequest?: string;
    arrangementType?: string;
    otherArrangementSpecify?: string;
    startDate?: string;
    workingDayFrom?: string;
    workingDayTo?: string;
    workingTimeFrom?: string;
    workingTimeTo?: string;
    workLocation?: string;
    reason?: string;
    declaration?: string;
  }>({});
  const [employeeList, setEmployeeList] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    axios
      .get(withBasePath("/api/user"))
      .then((res) => {
        setEmployeeList(
          (
            res.data as { id: number; fullname: string; staffid: string; role: string }[]
          ).map((u) => ({
            id: u.staffid,
            // Staff ID appended so employees who share a full name stay distinguishable
            name: `${u.fullname} (${u.staffid})`,
            role: u.role,
          })),
        );
      })
      .catch((error) => console.error("Failed to fetch employee list:", error));
  }, []);

  useEffect(() => {
    if (!user) return;
    const staffid = user.staffid;
    if (!staffid) return;

    const fetchUser = async () => {
      try {
        const res = await axios.get(withBasePath(`/api/user/${staffid}`));
        const userInfo: UserInfo = res.data.data;
        setData((prev) => ({
          ...prev,
          fullname: userInfo.fullname ?? "",
          staffId: userInfo.staffid ?? "",
          jobTitle: userInfo.designation ?? "",
        }));

        if (userInfo.departmentId) {
          const deptRes = await axios.get(
            // includeId: still resolve the name if the department was deactivated.
            withBasePath(
              `/api/department?divisionId=${userInfo.divisionId}&includeId=${userInfo.departmentId}`,
            ),
          );
          const dept = (
            deptRes.data as { id: number; name: string }[]
          ).find((d) => d.id === userInfo.departmentId);
          if (dept) {
            setData((prev) => ({ ...prev, department: dept.name }));
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error fetching user:", error.message);
        } else {
          console.error("Unknown error fetching user:", error);
        }
      }
    };

    fetchUser();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange =
    (field: keyof FlexibleWorkingArrangementTypes) => (val: DateValueType) => {
      setData((prev) => ({ ...prev, [field]: val }));
    };

  const handleTimeChange =
    (field: keyof FlexibleWorkingArrangementTypes) => (val: TimeValueType) => {
      setData((prev) => ({ ...prev, [field]: val ?? "" }));
    };

  const toggleArrangementType = (field: ArrangementTypeField, value: boolean) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "otherArrangement" && !value
        ? { otherArrangementSpecify: "" }
        : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formId) return;

    const newErrors: typeof errors = {};

    if (!data.immediateSuperior.trim()) {
      newErrors.immediateSuperior = "Immediate Superior is required";
    }
    if (!data.dateOfRequest) {
      newErrors.dateOfRequest = "Date of Request is required";
    }
    if (
      !data.flexibleHours &&
      !data.flexibleDays &&
      !data.flexiblePlace &&
      !data.otherArrangement
    ) {
      newErrors.arrangementType =
        "Please select at least one type of flexible working arrangement";
    }
    if (data.otherArrangement && !data.otherArrangementSpecify.trim()) {
      newErrors.otherArrangementSpecify = "Please specify the other arrangement";
    }
    if (!data.startDate) {
      newErrors.startDate = "Start Date is required";
    }
    if (!data.workingDayFrom) {
      newErrors.workingDayFrom = "Working Day (From) is required";
    }
    if (!data.workingDayTo) {
      newErrors.workingDayTo = "Working Day (To) is required";
    }
    if (!data.workingTimeFrom) {
      newErrors.workingTimeFrom = "Working Time (From) is required";
    }
    if (!data.workingTimeTo) {
      newErrors.workingTimeTo = "Working Time (To) is required";
    }
    if (!data.workLocation.trim()) {
      newErrors.workLocation = "Work Location is required";
    }
    if (!data.reason.trim()) {
      newErrors.reason = "Reason for Request is required";
    }
    if (!data.declaration) {
      newErrors.declaration = "Please acknowledge the declaration to submit";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach((msg) => msg && toast.error(msg));
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("formId", formId.toString());
    formData.append("user", JSON.stringify(user));
    formData.append("data", JSON.stringify(data));

    try {
      await axios.post(withBasePath("/api/form"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Form submitted successfully!");
      setTimeout(() => {
        router.replace("/dashboard/forms");
        onSubmitSuccess?.();
      }, 1200);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.error || error.message || "Something went wrong",
        );
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const parsedData: FlexibleWorkingArrangementTypes | undefined =
    selfForm?.formData as unknown as FlexibleWorkingArrangementTypes;

  const formData = readOnly && parsedData ? parsedData : data;

  return (
    <>
      <div className="text-xs">
        <Toaster position="top-right" />
      </div>

      <LoadingScreen show={loading} />

      <form
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-gray-900 max-w-6xl rounded-xl ${
          readOnly ? "p-0" : "p-4 border border-gray-300 dark:border-gray-700 "
        }`}
      >
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {readOnly ? "" : "Flexible Working Arrangement"}
          </h1>
          <p className="text-sm text-indigo-800 dark:text-indigo-400">
            {readOnly ? "" : "Fill in the details below to submit your request"}
          </p>
        </div>

        <div className="flex flex-col gap-y-8">
          {/* A: Employee Information */}
          <section className="flex flex-col gap-y-4">
            <h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
              A. Employee Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col space-y-2">
                <Label name="Name" htmlFor="fullname" className={LABEL_CLASS} />
                <Input
                  id="fullname"
                  name="fullname"
                  type="text"
                  value={formData.fullname}
                  disabled
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label name="Staff ID" htmlFor="staffId" className={LABEL_CLASS} />
                <Input
                  id="staffId"
                  name="staffId"
                  type="text"
                  value={formData.staffId}
                  disabled
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label name="Job Title" htmlFor="jobTitle" className={LABEL_CLASS} />
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  value={formData.jobTitle}
                  disabled
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Department"
                  htmlFor="department"
                  className={LABEL_CLASS}
                />
                <Input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  disabled
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Immediate Superior"
                  htmlFor="immediateSuperior"
                  className={LABEL_CLASS}
                />
                <ComboBox
                  menu={employeeList.filter(
                    (e) => e.id !== data.staffId && e.role !== "STAFF",
                  )}
                  selectedValue={formData.immediateSuperior}
                  onSelect={(item) => {
                    setData((prev) => ({
                      ...prev,
                      immediateSuperior: item ? item.name : "",
                      immediateSuperiorStaffId: item ? String(item.id) : "",
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      immediateSuperior: undefined,
                    }));
                  }}
                  disabled={readOnly}
                  className={errors.immediateSuperior ? "border-red-500" : ""}
                />
                {errors.immediateSuperior && (
                  <p className="text-xs text-red-600">
                    {errors.immediateSuperior}
                  </p>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Date of Request"
                  htmlFor="dateOfRequest"
                  className={LABEL_CLASS}
                />
                <DatePicker
                  value={formData.dateOfRequest}
                  onChange={readOnly ? () => {} : handleDateChange("dateOfRequest")}
                  disabled={readOnly}
                  className={`${INPUT_CLASS} ${
                    errors.dateOfRequest ? "border-red-500" : ""
                  }`}
                />
                {errors.dateOfRequest && (
                  <p className="text-xs text-red-600">{errors.dateOfRequest}</p>
                )}
              </div>
            </div>
          </section>

          <div className="w-full border border-indigo-800/60 dark:border-indigo-900" />

          {/* B: Type of Flexible Working Requested */}
          <section className="flex flex-col gap-y-3">
            <h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
              B. Type of Flexible Working Requested
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Please tick all that apply</p>
            <div className="flex flex-col gap-y-3">
              <div
                className="flex items-center gap-x-2 cursor-pointer w-fit"
                onClick={() =>
                  !readOnly &&
                  toggleArrangementType("flexibleHours", !formData.flexibleHours)
                }
              >
                <CheckBox checked={formData.flexibleHours} disabled={readOnly} />
                <Label
                  name="Flexible working hours"
                  htmlFor="flexibleHours"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                />
              </div>
              <div
                className="flex items-center gap-x-2 cursor-pointer w-fit"
                onClick={() =>
                  !readOnly &&
                  toggleArrangementType("flexibleDays", !formData.flexibleDays)
                }
              >
                <CheckBox checked={formData.flexibleDays} disabled={readOnly} />
                <Label
                  name="Flexible working days"
                  htmlFor="flexibleDays"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                />
              </div>
              <div
                className="flex items-center gap-x-2 cursor-pointer w-fit"
                onClick={() =>
                  !readOnly &&
                  toggleArrangementType("flexiblePlace", !formData.flexiblePlace)
                }
              >
                <CheckBox checked={formData.flexiblePlace} disabled={readOnly} />
                <Label
                  name="Flexible place of work"
                  htmlFor="flexiblePlace"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <div
                  className="flex items-center gap-x-2 cursor-pointer w-fit"
                  onClick={() =>
                    !readOnly &&
                    toggleArrangementType(
                      "otherArrangement",
                      !formData.otherArrangement,
                    )
                  }
                >
                  <CheckBox
                    checked={formData.otherArrangement}
                    disabled={readOnly}
                  />
                  <Label
                    name="Other (please specify)"
                    htmlFor="otherArrangement"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                  />
                </div>
                <Input
                  id="otherArrangementSpecify"
                  name="otherArrangementSpecify"
                  type="text"
                  value={formData.otherArrangementSpecify}
                  onChange={readOnly ? undefined : handleChange}
                  disabled={readOnly || !formData.otherArrangement}
                  placeholder="Please specify"
                  className={`${INPUT_CLASS} max-w-md ${
                    errors.otherArrangementSpecify ? "border-red-500" : ""
                  } ${
                    !formData.otherArrangement
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : ""
                  }`}
                />
                {errors.otherArrangementSpecify && (
                  <p className="text-xs text-red-600">
                    {errors.otherArrangementSpecify}
                  </p>
                )}
              </div>
              {errors.arrangementType && (
                <p className="text-xs text-red-600">{errors.arrangementType}</p>
              )}
            </div>
          </section>

          <div className="w-full border border-indigo-800/60 dark:border-indigo-900" />

          {/* C: Proposed Arrangement Details */}
          <section className="flex flex-col gap-y-4">
            <h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
              C. Proposed Arrangement Details
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col space-y-2">
                <Label name="Start Date" htmlFor="startDate" className={LABEL_CLASS} />
                <DatePicker
                  value={formData.startDate}
                  onChange={readOnly ? () => {} : handleDateChange("startDate")}
                  disabled={readOnly}
                  className={`${INPUT_CLASS} ${
                    errors.startDate ? "border-red-500" : ""
                  }`}
                />
                {errors.startDate && (
                  <p className="text-xs text-red-600">{errors.startDate}</p>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="End Date (leave blank if permanent)"
                  htmlFor="endDate"
                  className={LABEL_CLASS}
                />
                <DatePicker
                  value={formData.endDate}
                  onChange={readOnly ? () => {} : handleDateChange("endDate")}
                  disabled={readOnly}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col space-y-2 md:col-span-2">
                <Label
                  name="Proposed Working Days/Hours"
                  htmlFor="workingDayFrom"
                  className={LABEL_CLASS}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col space-y-1">
                    <Label
                      name="Day From"
                      htmlFor="workingDayFrom"
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <ComboBox
                      menu={DAYS_OF_WEEK}
                      selectedValue={formData.workingDayFrom}
                      onSelect={(item) => {
                        setData((prev) => ({
                          ...prev,
                          workingDayFrom: item ? item.name : "",
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          workingDayFrom: undefined,
                        }));
                      }}
                      disabled={readOnly}
                      className={
                        errors.workingDayFrom ? "border-red-500" : ""
                      }
                    />
                    {errors.workingDayFrom && (
                      <p className="text-xs text-red-600">
                        {errors.workingDayFrom}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Label
                      name="Day To"
                      htmlFor="workingDayTo"
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <ComboBox
                      menu={DAYS_OF_WEEK}
                      selectedValue={formData.workingDayTo}
                      onSelect={(item) => {
                        setData((prev) => ({
                          ...prev,
                          workingDayTo: item ? item.name : "",
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          workingDayTo: undefined,
                        }));
                      }}
                      disabled={readOnly}
                      className={errors.workingDayTo ? "border-red-500" : ""}
                    />
                    {errors.workingDayTo && (
                      <p className="text-xs text-red-600">
                        {errors.workingDayTo}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Label
                      name="Time From"
                      htmlFor="workingTimeFrom"
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <TimePicker
                      value={formData.workingTimeFrom || null}
                      onChange={
                        readOnly ? () => {} : handleTimeChange("workingTimeFrom")
                      }
                      disabled={readOnly}
                      className={`${INPUT_CLASS} ${
                        errors.workingTimeFrom ? "border-red-500" : ""
                      }`}
                    />
                    {errors.workingTimeFrom && (
                      <p className="text-xs text-red-600">
                        {errors.workingTimeFrom}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Label
                      name="Time To"
                      htmlFor="workingTimeTo"
                      className="text-xs text-gray-600 dark:text-gray-400"
                    />
                    <TimePicker
                      value={formData.workingTimeTo || null}
                      onChange={
                        readOnly ? () => {} : handleTimeChange("workingTimeTo")
                      }
                      disabled={readOnly}
                      className={`${INPUT_CLASS} ${
                        errors.workingTimeTo ? "border-red-500" : ""
                      }`}
                    />
                    {errors.workingTimeTo && (
                      <p className="text-xs text-red-600">
                        {errors.workingTimeTo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2 md:col-span-2">
                <Label
                  name="Work Location"
                  htmlFor="workLocation"
                  className={LABEL_CLASS}
                />
                <Input
                  id="workLocation"
                  name="workLocation"
                  type="text"
                  value={formData.workLocation}
                  onChange={readOnly ? undefined : handleChange}
                  disabled={readOnly}
                  placeholder="e.g. Home, Office, Client site"
                  className={`${INPUT_CLASS} ${
                    errors.workLocation ? "border-red-500" : ""
                  }`}
                />
                {errors.workLocation && (
                  <p className="text-xs text-red-600">{errors.workLocation}</p>
                )}
              </div>
            </div>
          </section>

          <div className="w-full border border-indigo-800/60 dark:border-indigo-900" />

          {/* D: Reason for Request */}
          <section className="flex flex-col space-y-2">
            <Label
              name="D. Reason for Request (please provide justification)"
              htmlFor="reason"
              className="text-sm font-semibold text-indigo-800 dark:text-indigo-400"
            />
            <TextArea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleTextAreaChange}
              disabled={readOnly}
              placeholder="Reason for Request"
              rows={4}
              className={`${INPUT_CLASS} ${errors.reason ? "border-red-500" : ""}`}
            />
            {errors.reason && (
              <p className="text-xs text-red-600">{errors.reason}</p>
            )}
          </section>

          <div className="w-full border border-indigo-800/60 dark:border-indigo-900" />

          {/* E: Employee Declaration */}
          <section className="flex flex-col gap-y-2">
            <h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400">
              E. Employee Declaration
            </h2>
            <div className="flex items-start gap-x-2">
              <div className="pt-0.5">
                <CheckBox
                  checked={formData.declaration}
                  onChange={
                    readOnly
                      ? undefined
                      : (value) =>
                          setData((prev) => ({ ...prev, declaration: value }))
                  }
                  disabled={readOnly}
                />
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">{DECLARATION_TEXT}</p>
            </div>
            {errors.declaration && (
              <p className="text-xs text-red-600">{errors.declaration}</p>
            )}
          </section>
        </div>

        <div className="flex justify-end mt-8">
          {!readOnly && (
            <PrimaryButton
              name="Submit"
              type="submit"
              className="border px-10 py-2 text-white rounded-md transition-all ease-in-out duration-150 text-xs text-center bg-indigo-800 hover:bg-indigo-700 cursor-pointer"
            />
          )}
        </div>
      </form>
    </>
  );
}
