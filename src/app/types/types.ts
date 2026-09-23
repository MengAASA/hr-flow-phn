import { Prisma } from "@/generated/client";
import { DateValueType } from "../component/ui/DatePicker";
import { Approval } from "../component/approval/ApprovalComponent";
import { ReasonKey } from "../component/form/hr-form/ManPowerRequisition";

export interface Division {
  id: number;
  name: string;
}

export interface Department {
  id: number;
  name: string;
}

export interface Section {
  id: number;
  name: string;
}

export interface categoryManPower {
  id: number;
  name: string;
}

export interface FormType {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  flowSteps?: FlowStep[];
}

export interface FlowStep {
  id: number;
  formTypeId: number;
  order: number;
  role: string;
  departmentId: number | null;
  divisionId: number | null;
  sectionId: number | null;
  createdAt: string;
}

export interface ManPowerTypes {
  category: categoryManPower | null;
  createddate: DateValueType;
  lastWorkingDay: DateValueType;
  dateRequested: DateValueType;
  dateRecommended: DateValueType;
  dateReviewed: DateValueType;
  dateVerified: DateValueType;
  dateApproved: DateValueType;
  division: string;
  department: string;
  section: string;
  designation: string;
  reportingTo: string;
  noRequested: string;
  currentHeadCount: string;
  approvedRequirement: string;
  workLocation: string;
  workStation: string;
  employmentType: string;
  manpowerPlan: string;
  approvedAmp: string;
  keyRequirement: string;
  keyResponsibilities: string;
  reasonOfRequisition: string;
  selectedOption: string;
  incumbentName: string;
  productionVolumeIncrease: string;
  newProject: string;
  machineFaulty: string;
  other: string;
  requestedBy: string;
  recommendedBy: string;
  reviewedBy: string;
  verifiedBy: string;
  approvedby: string;
  fileAttachment: File[] | null;
  remarks: string;
  selectedReasons: ReasonKey[];
  divisionName?: string;
  departmentName?: string;
  sectionName?: string;
}

export interface EmployeeReviewTypes {
  staffName: string;
  jobTitle: string;
  divisionName?: string;
  departmentName?: string;
  sectionName?: string;
  reviewPeriodFrom: DateValueType;
  reviewPeriodTo: DateValueType;
  staffId: string;
  dateJoin: DateValueType;
  evaluator: string;
  monthReview: string;
  jobKnowledge: string;
  jobKnowledgeComments: string;
  workQuality: string;
  workQualityComments: string;
  attendancePunctuality: string;
  attendancePunctualityComments: string;
  communicationSkills: string;
  communicationSkillsComments: string;
  competencyRoles: string;
  competencyRolesComments: string;
  averageRating: string;
  superiorSignature: string;
  superiorDate: string;
  hodSignature: string;
  hodDate: string;
  employeeComments: string;
  employeeSignature: string;
  employeeDate: string;
  hcdAcknowledgement: string;
  hcdDate: string;
  reviewStage?: string;
}

export interface GrievanceReportTypes {
  fullname: string;
  contactNo: string;
  staffId: string;
  designation: string;
  dateOfComplaint: DateValueType;
  division: string;
  department: string;
  section: string;
  complaintTypes: string;
  others: string;
  detailComplaints: string;
  attemptsResolve: string;
  preferredOutcome: string;
  supportEvidence: File | null;
  declaration: boolean;
  remarks: string;
  divisionName?: string;
  departmentName?: string;
  sectionName?: string;
}

export interface FlexibleWorkingArrangementTypes {
  fullname: string;
  staffId: string;
  jobTitle: string;
  department: string;
  immediateSuperior: string;
  immediateSuperiorStaffId: string;
  dateOfRequest: DateValueType;
  flexibleHours: boolean;
  flexibleDays: boolean;
  flexiblePlace: boolean;
  otherArrangement: boolean;
  otherArrangementSpecify: string;
  startDate: DateValueType;
  endDate: DateValueType;
  workingDayFrom: string;
  workingDayTo: string;
  workingTimeFrom: string;
  workingTimeTo: string;
  workLocation: string;
  reason: string;
  declaration: boolean;
}

export interface SexualHarassmentReportTypes {
  reporterName: string;
  reporterContact: string;
  reporterEmail: string;
  isStaff: boolean;
  staffId: string;
  workLocation: string;
  division: string;
  department: string;
  section: string;
  reportAs: string;
  perpetratorName: string;
  victimName: string;
  incidentLocation: string;
  incidentDateTime: string;
  description: string;
  witnessName: string;
  evidenceType: string;
  supportEvidence: File | null;
  declaration: boolean;
  website: string; // honeypot - must stay empty
}

export interface SystemAccountRequest {
  fullname: string;
  section: string;
  department: string;
  division: string;
  dateApply: DateValueType;
  staffNo: string;
  designation: string;
  extNo: string;
  email: string;
  superiorSignature: string;
  superiorName: string;
  dateSuperiorSign: DateValueType;
  userName: string;
  effectiveDate: DateValueType;
  password: string;
  itPersonnel: string;
  itPersonnelName: string;
  itPersonnelDate: DateValueType;
  remarks: string;
  pcAvailability: string;
  signature: string;
  divisionName?: string;
  departmentName?: string;
  sectionName?: string;
}

export interface UserInfo {
  id: number;
  departmentId: number;
  divisionId: number;
  role: string;
  sectionId: number;
  workLocation: string;
  designation?: string;
  fullname: string;
  staffid: string;
}

export interface fullUserInfo {
  id: number;
  staffid: string;
  email: string;
  fullname: string;
  password: string;
  designation: string;
  departmentId: number;
  divisionId: number;
  role: string;
  sectionId: number;
  workLocation: string;
}

export interface User {
  staffid: string;
  email: string;
  name: string;
}

export interface UserType {
  id: number;
  fullname: string;
  staffid: string;
  email: string;
  division?: Division | null;
  department?: Department | null;
  section?: Section | null;
  divisionId?: number | null;
  departmentId?: number | null;
  sectionId?: number | null;
  designation?: string | null;
  workLocation?: string | null;
  role: string;
  // Primary role plus any extra roles granted on top of it (e.g. ADMIN
  // granted to a user whose primary role stays HEAD_OF_SECTION).
  roles?: string[];
  attachment?: string | null;
  // Form types a FORM_ADMIN may administer; empty/absent for other roles.
  formTypeScopes?: { formTypeId: number }[];
}

export interface FormData {
  [key: string]: string | number | boolean | null | string[] | number[];
}

export interface SelfForm {
  id: number;
  referenceId?: string | null;
  formTypeId: number;
  createdById: number;
  status: string;
  totalLevel?: number;
  currentLevel?: number;
  activeLevel?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  formData: FormData | null; // ✅ allows null, matches Prisma JsonValue
  formType: {
    id: number;
    name: string;
    description?: string | null;
    createdAt: string | Date;
  };
  approvals?: {
    id: number;
    submissionId: number;
    approverId: number;
    stepOrder: number;
    status: string;
    remarks?: string | null;
    approvedAt?: string | Date | null;
    updatedAt?: string | Date | null;
  }[];
}

export interface ApprovalUser {
  id: number;
  submissionId: number;
  approverId: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING" | "KIV";
  remarks?: string | null;
  approvedAt?: string | Date | null;
  stepOrder: number;
  approver?: User;
}

export interface FormSubmissionType {
  id: number;
  formTypeId: number;
  formType: FormType;
  createdBy: UserType;
  status: string;
  formData: Prisma.InputJsonValue | null;
  // attachments?: string | null;
  approvals: Approval[];
  createdAt: string | Date;
  attachments: {
    fileName: string;
    filePath: string;
    fileType: string;
    formSubmissionId: number;
    id: number;
    uploadedAt: Date;
  }[];
}

export interface SelfFormData {
  id: number;
  referenceId?: string | null;
  formTypeId: number;
  formType: {
    name: string;
  };
  approvals: Approval[];
  createdBy: {
    staffid: string;
    email: string;
    fullname: string;
    createdAt?: string | Date;
  };
  departmentName?: string;
  divisionName?: string;
  sectionName?: string;
  // formData: ManPowerTypes;
  formData: Prisma.InputJsonValue | null;
  createdAt: string | Date;
  status: string;
  attachments: {
    fileName: string;
    filePath: string;
    fileType: string;
    formSubmissionId: number;
    id: number;
    uploadedAt: Date;
  }[];
}
