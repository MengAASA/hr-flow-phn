import AdminComponent from "@/app/component/admin/AdminComponent";
import React from "react";
import { prisma } from "../../../../lib/prisma";
import { FormType, SelfFormData } from "@/app/types/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth-options";
import { redirect } from "next/navigation";
import {
  getScopedFormTypeIds,
  isAdminRole,
  scopedSubmissionWhere,
} from "@/src/lib/admin-access";
import {
  Approval,
  FileAttachment,
  FormSubmission,
  User,
} from "@/generated/client";

type FormData = {
  division: string;
  department: string;
  section: string;
};

export default async function Admin() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); //protected page
  }

  // The sidebar only offers this page to admins, but the route itself was
  // reachable by anyone who typed the URL — and it renders every submission,
  // every user and the approval-flow builder.
  if (!isAdminRole(session.user?.roles)) {
    redirect("/dashboard");
  }

  // null for a full admin; a list of form type ids for a scoped FORM_ADMIN.
  const scopedFormTypeIds = await getScopedFormTypeIds(
    session.user?.roles,
    session.user?.staffid,
  );

  // Only a full ADMIN gets the complete tab set and any edit rights. Every
  // other admin role browses read-only; the user API enforces the same rule
  // independently of this flag.
  const isFullAdmin = session.user?.roles?.includes("ADMIN") ?? false;

  // The queries below are independent, so run them together rather than one
  // round trip after another. Password hashes are omitted from every user
  // record: this data is serialised to the browser and nothing there reads it.
  const [
    userListing,
    formType,
    approvalFlowSteps,
    formSubmission,
    divisions,
    departments,
    sections,
  ] = await Promise.all([
    prisma.user.findMany({
      omit: { password: true },
      include: {
        division: true,
        department: true,
        section: true,
        formTypeScopes: { select: { formTypeId: true } },
      },
    }),
    // flowSteps only matters to the Form Create tab, which none but a full
    // admin sees — everyone else gets the bare form types the user form needs.
    isFullAdmin
      ? prisma.formType.findMany({
          include: {
            flowSteps: true,
          },
        })
      : prisma.formType.findMany(),
    !isFullAdmin
      ? Promise.resolve([])
      : prisma.approvalFlowStep.findMany({
          include: {
            formType: true,
            division: true,
            department: true,
            section: true,
            approvalStepApprovers: {
              include: {
                user: { omit: { password: true } },
              },
            },
          },
        }),
    prisma.formSubmission.findMany({
      where: scopedSubmissionWhere(scopedFormTypeIds),
      include: {
        attachments: true,
        createdBy: { omit: { password: true } },
        formType: true,
        approvals: {
          include: {
            approver: { omit: { password: true } },
          },
        },
      },
    }),
    prisma.division.findMany(),
    prisma.department.findMany(),
    prisma.section.findMany(),
  ]);

  const approvalFlow = approvalFlowSteps.map((step) => ({
    ...step,
    division: step.division ?? undefined,
    department: step.department ?? undefined,
    section: step.section ?? undefined,
  }));

  // Id → name lookups for the per-submission enrichment below.
  const divisionById = new Map(divisions.map((d) => [d.id, d]));
  const departmentById = new Map(departments.map((d) => [d.id, d]));
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  // Harassment reports are not surfaced here. They live behind
  // /dashboard/compliance, which admits designated compliance officers only.


  const enrichedSubmissions: SelfFormData[] = formSubmission.map(
    (
      sub: FormSubmission & {
        createdBy: Omit<User, "password">;
        attachments: FileAttachment[];
        approvals: Approval[];
        formType: FormType;
      },
    ) => {
      const parsedFormData: FormData =
        typeof sub.formData === "string"
          ? JSON.parse(sub.formData)
          : (sub.formData as FormData);

      const division = divisionById.get(Number(parsedFormData?.division));
      const department = departmentById.get(Number(parsedFormData?.department));
      const section = sectionById.get(Number(parsedFormData?.section));

      return {
        ...sub,
        formType: sub.formType,
        formData: parsedFormData,
        attachments: sub.attachments.map((att) => ({
          ...att,
          fileType: att.fileType ?? "",
        })),
        approvals: sub.approvals.map((a) => ({
          ...a,
          currentLevel: a.stepOrder,
          totalLevel: sub.approvals.length,
          activeLevel: a.status === "PENDING" ? 1 : 0,
        })),
        departmentName: department?.name ?? "",
        divisionName: division?.name ?? "",
        sectionName: section?.name ?? "",
      };
    },
  );


  return (
    <div className="w-full font-poppins">
      <div>
        <h1 className="font-bold text-3xl">Admin</h1>
        <p className="text-indigo-800">Manage admin site and approver level</p>
      </div>

      <AdminComponent
        formSubmission={enrichedSubmissions}
        userListing={userListing}
        formType={formType}
        approvalStep={approvalFlow}
        isFullAdmin={isFullAdmin}
      />
    </div>
  );
}

