import React from "react";
import BannerTableRow from "../../ui/BannerTableRow";
import ApprovalTable from "../../ui/ApprovalTable";
import { SelfForm, UserType } from "@/app/types/types";
import { Approval, SexualHarassmentReportItem } from "../ApprovalComponent";
import SexualHarassmentReportsTable from "../SexualHarassmentReportsTable";
import { getApprovalActionDate, getLastApprovalDate } from "../approvalDateUtils";

interface PendingContentProps {
  approvals: Approval[];
  userPendingForms: SelfForm[];
  user: UserType;
  onViewForm: (formId: number, formName: string, source: "pending") => void;
  onViewReport?: (reportId: number) => void;
  sexualHarassmentReports?: SexualHarassmentReportItem[];
}

// Define a union type for items in the paginated list
type PendingItem =
  | { type: "approval"; data: Approval }
  | { type: "form"; data: SelfForm };

export default function PendingContent({
  approvals,
  userPendingForms,
  user,
  onViewForm,
  onViewReport,
  sexualHarassmentReports = [],
}: PendingContentProps) {
  const pendingApprovals = approvals.filter(
    (approval) => approval.status === "PENDING",
  );

  const approvalSubmissionIds = new Set(
    pendingApprovals
      .map((approval) => approval.submission?.id)
      .filter((id): id is number => typeof id === "number"),
  );

  const visiblePendingForms = userPendingForms.filter(
    (form) => !approvalSubmissionIds.has(form.id),
  );

  const pendingItems: PendingItem[] = [
    ...pendingApprovals.map((approval) => ({
      type: "approval" as const,
      data: approval,
    })),
    ...visiblePendingForms.map((form) => ({
      type: "form" as const,
      data: form,
    })),
  ];

  const hasItems = pendingItems.length > 0 || sexualHarassmentReports.length > 0;

  if (!hasItems) {
    return <p className="text-gray-600 dark:text-gray-400">No pending items found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {pendingItems.length > 0 && (
      <ApprovalTable
        items={pendingItems}
        pageSize={20}
        defaultSortLabel="Date"
        defaultSortDirection="desc"
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
        emptyMessage="No pending items found."
        renderRow={(item) => {
          if (item.type === "approval") {
            const approval = item.data;
            const submission = approval.submission;
            if (!submission) return null;
            return (
              <BannerTableRow
                key={`approval-${approval.id}`}
                referenceId={submission.referenceId}
                profileImg={submission.createdBy.attachment || ""}
                title={submission.formType.name}
                name={submission.createdBy.fullname}
                department={submission.createdBy.department?.name}
                createddate={submission.createdAt}
                lastApprovalDate={getApprovalActionDate(approval)}
                status={approval.status}
                onClick={() =>
                  onViewForm(submission.id, submission.formType.name, "pending")
                }
              />
            );
          } else {
            const form = item.data;

            return (
              <BannerTableRow
                key={`form-${form.id}`}
                referenceId={form.referenceId}
                profileImg={user.attachment || ""}
                title={form.formType.name}
                name={"You"}
                department={user.department?.name}
                createddate={form.createdAt}
                lastApprovalDate={getLastApprovalDate(form.approvals)}
                status={form.status}
                onClick={() => onViewForm(form.id, form.formType.name, "pending")}
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
