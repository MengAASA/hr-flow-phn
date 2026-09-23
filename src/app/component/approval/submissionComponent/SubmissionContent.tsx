import React from "react";
import BannerTableRow from "../../ui/BannerTableRow";
import ApprovalTable from "../../ui/ApprovalTable";
import { SelfForm, UserType } from "@/app/types/types";
import { getLastApprovalDate } from "../approvalDateUtils";

interface SubmissionContentProps {
  formsWithLevels: SelfForm[];
  user: UserType;
  onViewForm: (formId: number, formName: string, source: "submissions") => void;
}

export default function SubmissionContent({
  formsWithLevels,
  user,
  onViewForm,
}: SubmissionContentProps) {
  return (
    <ApprovalTable
      items={formsWithLevels}
      pageSize={20}
      columns={[
        { label: "Reference ID", sortAccessor: (form) => form.referenceId },
        { label: "Department", sortAccessor: () => user.department?.name },
        { label: "Requester", sortAccessor: () => "You" },
        { label: "Date", sortAccessor: (form) => form.createdAt },
        { label: "Status", sortAccessor: (form) => form.status },
        { label: "Form Type", sortAccessor: (form) => form.formType.name },
        {
          label: "Last Approval Date",
          sortAccessor: (form) => getLastApprovalDate(form.approvals),
        },
      ]}
      emptyMessage="You have no submitted forms."
      renderRow={(form) => (
        <BannerTableRow
          key={form.id}
          referenceId={form.referenceId}
          profileImg={user.attachment || ""}
          title={form.formType.name}
          name={"You"}
          department={user.department?.name}
          createddate={form.createdAt}
          lastApprovalDate={getLastApprovalDate(form.approvals)}
          status={form.status}
          onClick={() => onViewForm(form.id, form.formType.name, "submissions")}
        />
      )}
    />
  );
}
