export const workLocation = [
  { id: 1, name: "PHNSA" },
  { id: 2, name: "PHNSA2" },
  { id: 3, name: "PHNFIF" },
  { id: 4, name: "PHNPKN" },
  { id: 5, name: "PHNTGM" },
  { id: 6, name: "PHNPGH" },
  { id: 7, name: "PHNBB" },
  { id: 8, name: "DHMSB" },
  { id: 9, name: "PHNRASA" },
];

export const categoryManPower = [
  { id: 1, name: "Replacement" },
  { id: 2, name: "Additional" },
  { id: 3, name: "Temporary" },
];

// "Additional" reasons on the Man Power Requisition form. Each key is also the
// formData field holding that reason's details. Shared with the email details.
export const manpowerReasonOptions = [
  {
    key: "productionVolumeIncrease",
    label: "Production Volume Increase (Item)",
  },
  { key: "newProject", label: "New Project" },
  { key: "machineFaulty", label: "Machine Faulty" },
  { key: "other", label: "Other" },
] as const;

export const roles = [
  { id: "STAFF", name: "Staff" },
  { id: "HEAD_OF_SECTION", name: "Head of Section" },
  { id: "HEAD_OF_DEPARTMENT", name: "Head of Department" },
  { id: "HEAD_OF_DIVISION", name: "Head of Division" },
  { id: "TOP_MANAGEMENT", name: "Top Management" },
  { id: "ADMIN", name: "Admin" },
  { id: "FORM_ADMIN", name: "Form Admin (scoped)" },
];

export const complaintOptions = [
  {
    value: "Working Conditions",
    label: "Working Conditions (Keadaan Tempat Kerja)",
  },
  { value: "Harassment/Bullying", label: "Harassment/Buli (Gangguan/Buli)" },
  { value: "Discrimination", label: "Discrimination (Diskriminasi)" },
  {
    value: "Health & Safety Concerns",
    label: "Health & Safety Concerns (Kebimbangan Kesihatan & Keselamatan)",
  },
  {
    value: "Pay/Benefits Dispute",
    label: "Pay/Benefits Dispute (Pertikaian Bayaran/Faedah)",
  },
  {
    value: "Workload or Job Role",
    label: "Workload or Job Role (Beban Kerja atau Peranan Kerja)",
  },
  { value: "Other", label: "Other (Please specify) Lain-lain (Sila Nyatakan)" },
];

export const reportAsOptions = [
  { value: "Victim", label: "Mangsa / Victim" },
  { value: "Witness", label: "Saksi / Witness" },
];

export const evidenceTypeOptions = [
  {
    value: "Physical",
    label: "Ya ( Bukti Fizikal - contoh : Gambar, video)",
  },
  {
    value: "Non-Physical",
    label: "Ya ( Bukti  Bukan Fizikal - contoh : Lisan , Perbuatan)",
  },
  { value: "None", label: "Tidak" },
];

export const reportingToOptions = [
  { id: 1, name: "Supervisor" },
  { id: 2, name: "Executive/Senior Executive" },
  { id: 3, name: "Head of Section/Assistant Manager" },
  { id: 4, name: "Head of Department/Manager" },
];

export const performanceRatings = [
  { id: 1, name: "Poor" },
  { id: 2, name: "Fair" },
  { id: 3, name: "Satisfactory" },
  { id: 4, name: "Good" },
  { id: 5, name: "Excellent" },
];

export const designation = [
  { id: 1, name: "Assistant" },
  { id: 2, name: "Assistant Manager" },
  { id: 3, name: "Clerk" },
  { id: 4, name: "Data Entry" },
  { id: 5, name: "Deputy Manager" },
  { id: 6, name: "Executive" },
  { id: 7, name: "Forklift Driver" },
  { id: 8, name: "General Manager" },
  { id: 9, name: "Head Of Department" },
  { id: 10, name: "Head Of Division" },
  { id: 11, name: "Head Of Section" },
  { id: 12, name: "Junior Assistant" },
  { id: 13, name: "Manager" },
  { id: 14, name: "Operator" },
  { id: 15, name: "QC Inspector" },
  { id: 16, name: "Security" },
  { id: 17, name: "Senior Manager" },
  { id: 18, name: "Shift Leader" },
  { id: 19, name: "Sr. Assistant" },
  { id: 20, name: "Sr. Executive" },
  { id: 21, name: "Supervisor" },
  { id: 22, name: "Technician" },
];
