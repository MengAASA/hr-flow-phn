import React from "react";
import BannerTableRow from "../../ui/BannerTableRow";
import ApprovalTable from "../../ui/ApprovalTable";
import { Approval, SexualHarassmentReportItem } from "../ApprovalComponent";
import { SelfForm, UserType } from "@/app/types/types";
import SexualHarassmentReportsTable from "../SexualHarassmentReportsTable";
import { getApprovalActionDate, getLastApprovalDate } from "../approvalDateUtils";

interface HistoryContentProps {
  approvalsHistory: Approval[];
  userFormsHistory: SelfForm[];
  user: UserType;
  onViewForm: (formId: number, formName: string, source: "history") => void;
  sexualHarassmentReports?: SexualHarassmentReportItem[];
  onViewReport?: (reportId: number) => void;
}

// Define a unified item type for pagination
type HistoryItem =
  | { type: "approval"; data: Approval }
  | { type: "form"; data: SelfForm };

// Date the item was actually resolved (approved/rejected), falling back to
// when it was submitted if no resolution date is available.
const getHistoryDate = (item: HistoryItem): string | Date | null | undefined => {
  if (item.type === "approval") {
    return getApprovalActionDate(item.data) ?? item.data.submission?.createdAt;
  }
  return getLastApprovalDate(item.data.approvals) ?? item.data.createdAt;
};

export default function HistoryContent({
  approvalsHistory,
  userFormsHistory,
  user,
  onViewForm,
  sexualHarassmentReports = [],
  onViewReport,
}: HistoryContentProps) {
  const historyItems: HistoryItem[] = [
    ...approvalsHistory.map((approval) => ({
      type: "approval" as const,
      data: approval,
    })),
    ...userFormsHistory.map((form) => ({
      type: "form" as const,
      data: form,
    })),
  ].sort((a, b) => {
    const dateA = getHistoryDate(a);
    const dateB = getHistoryDate(b);
    const timeA = dateA ? new Date(dateA).getTime() : 0;
    const timeB = dateB ? new Date(dateB).getTime() : 0;
    return timeB - timeA;
  });

  const hasItems = historyItems.length > 0 || sexualHarassmentReports.length > 0;

  if (!hasItems) {
    return <p className="text-gray-600 dark:text-gray-400">No history found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {historyItems.length > 0 && (
        <ApprovalTable
          items={historyItems}
          pageSize={20}
          columns={[
            {
              label: "Reference ID",
              sortAccessor: (item) =>
                item.type === "approval" ? item.data.submission?.referenceId : item.data.referenceId,
            },
            {
              label: "Department",
              sortAccessor: (item) =>
                item.type === "approval"
                  ? item.data.submission?.createdBy.department?.name
                  : user.department?.name,
            },
            {
              label: "Requester",
              sortAccessor: (item) =>
                item.type === "approval" ? item.data.submission?.createdBy.fullname : "You",
            },
            {
              label: "Date",
              sortAccessor: (item) =>
                item.type === "approval" ? item.data.submission?.createdAt : item.data.createdAt,
            },
            { label: "Status", sortAccessor: (item) => item.data.status },
            {
              label: "Form Type",
              sortAccessor: (item) =>
                item.type === "approval" ? item.data.submission?.formType.name : item.data.formType.name,
            },
            {
              label: "Last Approval Date",
              sortAccessor: (item) =>
                item.type === "approval"
                  ? getApprovalActionDate(item.data)
                  : getLastApprovalDate(item.data.approvals),
            },
          ]}
          emptyMessage="No history found."
          renderRow={(item) => {
            if (item.type === "approval") {
              const approval = item.data;
              const submission = approval.submission;

              if (!submission) return null;

              return (
                <BannerTableRow
                  key={`approval-history-${approval.id}`}
                  referenceId={submission.referenceId}
                  profileImg={submission.createdBy.attachment || ""}
                  title={submission.formType.name}
                  name={submission.createdBy.fullname}
                  department={submission.createdBy.department?.name}
                  createddate={submission.createdAt}
                  lastApprovalDate={getApprovalActionDate(approval)}
                  status={approval.status}
                  onClick={() =>
                    onViewForm(submission.id, submission.formType.name, "history")
                  }
                />
              );
            } else {
              const form = item.data;
              return (
                <BannerTableRow
                  key={`form-history-${form.id}`}
                  referenceId={form.referenceId}
                  profileImg={user.attachment || ""}
                  title={form.formType.name}
                  name={"You"}
                  department={user.department?.name}
                  createddate={form.createdAt}
                  lastApprovalDate={getLastApprovalDate(form.approvals)}
                  status={form.status}
                  onClick={() => onViewForm(form.id, form.formType.name, "history")}
                />
              );
            }
          }}
        />
      )}

      <SexualHarassmentReportsTable
        reports={sexualHarassmentReports}
        onViewReport={onViewReport}
      />
    </div>
  );
}
