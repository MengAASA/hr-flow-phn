"use client";

import { SelfForm, SelfFormData, UserType } from "@/app/types/types";
import Tabs, { TabItem } from "../ui/Tabs";
import ComboBox from "../ui/ComboBox";
import DatePicker from "../ui/DatePicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import PendingContent from "./pendingComponent/PendingContent";
import SubmissionContent from "./submissionComponent/SubmissionContent";
import HistoryContent from "./historyComponent/HistoryContent";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import ViewSubmission from "../form/ViewSubmission";
import ViewSexualHarassmentReport, { FullSexualHarassmentReport } from "../compliance/ViewSexualHarassmentReport";
import { withBasePath } from "@/lib/base-path";
import { Toaster } from "react-hot-toast";
import { FiSearch } from "react-icons/fi";

interface User {
  fullname: string;
  staffid: string;
  attachment?: string | null;
  department?: { name: string } | null;
}

interface FormType {
  name: string;
}
export interface Submission {
  id: number;
  referenceId?: string | null;
  createdBy: User;
  formType: FormType;
  formData: Record<string, unknown> | null;
  createdAt: string | Date;
}

export interface Approval {
  stepOrder: number;
  id: number;
  remarks?: string | null;
  currentLevel: number;
  totalLevel: number;
  activeLevel: number;
  approverId: number;
  status: string;
  submission?: Submission;
  approver?: {
    email: string;
    fullname: string;
    id: number;
    staffid: string;
  };
  approvedAt?: Date | null;
  updatedAt?: Date | null;
  attachment?: string | null;
}

export interface SexualHarassmentReportItem {
  id: number;
  reporterName: string;
  description: string;
  status: string;
  createdAt: string | Date;
}

interface ApprovalComponentProps {
  pendingApprovals: Approval[];
  selfForms: SelfForm[];
  user: UserType;
  sexualHarassmentReports?: SexualHarassmentReportItem[];
  sexualHarassmentReportsHistory?: SexualHarassmentReportItem[];
}

type ViewSource = "pending" | "submissions" | "history";

export default function ApprovalComponent({
  pendingApprovals,
  selfForms,
  user,
  sexualHarassmentReports = [],
  sexualHarassmentReportsHistory = [],
}: ApprovalComponentProps) {
  const [approvals, setApprovals] = useState(pendingApprovals);
  const [forms, setForms] = useState(selfForms);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedRequestor, setSelectedRequestor] = useState("");
  const [selectedFormType, setSelectedFormType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [referenceIdSearch, setReferenceIdSearch] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [viewedFormData, setViewedFormData] = useState<SelfFormData | null>(null);
  const [viewSource, setViewSource] = useState<ViewSource>("pending");
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isViewingReport, setIsViewingReport] = useState(false);
  const [viewedReport, setViewedReport] = useState<FullSexualHarassmentReport | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const approvalRoute = "/dashboard/approval";
  const approvalPagePath = withBasePath(approvalRoute);

  useEffect(() => {
    const id = searchParams.get("id");
    const shrid = searchParams.get("shrid");
    if (!id && !shrid && (pathname === approvalRoute || pathname === approvalPagePath)) {
      setIsViewing(false);
      setViewedFormData(null);
      setViewSource("pending");
      setIsNavigatingBack(false);
      setIsViewingReport(false);
      setViewedReport(null);
    }
  }, [approvalPagePath, approvalRoute, pathname, searchParams]);

  const refreshData = useCallback(async () => {
    try {
      const res = await axios.get(withBasePath("/api/approval-form/fetch"));
      if (Array.isArray(res.data?.pendingApprovals)) {
        setApprovals(res.data.pendingApprovals);
      }
      if (Array.isArray(res.data?.selfForms)) {
        setForms(
          res.data.selfForms.map((form: SelfForm) => ({
            ...form,
            approvals: form.approvals || [],
          }))
        );
      }
    } catch (error) {
      console.error("Failed to refresh approval data:", error);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleViewForm = useCallback(
    async (formId: number, formName: string, source: ViewSource) => {
      setIsNavigatingBack(false);
      setIsViewing(true);
      setViewSource(source);
      try {
        const [formRes, approvalRes] = await Promise.all([
          axios.get(withBasePath(`/api/form/${formId}`)),
          axios.get(withBasePath(`/api/get-approval/${formId}`)),
        ]);
        const formData = formRes.data;
        const approvalsWithNames = approvalRes.data.approvals;

        router.replace(`${approvalRoute}?id=${formId}&name=${formName}`);

        setViewedFormData({ ...formData, approvals: approvalsWithNames });
      } catch (error) {
        console.error(error);
      }
    },
    [approvalRoute, router],
  );

  useEffect(() => {
    if (isNavigatingBack) return;

    const id = searchParams.get("id");
    const name = searchParams.get("name");
    if (id && name && (!viewedFormData || viewedFormData.id !== Number(id))) {
      handleViewForm(Number(id), name, viewSource);
    }
  }, [handleViewForm, isNavigatingBack, searchParams, viewSource, viewedFormData]);

  const handleViewReport = useCallback(async (reportId: number) => {
    setIsNavigatingBack(false);
    setIsViewingReport(true);
    try {
      const res = await axios.get(withBasePath(`/api/compliance/sexual-harassment/${reportId}`));
      setViewedReport(res.data.data);
      router.replace(`${approvalRoute}?shrid=${reportId}&name=Sexual+Harassment+Report`);
    } catch (error) {
      console.error(error);
      setIsViewingReport(false);
    }
  }, [approvalRoute, router]);

  useEffect(() => {
    if (isNavigatingBack) return;
    const shrid = searchParams.get("shrid");
    if (shrid && (!viewedReport || viewedReport.id !== Number(shrid))) {
      handleViewReport(Number(shrid));
    }
  }, [handleViewReport, isNavigatingBack, searchParams, viewedReport]);

  const handleBack = () => {
    setIsNavigatingBack(true);
    setIsViewing(false);
    setViewedFormData(null);
    setViewSource("pending");
    router.replace(approvalRoute);
  };

  const handleBackFromReport = () => {
    setIsNavigatingBack(true);
    setIsViewingReport(false);
    setViewedReport(null);
    router.replace(approvalRoute);
  };

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
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

  const fromDate = dateFrom ? new Date(dateFrom) : null;
  const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

  const isInRange = (date: string | Date) => {
    const d = new Date(date);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  const getApprovalDepartment = (a: Approval) => a.submission?.createdBy.department?.name;
  const getApprovalRequestor = (a: Approval) => a.submission?.createdBy.fullname;
  const getApprovalFormType = (a: Approval) => a.submission?.formType.name;

  const toMenu = (values: string[]) => [
    { id: "", name: "All" },
    ...values.map((value) => ({ id: value, name: value })),
  ];

  const departmentMenu = useMemo(() => {
    const set = new Set<string>();
    (approvals || []).forEach((a) => {
      const d = getApprovalDepartment(a);
      if (d) set.add(d);
    });
    if ((forms || []).length > 0 && user.department?.name) set.add(user.department.name);
    return toMenu(Array.from(set).sort());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvals, forms, user.department?.name]);

  const requestorMenu = useMemo(() => {
    const set = new Set<string>();
    (approvals || []).forEach((a) => {
      const r = getApprovalRequestor(a);
      if (r) set.add(r);
    });
    if ((forms || []).length > 0) set.add("You");
    return toMenu(Array.from(set).sort());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvals, forms]);

  const formTypeMenu = useMemo(() => {
    const set = new Set<string>();
    (approvals || []).forEach((a) => {
      const t = getApprovalFormType(a);
      if (t) set.add(t);
    });
    (forms || []).forEach((f) => {
      if (f.formType?.name) set.add(f.formType.name);
    });
    return toMenu(Array.from(set).sort());
  }, [approvals, forms]);

  const statusMenu = useMemo(() => {
    const set = new Set<string>();
    (approvals || []).forEach((a) => {
      if (a.status) set.add(a.status);
    });
    (forms || []).forEach((f) => {
      if (f.status) set.add(f.status);
    });
    return toMenu(Array.from(set).sort());
  }, [approvals, forms]);

  const matchesSelectFilters = (
    department?: string | null,
    requestor?: string | null,
    formType?: string | null,
    status?: string | null,
    referenceId?: string | null,
  ) => {
    if (selectedDepartment && department !== selectedDepartment) return false;
    if (selectedRequestor && requestor !== selectedRequestor) return false;
    if (selectedFormType && formType !== selectedFormType) return false;
    if (selectedStatus && status !== selectedStatus) return false;
    const search = referenceIdSearch.trim().toLowerCase();
    if (search && !referenceId?.toLowerCase().includes(search)) return false;
    return true;
  };

  const filteredApprovals = (approvals || []).filter(
    (a) =>
      isInRange(a.submission?.createdAt ?? new Date()) &&
      matchesSelectFilters(
        getApprovalDepartment(a),
        getApprovalRequestor(a),
        getApprovalFormType(a),
        a.status,
        a.submission?.referenceId,
      ),
  );
  const filteredForms = (forms || []).filter(
    (f) =>
      isInRange(f.createdAt) &&
      matchesSelectFilters(
        user.department?.name,
        "You",
        f.formType?.name,
        f.status,
        f.referenceId,
      ),
  );

  const formsWithLevels = filteredForms.map((form) => {
    const approvalsList = form.approvals || [];

    const grouped = approvalsList.reduce<Record<number, Approval[]>>(
      (acc, approval) => {
        if (!acc[approval.stepOrder]) acc[approval.stepOrder] = [];
        acc[approval.stepOrder].push(approval as unknown as Approval);
        return acc;
      },
      {}
    );

    const uniqueStepOrders = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b);
    const stepOrderToLevel = new Map(
      uniqueStepOrders.map((stepOrder, index) => [stepOrder, index + 1]),
    );
    const totalLevel = uniqueStepOrders.length; // unique steps

    // Find active step: first step containing ANY PENDING approval
    const activeStep = Object.values(grouped).find((stepGroup) =>
      stepGroup.some((a) => a.status === "PENDING")
    );

    const activeLevel = activeStep
      ? (stepOrderToLevel.get(activeStep[0].stepOrder) ?? totalLevel)
      : totalLevel; // if none pending, last level is active

    return {
      ...form,
      groupedApprovals: grouped, // optional if you need grouped data
      totalLevel,
      currentLevel: activeLevel,
      activeLevel,
    };
  });

  const userPendingForms = formsWithLevels.filter(
    (f) => f.status === "PENDING"
  );
  const userFormsHistory = formsWithLevels.filter(
    (f) =>
      f.status === "APPROVED" ||
      f.status === "REJECTED" ||
      f.status === "ESCALATED"
  );

  const approvalsHistory = filteredApprovals.filter(
    (a) =>
      a.status === "APPROVED" ||
      a.status === "REJECTED" ||
      a.status === "ESCALATED"
  );

  const categories: TabItem[] = [
    {
      name: "Pending",
      content: (
        <PendingContent
          approvals={filteredApprovals}
          userPendingForms={userPendingForms}
          user={user}
          onViewForm={handleViewForm}
          onViewReport={handleViewReport}
          sexualHarassmentReports={sexualHarassmentReports}
        />
      ),
    },
    {
      name: "Submissions",
      content: (
        <SubmissionContent
          formsWithLevels={formsWithLevels}
          user={user}
          onViewForm={handleViewForm}
        />
      ),
    },
    {
      name: "History",
      content: (
        <HistoryContent
          approvalsHistory={approvalsHistory}
          userFormsHistory={userFormsHistory}
          user={user}
          onViewForm={handleViewForm}
          sexualHarassmentReports={sexualHarassmentReportsHistory}
          onViewReport={handleViewReport}
        />
      ),
    },
  ];

  const hasFilter =
    dateFrom ||
    dateTo ||
    selectedDepartment ||
    selectedRequestor ||
    selectedFormType ||
    selectedStatus ||
    referenceIdSearch;

  const inputClassName =
    "w-full text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-md py-2 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  const dateFilter = (
    <div className="flex flex-col gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Filter</span>
        {hasFilter && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setSelectedDepartment("");
              setSelectedRequestor("");
              setSelectedFormType("");
              setSelectedStatus("");
              setReferenceIdSearch("");
            }}
            className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-end flex-wrap gap-3">
        <div className="flex flex-col gap-0.5 flex-[2] min-w-[220px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 invisible">Search</label>
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
            <input
              type="text"
              value={referenceIdSearch}
              onChange={(e) => setReferenceIdSearch(e.target.value)}
              placeholder="Search reference ID..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px] max-w-xs">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
          <DatePicker
            value={dateFrom || null}
            onChange={(value) => setDateFrom(value || "")}
            placeholder="dd/mm/yyyy"
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px] max-w-xs">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
          <DatePicker
            value={dateTo || null}
            onChange={(value) => setDateTo(value || "")}
            placeholder="dd/mm/yyyy"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex items-end flex-wrap gap-3">
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Department</label>
          <ComboBox
            menu={departmentMenu}
            selectedValue={selectedDepartment}
            onSelect={(item) => setSelectedDepartment(item ? String(item.id) : "")}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Requestor</label>
          <ComboBox
            menu={requestorMenu}
            selectedValue={selectedRequestor}
            onSelect={(item) => setSelectedRequestor(item ? String(item.id) : "")}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Form Type</label>
          <ComboBox
            menu={formTypeMenu}
            selectedValue={selectedFormType}
            onSelect={(item) => setSelectedFormType(item ? String(item.id) : "")}
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <ComboBox
            menu={statusMenu}
            selectedValue={selectedStatus}
            onSelect={(item) => setSelectedStatus(item ? String(item.id) : "")}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col my-6 w-full">
      <div className="text-sm">
        <Toaster position="top-right" />
      </div>
      <AnimatePresence mode="wait">
        {isViewingReport && viewedReport ? (
          <motion.div
            key="viewing-report"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-6xl"
          >
            <ViewSexualHarassmentReport
              report={viewedReport}
              onBack={handleBackFromReport}
              onUpdate={(updated) =>
                setViewedReport((prev) => prev ? { ...prev, ...updated } : prev)
              }
            />
          </motion.div>
        ) : isViewing && viewedFormData ? (
          <motion.div
            key="viewing"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-6xl"
          >
            <ViewSubmission
              selfForm={viewedFormData}
              onBack={handleBack}
              onActionComplete={refreshData}
              allowActions={viewSource === "pending"}
            />
          </motion.div>
        ) : (
          <motion.div
            key="tabs"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <Tabs tabs={categories} filterSlot={dateFilter} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
