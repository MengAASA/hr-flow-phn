"use client";

import React, { useEffect, useState } from "react";
import Dropdown from "../../ui/Dropdown";
import {
  categoryManPower,
  designation,
  reportingToOptions,
  workLocation,
} from "../../../../../lib/data";
import { Input } from "../../ui/Input";
import Label from "../../ui/Label";
import DatePicker, { DateValueType } from "../../ui/DatePicker";
import ComboBox from "../../ui/ComboBox";
import { DynamicFormProps } from "./HrFormsClient";
import { ManPowerTypes, UserInfo } from "@/app/types/types";
import CheckBox from "../../ui/CheckBox";
import PrimaryButton from "../../ui/PrimaryButton";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import LoadingScreen from "../../ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { TextArea } from "../../ui/TextArea";
import { withBasePath } from "@/lib/base-path";
import { formatFileSize, MAX_FORM_ATTACHMENT_BYTES } from "@/lib/uploadLimits";

export type ReasonKey = Extract<
  keyof ManPowerTypes,
  "productionVolumeIncrease" | "newProject" | "machineFaulty" | "other"
>;

export default function ManPower({
  divisions,
  departments,
  sections,
  setSelectedDivision,
  setSelectedDepartment,
  setSelectedSection,
  setSelectedWorkLocation,
  user,
  onSubmitSuccess,
  formId,
  selfForm,
  readOnly = false,
}: DynamicFormProps & { readOnly?: boolean }) {
  const [data, setData] = useState<ManPowerTypes>({
    category: null,
    createddate: null,
    lastWorkingDay: null,
    dateRequested: null,
    dateRecommended: null,
    dateReviewed: null,
    dateVerified: null,
    dateApproved: null,
    division: "",
    department: "",
    section: "",
    designation: "",
    reportingTo: "",
    noRequested: "",
    currentHeadCount: "",
    approvedRequirement: "",
    workLocation: "",
    workStation: "",
    employmentType: "",
    manpowerPlan: "",
    approvedAmp: "",
    keyRequirement: "",
    keyResponsibilities: "",
    reasonOfRequisition: "",
    selectedOption: "",
    incumbentName: "",
    productionVolumeIncrease: "",
    newProject: "",
    machineFaulty: "",
    other: "",
    requestedBy: "",
    recommendedBy: "",
    reviewedBy: "",
    verifiedBy: "",
    approvedby: "",
    fileAttachment: null,
    remarks: "",
    selectedReasons: [] as ReasonKey[],
  });
  // const [formId, setFormId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    dateOfSubmission?: string;
    category?: string;
    designation?: string;
    additionalReason?: string;
    selectedOption?: string;
    fileAttachment?: string;
  }>({});
  const [userInfo, setUserInfo] = useState<UserInfo>();
  // const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();

  const validateFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) {
      return "File Attachment is required!";
    }

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_FORM_ATTACHMENT_BYTES) {
      return `Total attachment size must be ${formatFileSize(
        MAX_FORM_ATTACHMENT_BYTES,
      )} or less. Current selection is ${formatFileSize(totalSize)}.`;
    }

    return null;
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    const staffid = user.staffid;

    if (!staffid) {
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(withBasePath(`/api/user/${staffid}`));
        const userInfo = res.data.data;
        setUserInfo(userInfo);
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

  useEffect(() => {
    if (readOnly) return;
    if (!userInfo) return;

    setData((prev) => ({
      ...prev,
      division: userInfo.divisionId ? userInfo.divisionId.toString() : "",
      department: userInfo.departmentId ? userInfo.departmentId.toString() : "",
      section: userInfo.sectionId ? userInfo.sectionId.toString() : "",
      workLocation: userInfo.workLocation
        ? userInfo.workLocation.toString()
        : "",
    }));

    if (userInfo.divisionId)
      setSelectedDivision(userInfo.divisionId.toString());
    if (userInfo.departmentId)
      setSelectedDepartment(userInfo.departmentId.toString());
    if (userInfo.sectionId) setSelectedSection(userInfo.sectionId.toString());
    if (userInfo.workLocation)
      setSelectedWorkLocation(userInfo.workLocation.toString());
  }, [
    userInfo,
    readOnly, // ✅ add this
    setSelectedDivision,
    setSelectedDepartment,
    setSelectedSection,
    setSelectedWorkLocation,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange =
    (field: keyof typeof data) => (val: DateValueType) => {
      setData((prev) => ({ ...prev, [field]: val }));
    };

  const handleMainCheck = () => {
    setData((prev) => ({
      ...prev,
      selectedOption: prev.selectedOption === "additional" ? "" : "additional",
      selectedReasons: [],
    }));
  };

  const handleReasonCheck = (reason: ReasonKey) => {
    setData((prev) => {
      const isSelected = prev.selectedReasons.includes(reason);
      const updated = isSelected
        ? prev.selectedReasons.filter((r) => r !== reason)
        : [...prev.selectedReasons, reason];

      return { ...prev, selectedReasons: updated };
    });
  };

  const reasonOptions: { key: ReasonKey; label: string }[] = [
    {
      key: "productionVolumeIncrease",
      label: "Production Volume Increase (Item)",
    },
    { key: "newProject", label: "New Project" },
    { key: "machineFaulty", label: "Machine Faulty" },
    { key: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formId) {
      return;
    }

    const newErrors: {
      dateOfSubmission?: string;
      category?: string;
      fileAttachment?: string;
      designation?: string;
      additionalReason?: string;
      selectedOption?: string;
    } = {};

    if (!data.createddate) {
      newErrors.dateOfSubmission = "Date Of Submission is required";
      toast.error("Date Of Submission is required");
    }

    if (!data.category) {
      newErrors.category = "Category is required";
      toast.error("Category is required!");
    }

    if (!data.designation) {
      newErrors.designation = "Designation is required";
      toast.error("Designation is required!");
    }

    if (!data.selectedOption) {
      newErrors.selectedOption = "Please select the reason of requisition!";
      toast.error("Please select the reason of requisition!");
    }

    if (data.selectedOption === "additional") {
      if (!data.selectedReasons || data.selectedReasons.length === 0) {
        newErrors.additionalReason =
          "Please select at least one reason for Additional request!";
        toast.error(
          "Please select at least one reason for Additional request!",
        );
      }

      const emptyReason = data.selectedReasons.find((key: ReasonKey) => {
        const value = data[key];
        return !value || value.trim() === "";
      });

      if (emptyReason) {
        newErrors.additionalReason =
          "Please fill in the selected reason details!";
        toast.error("Please fill in the selected reason details.");
      }
    }

    const fileValidationError = validateFiles(files);
    if (fileValidationError) {
      newErrors.fileAttachment = fileValidationError;
      toast.error(fileValidationError);
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return; // stop submission

    setLoading(true);
    const formData = new FormData();
    formData.append("formId", formId.toString());
    formData.append("user", JSON.stringify(user));
    const submissionData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== "fileAttachment"),
    );
    formData.append("data", JSON.stringify(submissionData));
    files.forEach((f) => {
      formData.append("fileAttachment", f);
    });
    const toastId = "";

    try {
      await axios.post(withBasePath("/api/form"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Form submitted successfully!", { toasterId: toastId });
      setTimeout(() => {
        router.replace("/dashboard/forms");
        onSubmitSuccess?.();
      }, 1200);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.error ||
          error.message ||
          "Something went wrong",
          { toasterId: toastId },
        );
      } else if (error instanceof Error) {
        toast.error(error.message, { toasterId: toastId });
      } else {
        toast.error("An unexpected error occurred", { toasterId: toastId });
      }
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

  const fileData = selfForm?.attachments;
  // const parsedData = selfForm?.formData as unknown as ManPowerTypes;

  const parsedData: ManPowerTypes = {
    ...(selfForm?.formData as unknown as ManPowerTypes),
    divisionName: selfForm?.divisionName,
    departmentName: selfForm?.departmentName,
    sectionName: selfForm?.sectionName,
  };

  const formData = readOnly && parsedData ? parsedData : data;

  const isAdditionalSelected = readOnly
    ? parsedData?.selectedOption === "additional"
    : data.selectedOption === "additional";

  const downloadDocument = (fileName: string) => {
    if (!fileName) return;

    const url = withBasePath(`/api/uploads/${encodeURIComponent(fileName)}`);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <>
      <div className="text-xs">
        <Toaster position="top-right" />
      </div>

      <LoadingScreen show={loading} />
      <form
        action=""
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-gray-900 max-w-6xl rounded-xl ${readOnly ? "p-0" : "p-4 border border-gray-300 dark:border-gray-700 "
          }`}
      >
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {readOnly ? "" : "Man Power Requisition"}
          </h1>
          <p className="text-sm text-indigo-800 dark:text-indigo-400">
            {readOnly ? "" : "Fill in the details below to submit your request"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 my-10 md:my-0">
          <div className="flex justify-end">
            <div className="flex flex-col">
              <Dropdown
                title="Category"
                menu={categoryManPower}
                className={`w-40 ${errors.category ? "border border-red-500 rounded-md" : ""
                  }`}
                selected={
                  readOnly ? parsedData?.category?.name : data.category?.name
                }
                onSelect={(item) => {
                  setData((prev) => ({ ...prev, category: item }));
                  setErrors((prev) => ({ ...prev, category: undefined })); // clear error
                }}
                disabled={readOnly}
              />
              {errors.category && (
                <p className="text-xs text-red-600 mt-1">{errors.category}</p>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-y-6">
              <div className="flex flex-col space-y-2">
                <Label
                  name="Date of Submission"
                  htmlFor="createddate"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <DatePicker
                  value={readOnly ? parsedData?.createddate : data.createddate}
                  // onChange={handleDateChange("createddate")}
                  onChange={
                    readOnly ? () => { } : handleDateChange("createddate")
                  }
                  disabled={readOnly}
                  className={`w-full border ${errors.dateOfSubmission
                    ? "border border-red-500 rounded-md"
                    : ""
                    } border-gray-300 dark:border-gray-600  rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Division"
                  htmlFor="division"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={divisions}
                  selectedValue={
                    readOnly
                      ? (parsedData?.divisionName ?? parsedData?.division ?? "")
                      : data.division
                  }
                  onSelect={(item) => {
                    const value = item ? item.id.toString() : "";
                    setSelectedDivision(value);
                    setSelectedDepartment("");
                    setSelectedSection("");
                    setData((prev) => ({
                      ...prev,
                      division: value,
                      department: "",
                      section: "",
                    }));
                  }}
                  disabled={readOnly}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Department"
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={addDashOption(departments)}
                  selectedValue={
                    formData?.departmentName ?? formData.department ?? ""
                  } // ✅ controlled
                  onSelect={(item) => {
                    const value =
                      item && item.name !== "-" ? item.id.toString() : "";
                    setSelectedDepartment(value);
                    setSelectedSection("");
                    setData((prev) => ({
                      ...prev,
                      department: value,
                      section: "",
                    }));
                  }}
                  disabled={readOnly}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Section"
                  htmlFor="section"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={addDashOption(sections)}
                  selectedValue={
                    formData?.sectionName ?? formData.section ?? ""
                  }
                  onSelect={(item) => {
                    const value =
                      item && item.name !== "-" ? item.id.toString() : "";
                    setSelectedSection(value);
                    setData((prev) => ({ ...prev, section: value }));
                  }}
                  disabled={readOnly}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Designation"
                  htmlFor="designation"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={designation}
                  selectedValue={
                    parsedData?.designation ?? data.designation ?? ""
                  }
                  onSelect={(item) => {
                    const value = item ? item.name : "";
                    setData((prev) => ({ ...prev, designation: value }));
                  }}
                  disabled={readOnly}
                  className={`${errors.designation
                    ? "border border-red-500"
                    : "border-gray-300"
                    } `}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label
                  name="Reporting To"
                  htmlFor="reportingTo"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={reportingToOptions}
                  selectedValue={
                    parsedData?.reportingTo ?? data.reportingTo ?? ""
                  }
                  onSelect={(item) => {
                    const value = item ? item.name : "";
                    setData((prev) => ({ ...prev, reportingTo: value }));
                  }}
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="flex flex-col gap-y-6">
              <div className="flex flex-col space-y-2">
                <Label
                  name="No Requested"
                  htmlFor="noRequested"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <Input
                  id="noRequested"
                  name="noRequested"
                  type="text"
                  value={readOnly ? parsedData?.noRequested : data.noRequested}
                  disabled={readOnly}
                  onChange={readOnly ? () => { } : handleChange}
                  placeholder="No Requested"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 flex flex-col space-y-2">
                  <Label
                    name="Current Headcount"
                    htmlFor="currentHeadCount"
                    className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                  />
                  <Input
                    id="currentHeadCount"
                    name="currentHeadCount"
                    type="text"
                    value={
                      readOnly
                        ? parsedData?.currentHeadCount
                        : data.currentHeadCount
                    }
                    onChange={readOnly ? () => { } : handleChange}
                    disabled={readOnly}
                    placeholder="Current Headcount"
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-gray-500 dark:text-gray-400 mt-6">/</span>{" "}
                {/* The slash in the middle */}
                <div className="flex-1 flex flex-col space-y-2">
                  <Label
                    name="Approved Requirement"
                    htmlFor="approvedRequirement"
                    className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                  />
                  <Input
                    id="approvedRequirement"
                    name="approvedRequirement"
                    type="text"
                    value={
                      readOnly
                        ? parsedData?.approvedRequirement
                        : data.approvedRequirement
                    }
                    onChange={readOnly ? () => { } : handleChange}
                    disabled={readOnly}
                    placeholder="Approved Requirement"
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Label
                  name="Work Location"
                  htmlFor="workLocation"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <ComboBox
                  menu={workLocation}
                  // selectedValue={data.workLocation}
                  selectedValue={
                    parsedData?.workLocation ?? data.workLocation ?? ""
                  }
                  onSelect={(item) => {
                    const value = item ? item.name : "";
                    setSelectedWorkLocation(value);
                    setData((prev) => ({ ...prev, workLocation: value }));
                  }}
                  disabled={readOnly}
                />
              </div>
              <div className="flex flex-col space-y-3 my-1">
                <Label
                  name="Workstation Availability"
                  htmlFor=""
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <div className="flex items-center gap-x-4">
                  <div
                    className="flex items-center gap-x-2 cursor-pointer"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        workStation: prev.workStation === "Yes" ? "" : "Yes",
                      }))
                    }
                  >
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.workStation === "Yes"
                          : data.workStation === "Yes"
                      }
                      // onChange={() =>
                      //   setData((prev) => ({
                      //     ...prev,
                      //     workStation: prev.workStation === "Yes" ? "" : "Yes",
                      //   }))
                      // }
                      disabled={readOnly}
                    />
                    <Label
                      name="Yes"
                      htmlFor=""
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    />
                  </div>
                  <div
                    className="flex items-center gap-x-2"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        workStation: prev.workStation === "No" ? "" : "No",
                      }))
                    }
                  >
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.workStation === "No"
                          : data.workStation === "No"
                      }
                      // onChange={() =>
                      //   setData((prev) => ({
                      //     ...prev,
                      //     workStation: prev.workStation === "No" ? "" : "No",
                      //   }))
                      // }
                      disabled={readOnly}
                    />
                    <Label
                      name="No"
                      htmlFor=""
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-3 my-1">
                <Label
                  name="Employment Type"
                  htmlFor=""
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <div className="flex items-center gap-x-4">
                  <div
                    className="flex items-center gap-x-2"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        employmentType:
                          prev.employmentType === "Permanent"
                            ? ""
                            : "Permanent",
                      }))
                    }
                  >
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.employmentType === "Permanent"
                          : data.employmentType === "Permanent"
                      }
                      // onChange={() =>
                      //   setData((prev) => ({
                      //     ...prev,
                      //     employmentType:
                      //       prev.employmentType === "Permanent"
                      //         ? ""
                      //         : "Permanent",
                      //   }))
                      // }
                      disabled={readOnly}
                    />
                    <Label
                      name="Permanent"
                      htmlFor=""
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    />
                  </div>
                  <div
                    className="flex items-center gap-x-2"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        employmentType:
                          prev.employmentType === "Contract" ? "" : "Contract",
                      }))
                    }
                  >
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.employmentType === "Contract"
                          : data.employmentType === "Contract"
                      }
                      // onChange={() =>
                      //   setData((prev) => ({
                      //     ...prev,
                      //     employmentType:
                      //       prev.employmentType === "Contract"
                      //         ? ""
                      //         : "Contract",
                      //   }))
                      // }
                      disabled={readOnly}
                    />
                    <Label
                      name="Contract"
                      htmlFor=""
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-3 my-1">
                <Label
                  name="Manpower Plan"
                  htmlFor=""
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 "
                />
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className="flex items-center gap-x-2"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        manpowerPlan:
                          prev.manpowerPlan === "Budgeted" ? "" : "Budgeted",
                      }))
                    }
                  >
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.manpowerPlan === "Budgeted"
                          : data.manpowerPlan === "Budgeted"
                      }
                      // onChange={() =>
                      //   setData((prev) => ({
                      //     ...prev,
                      //     manpowerPlan:
                      //       prev.manpowerPlan === "Budgeted" ? "" : "Budgeted",
                      //   }))
                      // }
                      disabled={readOnly}
                    />
                    <Label
                      name="Budgeted"
                      htmlFor=""
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    />
                  </div>
                  <div
                    className="flex items-center gap-x-2"
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        manpowerPlan:
                          prev.manpowerPlan === "Non-Budgeted"
                            ? ""
                            : "Non-Budgeted",
                      }))
                    }
                  >
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.manpowerPlan === "Non-Budgeted"
                          : data.manpowerPlan === "Non-Budgeted"
                      }
                      // onChange={() =>
                      //   setData((prev) => ({
                      //     ...prev,
                      //     manpowerPlan:
                      //       prev.manpowerPlan === "Non-Budgeted"
                      //         ? ""
                      //         : "Non-Budgeted",
                      //   }))
                      // }
                      disabled={readOnly}
                    />
                    <Label
                      name="Non-Budgeted"
                      htmlFor=""
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* <div className="flex flex-col space-y-2">
                <Label
                  name="Approved AMP"
                  htmlFor="approvedAmp"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <Input
                  id="approvedAmp"
                  name="approvedAmp"
                  type="text"
                  value={readOnly ? parsedData.approvedAmp : data.approvedAmp}
                  onChange={readOnly ? () => {} : handleChange}
                  disabled={readOnly}
                  placeholder="Approved AMP"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div> */}
            </div>
          </div>

          <div className="w-full border border-indigo-800/60 dark:border-indigo-900 my-2"></div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex-1 flex flex-col space-y-2">
              <Label
                name="Key Requirements"
                htmlFor="keyRequirement"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              />
              <TextArea
                id="keyRequirement"
                name="keyRequirement"
                value={
                  readOnly ? parsedData.keyRequirement : data.keyRequirement
                }
                onChange={handleTextAreaChange}
                disabled={readOnly}
                placeholder="Key Requirement"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <Label
                name="Key Responsibility"
                htmlFor="keyResponsibilities"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              />
              <TextArea
                id="keyRequirement"
                name="keyResponsibilities"
                value={
                  readOnly
                    ? parsedData.keyResponsibilities
                    : data.keyResponsibilities
                }
                onChange={handleTextAreaChange}
                disabled={readOnly}
                placeholder="Key Responsibilities"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <Label
                name="Reason of Requisition"
                htmlFor="reasonOfRequisition"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              />

              <div className="grid grid-cols-2 gap-6 my-4 border-2 p-4 rounded-lg shadow-lg border-indigo-800/60 dark:border-indigo-900">
                <div>
                  <div className="flex flex-col ">
                    <div className="flex items-center gap-x-2">
                      <CheckBox
                        checked={
                          readOnly
                            ? parsedData.selectedOption === "replacement"
                            : data.selectedOption === "replacement"
                        }
                        onChange={() =>
                          setData((prev) => ({
                            ...prev,
                            selectedOption:
                              prev.selectedOption === "replacement"
                                ? ""
                                : "replacement",
                            // reset dependent fields if unselected
                            incumbentName:
                              prev.selectedOption === "replacement"
                                ? ""
                                : prev.incumbentName,
                            lastWorkingDay:
                              prev.selectedOption === "replacement"
                                ? null
                                : prev.lastWorkingDay,
                          }))
                        }
                        disabled={readOnly}
                      />
                      <Label
                        name="Replacement"
                        htmlFor="replacement"
                        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <p className="text-xs ml-8">
                      (Please provide copy of resignation details for
                      replacement hiring)
                    </p>
                  </div>

                  <div className="flex flex-col gap-6 my-6">
                    <div className="flex-1 flex flex-col space-y-2">
                      <Label
                        name="Incumbent Name"
                        htmlFor="incumbentName"
                        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                      />
                      <Input
                        id="incumbentName"
                        name="incumbentName"
                        type="text"
                        value={
                          readOnly
                            ? parsedData.incumbentName
                            : data.incumbentName
                        }
                        onChange={readOnly ? () => { } : handleChange}
                        placeholder="Incumbent Name"
                        required
                        disabled={
                          readOnly
                            ? parsedData.selectedOption !== "replacement"
                            : data.selectedOption !== "replacement"
                        } // only editable if Replacement is selected
                        className={`w-full border rounded-md py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500
                                ${(readOnly
                            ? parsedData.selectedOption !==
                            "replacement"
                            : data.selectedOption !== "replacement")
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          }`}
                      />
                    </div>
                    <div className="flex-1 flex flex-col space-y-2">
                      <Label
                        name="Last Working Day"
                        htmlFor="lastWorkingDay"
                        className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                      />
                      <DatePicker
                        value={
                          readOnly
                            ? parsedData.lastWorkingDay
                            : data.lastWorkingDay
                        }
                        onChange={
                          readOnly ? () => { } : handleDateChange("lastWorkingDay")
                        }
                        disabled={
                          readOnly
                            ? parsedData.selectedOption !== "replacement"
                            : data.selectedOption !== "replacement"
                        }
                        className={`w-full border rounded-md py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500
                                ${(readOnly
                            ? parsedData.selectedOption !==
                            "replacement"
                            : data.selectedOption !== "replacement")
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                          }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  {/* Main Checkbox */}
                  <div className="flex items-center gap-x-2">
                    <CheckBox
                      checked={
                        readOnly
                          ? parsedData.selectedOption === "additional"
                          : data.selectedOption === "additional"
                      }
                      onChange={readOnly ? undefined : handleMainCheck}
                      disabled={readOnly}
                    />
                    <Label
                      name="Additional"
                      htmlFor="additional"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <p className="text-xs ml-8">
                    (Please provide justification for additional manpower
                    request)
                  </p>

                  {isAdditionalSelected && (
                    <div className="flex flex-col gap-6 my-6 ml-6">
                      {(readOnly
                        ? reasonOptions.filter(
                          (reason) =>
                            parsedData?.[
                            reason.key as keyof ManPowerTypes
                            ] !== undefined &&
                            parsedData?.[
                            reason.key as keyof ManPowerTypes
                            ] !== "",
                        )
                        : reasonOptions
                      ).map((reason) => {
                        const isChecked = data.selectedReasons.includes(
                          reason.key,
                        );
                        const value = data[reason.key];

                        return (
                          <div key={reason.key} className="flex flex-col gap-2">
                            <div className="flex items-center gap-x-2">
                              <CheckBox
                                checked={
                                  readOnly
                                    ? (parsedData?.selectedReasons?.includes(
                                      reason.key,
                                    ) ?? false)
                                    : isChecked
                                }
                                onChange={() => handleReasonCheck(reason.key)}
                                disabled={readOnly}
                              />
                              <Label
                                name={reason.label}
                                htmlFor={reason.key}
                                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                              />
                            </div>

                            <Input
                              id={reason.key}
                              name={reason.key}
                              type="text"
                              value={
                                readOnly
                                  ? (parsedData?.[reason.key] as string) || ""
                                  : value
                              }
                              onChange={readOnly ? undefined : handleChange}
                              placeholder={reason.label}
                              required={isChecked}
                              disabled={readOnly || !isChecked}
                              className={`w-full border rounded-md py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${readOnly || !isChecked
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.additionalReason && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.additionalReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full flex flex-col space-y-2 mt-4 mb-6">
                <Label
                  name={`File Attachment (Please attach Department Orga Chart, Job Description and Resignation info for replacement request)`}
                  htmlFor="fileAttachment"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                />

                <label
                  htmlFor="fileAttachment"
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-xs transition cursor-pointer
                  ${readOnly
                      ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-800 dark:hover:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-400"
                    } ${errors.fileAttachment ? "border-red-500" : ""}`}
                >
                  <span className="truncate">
                    {files.length > 0
                      ? `${files.length} file(s) attached — click to add another`
                      : "Choose a file or drag & drop"}
                  </span>
                  <span
                    className={`ml-2 rounded px-3 py-1 text-xs font-medium text-white ${readOnly ? "bg-gray-400" : "bg-indigo-800"
                      }`}
                  >
                    Browse
                  </span>
                  <input
                    id="fileAttachment"
                    type="file"
                    name="fileAttachment"
                    className="hidden"
                    onChange={(e) => {
                      const newFile = e.target.files?.[0];
                      if (!newFile) return;

                      const combinedFiles = [...files, newFile];
                      const validationError = validateFiles(combinedFiles);

                      if (validationError) {
                        setErrors((prev) => ({
                          ...prev,
                          fileAttachment: validationError,
                        }));
                        toast.error(validationError);
                        e.target.value = "";
                        return;
                      }

                      setFiles(combinedFiles);
                      setErrors((prev) => ({
                        ...prev,
                        fileAttachment: undefined,
                      }));

                      setData((prev) => ({
                        ...prev,
                        fileAttachment: combinedFiles,
                      }));
                      e.target.value = "";
                    }}
                    disabled={readOnly}
                  />
                </label>

                {files.length > 0 && (
                  <div className="mt-1 w-full rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-0.5">
                        <p className="truncate">📎 {f.name}</p>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedFiles = files.filter((_, idx) => idx !== i);
                              setFiles(updatedFiles);
                              setData((prev) => ({
                                ...prev,
                                fileAttachment: updatedFiles.length > 0 ? updatedFiles : null,
                              }));
                            }}
                            className="ml-2 shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!readOnly && (
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Please keep the total attachment size at or below{" "}
                    {formatFileSize(MAX_FORM_ATTACHMENT_BYTES)} to avoid upload
                    errors such as request size limit issues.
                  </p>
                )}

                {errors.fileAttachment && (
                  <p className="text-xs text-red-600">{errors.fileAttachment}</p>
                )}

                {selfForm && fileData ? (
                  fileData.map((item, i) => (
                    <p
                      key={i}
                      onClick={() => downloadDocument(item.fileName)}
                      className="mt-1 block w-full cursor-pointer rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-400 transition"
                    >
                      📎 <strong>Download:</strong> {item.fileName}
                    </p>
                  ))
                ) : (
                  <p>{fileData?.map((item) => item.fileName)}</p>
                )}
              </div>
              <div className="flex-1 flex flex-col space-y-2 mb-6">
                <Label
                  name="Remarks"
                  htmlFor="remarks"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                />
                <TextArea
                  id="remarks"
                  name="remarks"
                  value={readOnly ? parsedData.remarks : data.remarks}
                  onChange={handleTextAreaChange}
                  disabled={readOnly}
                  placeholder="Remarks"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          {!readOnly ? (
            <PrimaryButton
              name="Submit"
              type="submit"
              disabled={readOnly}
              className={`border px-10  py-2 text-white rounded-md  transition-all ease-in-out duration-150   text-xs text-center ${readOnly
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-800 hover:bg-indigo-700 cursor-pointer"
                }`}
            />
          ) : (
            <></>
          )}
        </div>
      </form>
    </>
  );
}
