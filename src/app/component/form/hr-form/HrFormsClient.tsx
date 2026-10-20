"use client";

import React, { useEffect, useState } from "react";
import Card from "@/app/component/ui/Card";
import {
  HrFormComponents,
  HrFormIcons,
} from "../../../../../lib/hrformcomponents";
import PrimaryButton from "@/app/component/ui/PrimaryButton";
import axios from "axios";
import {
  Department,
  Division,
  Section,
  SelfFormData,
  User,
} from "@/app/types/types";
import { IoReturnDownBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { sanitizeName } from "../../../../../lib/utils";
import { Prisma } from "@/generated/client";
import { withBasePath } from "@/lib/base-path";

type ApprovalWithApprover = Prisma.ApprovalGetPayload<{
  include: { approver: true };
}>;


export interface DynamicFormProps {
  divisions: Division[];
  departments: Department[];
  sections: Section[];
  setSelectedDivision: React.Dispatch<React.SetStateAction<string>>;
  setSelectedDepartment: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSection: React.Dispatch<React.SetStateAction<string>>;
  setSelectedWorkLocation: React.Dispatch<React.SetStateAction<string>>;
  user: User | null;
  onSubmitSuccess?: () => void;
  formId: number | null;
  selectedDivision?: string;
  selectedDepartment?: string;
  selectedSection?: string;
  selfForm?: SelfFormData;
  readOnly?: boolean;
  fillInMode?: boolean;
  approvals?: ApprovalWithApprover[];
  isApprover?: boolean;
}

interface FlowStep {
  id: number;
  formTypeId: number;
  order: number;
  role: string;
  departmentId: number | null;
  divisionId: number | null;
  sectionId: number | null;
  createdAt: Date;
}

interface FormType {
  id: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  flowSteps: FlowStep[];
}

export default function HrFormsClient({
  forms,
  selectedId,
  selectedName,
}: {
  forms: FormType[];
  selectedId: number | null;
  selectedName: string | null;
}) {
  const [selectedFormName, setSelectedFormName] = useState<string | null>(
    selectedName,
  );
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [, setSelectedSection] = useState<string>("");
  const [, setSelectedWorkLocation] = useState<string>("");
  const [selectedFormId, setSelectedFormId] = useState<number | null>(
    selectedId,
  );
  const [user, setUser] = useState<User | null>(null);
  const { data: session } = useSession();
  const safeForms = forms ?? [];
  const router = useRouter();

  useEffect(() => {
    if (session) setUser(session.user);
  }, [session]);
  useEffect(() => {
    setSelectedFormId(selectedId);
    setSelectedFormName(selectedName);
  }, [selectedId, selectedName]);
  useEffect(() => {
    axios
      .get(withBasePath("/api/division"))
      .then((res) => setDivisions(res.data))
      .catch((err) => console.error("Failed to fetch data:", err));
  }, []);
  useEffect(() => {
    if (!selectedDivision) {
      setDepartments([]);
      setSections([]);
      return;
    }
    axios
      .get(withBasePath(`/api/department?divisionId=${selectedDivision}`))
      .then((res) => {
        setDepartments(res.data);
      })
      .catch((err) => console.error("Failed to fetch data:", err));
  }, [selectedDivision]);

  useEffect(() => {
    if (!selectedDepartment) {
      setSections([]);
      return;
    }

    axios
      .get(withBasePath(`/api/section?departmentId=${selectedDepartment}`))
      .then((res) => setSections(res.data))
      .catch((err) => console.error("Failed to fetch data:", err));
  }, [selectedDepartment]);

  const handleCardClick = (form: FormType) => {
    const sanitized = sanitizeName(form.name);
    setSelectedFormName(sanitized);
    setSelectedFormId(form.id);
    router.replace(`/dashboard/forms?id=${form.id}&name=${sanitized}`);
  };

  const handleBackClick = () => {
    setSelectedFormName(null);
    setSelectedFormId(null);
    router.replace(`/dashboard/forms`);
  };

  // const DynamicFormComponent = selectedFormName
  //   ? HrFormComponents[selectedFormName]
  //   : null;

  const DynamicFormComponent = selectedFormName
    ? HrFormComponents[sanitizeName(selectedFormName)]
    : null;

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 },
    }),
  };

  const formVariants: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    exit: { opacity: 0, x: 50, transition: { duration: 0.3, ease: "easeIn" } },
  };

  return (
    <div className="font-poppins w-full">
      <AnimatePresence mode="wait">
        {!DynamicFormComponent && (
          <motion.div
            key="form-list"
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            <div>
              <h1 className="font-bold text-3xl text-gray-900 dark:text-gray-100">HR Forms</h1>
              <p className="text-indigo-800 dark:text-indigo-400">
                Select a form to submit your request
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6"
              initial="hidden"
              animate="visible"
            >
              {safeForms.map((item, index) => {
                const sanitized = sanitizeName(item.name);
                const icon = HrFormIcons[sanitized] || HrFormIcons.default;
                return (
                  <motion.div
                    key={item.id}
                    custom={index}
                    variants={cardVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Card
                      formId={item.id}
                      title={item.name}
                      description={item.description ?? ""}
                      approvals={item.flowSteps.length}
                      onClick={() => handleCardClick(item)}
                      icon={icon}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}

        {DynamicFormComponent && (
          <motion.div
            key="dynamic-form"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <PrimaryButton
              name="Back"
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-xs rounded-md font-medium text-gray-700 dark:text-gray-300
                        bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-xs hover:bg-gray-100 dark:hover:bg-gray-800
                        hover:shadow-md transition-all duration-200 active:scale-95 mb-6 cursor-pointer"
              onClick={handleBackClick}
              icon={<IoReturnDownBack className="w-5 h-5" />}
            />
            <DynamicFormComponent
              formId={selectedFormId}
              divisions={divisions}
              departments={departments}
              sections={sections}
              setSelectedDivision={setSelectedDivision}
              setSelectedDepartment={setSelectedDepartment}
              setSelectedSection={setSelectedSection}
              setSelectedWorkLocation={setSelectedWorkLocation}
              user={user}
              onSubmitSuccess={() => setSelectedFormName(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
