"use client";

import React, { useEffect, useState } from "react";
import { TabItem } from "../ui/Tabs";
import UserListing from "./user/UserListing";
import {
  Department,
  Division,
  Section,
  SelfFormData,
  UserType,
} from "@/app/types/types";
import axios from "axios";
import FormTypeComponent from "./form-type/FormTypeComponent";
import { FormType } from "@/generated/client";
import dynamic from "next/dynamic";
import ApprovalFlow, { ApprovalFlowStep } from "./approval/ApprovalFlow";
import { motion, Variants } from "framer-motion";
import FormSubmission from "./form-submission/FormSubmission";
import OrgStructure from "./org-structure/OrgStructure";
import { withBasePath } from "@/lib/base-path";

const Tabs = dynamic(() => import("../ui/Tabs"), { ssr: false });

export interface AdminSHRItem {
  id: number;
  reporterName: string;
  status: string;
  createdAt: string;
}

interface AdminComponentProps {
  userListing: UserType[];
  formType: FormType[];
  approvalStep: ApprovalFlowStep[];
  formSubmission: SelfFormData[];
  isFullAdmin?: boolean;
}

export default function AdminComponent({
  userListing,
  formType,
  approvalStep,
  formSubmission,
  isFullAdmin = false,
}: AdminComponentProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const fetchDivisions = () => {
    axios
      .get(withBasePath("/api/division"))
      .then((res) => setDivisions(res.data))
      .catch((err) => console.error("Failed to fetch data:", err));
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  useEffect(() => {
    if (selectedDivision) {
      axios
        .get(withBasePath(`/api/department?divisionId=${selectedDivision}`))
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error("Failed to fetch data:", err));
    } else {
      setDepartments([]);
      setSections([]);
    }
  }, [selectedDivision]);

  useEffect(() => {
    if (selectedDepartment) {
      axios
        .get(withBasePath(`/api/section?departmentId=${selectedDepartment}`))
        .then((res) => setSections(res.data))
        .catch((err) => console.error("Failed to fetch data:", err));
    } else {
      setSections([]);
    }
  }, [selectedDepartment]);

  // Motion variants for tab content
  const tabContentVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  // Form Create, Approval Flow and Organisation Structure reconfigure the whole
  // organisation, so only a full admin gets them. Every other admin role lands
  // on the User Listing and Form Submission tabs, both read-only.
  const orgWideTabs = !isFullAdmin ? [] : ([
    {
      name: "Form Create",
      content: (
        <motion.div key="form-create" initial="hidden" animate="visible" variants={tabContentVariants}>
          <FormTypeComponent formType={formType} />
        </motion.div>
      ),
    },
    {
      name: "Approval Flow",
      content: (
        <motion.div key="approval-flow" initial="hidden" animate="visible" variants={tabContentVariants}>
          <ApprovalFlow
            approvalStep={approvalStep}
            formType={formType}
            divisions={divisions}
            departments={departments}
            sections={sections}
            setSelectedDivision={setSelectedDivision}
            setSelectedDepartment={setSelectedDepartment}
          />
        </motion.div>
      ),
    },
    {
      name: "Organisation Structure",
      content: (
        <motion.div key="org-structure" initial="hidden" animate="visible" variants={tabContentVariants}>
          <OrgStructure onDivisionsChange={fetchDivisions} />
        </motion.div>
      ),
    },
  ] as TabItem[]);

  const categories: TabItem[] = [
    ...orgWideTabs,
    {
      name: "User Listing",
      content: (
        <motion.div key="user-listing" initial="hidden" animate="visible" variants={tabContentVariants}>
          <UserListing
            userListing={userListing}
            divisions={divisions}
            departments={departments}
            sections={sections}
            formTypes={formType}
            readOnly={!isFullAdmin}
            setSelectedDivision={setSelectedDivision}
            setSelectedDepartment={setSelectedDepartment}
          />
        </motion.div>
      ),
    },
    {
      name: "Form Submission",
      content: (
        <motion.div key="form-submission" initial="hidden" animate="visible" variants={tabContentVariants}>
          <FormSubmission formSubmission={formSubmission} />
        </motion.div>
      ),
    },
  ];

  return (
    <div className="my-6">
      <Tabs tabs={categories} />
    </div>
  );
}
