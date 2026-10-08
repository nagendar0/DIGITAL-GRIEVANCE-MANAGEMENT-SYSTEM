export type UserRole = "CITIZEN" | "ORG_MEMBER" | "WORKER" | "PLATFORM_ADMIN";

export type OrgType =
  | "MUNICIPALITY"
  | "PUBLIC_WORKS"
  | "WATER_BOARD"
  | "ELECTRICITY_BOARD"
  | "TRANSPORT_AUTHORITY"
  | "SANITATION"
  | "OTHER";

export type OrgStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type GrievanceStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "AWAITING_VERIFICATION"
  | "VERIFIED"
  | "CLOSED"
  | "REWORK_REQUIRED";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type VerificationResult = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface StatusMeta {
  label: string;
  description: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  stepIndex: number;
}

export const STATUS_META: Record<GrievanceStatus, StatusMeta> = {
  PENDING: {
    label: "Pending Intake",
    description: "Submitted by citizen, undergoing triage and organization routing.",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    bgLight: "bg-amber-50",
    textColor: "text-amber-800",
    stepIndex: 1,
  },
  ASSIGNED: {
    label: "Worker Assigned",
    description: "Assigned by organization, awaiting worker acceptance.",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    bgLight: "bg-blue-50",
    textColor: "text-blue-800",
    stepIndex: 2,
  },
  ACCEPTED: {
    label: "Job Accepted",
    description: "Worker has accepted the assignment and scheduled dispatch.",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    bgLight: "bg-indigo-50",
    textColor: "text-indigo-800",
    stepIndex: 3,
  },
  IN_PROGRESS: {
    label: "Work In Progress",
    description: "Technician is on-site performing active repairs.",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    bgLight: "bg-purple-50",
    textColor: "text-purple-800",
    stepIndex: 4,
  },
  AWAITING_VERIFICATION: {
    label: "Awaiting Verification",
    description: "Field work completed with after-photo & GPS evidence. Pending org review.",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
    bgLight: "bg-yellow-50",
    textColor: "text-yellow-800",
    stepIndex: 5,
  },
  VERIFIED: {
    label: "Verified by Org",
    description: "Evidence verified against GPS radius and reviewed by organization.",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-800",
    stepIndex: 6,
  },
  CLOSED: {
    label: "Resolved & Closed",
    description: "Grievance successfully resolved and published to public transparency portal.",
    badgeClass: "bg-emerald-200 text-emerald-900 border-emerald-400",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-900",
    stepIndex: 7,
  },
  REWORK_REQUIRED: {
    label: "Rework Required",
    description: "Organization requested additional corrective action from technician.",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    bgLight: "bg-rose-50",
    textColor: "text-rose-800",
    stepIndex: 4,
  },
};
