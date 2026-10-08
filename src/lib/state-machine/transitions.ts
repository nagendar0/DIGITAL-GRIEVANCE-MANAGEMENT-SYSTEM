import { GrievanceStatus, UserRole } from "@/types/state-machine";

export interface TransitionRule {
  from: GrievanceStatus;
  to: GrievanceStatus;
  allowedRoles: UserRole[];
  description: string;
}

export const VALID_TRANSITIONS: TransitionRule[] = [
  {
    from: "PENDING",
    to: "ASSIGNED",
    allowedRoles: ["ORG_MEMBER", "PLATFORM_ADMIN"],
    description: "Department assigns grievance to certified field technician",
  },
  {
    from: "ASSIGNED",
    to: "ACCEPTED",
    allowedRoles: ["WORKER"],
    description: "Technician acknowledges and accepts dispatch assignment",
  },
  {
    from: "ASSIGNED",
    to: "IN_PROGRESS",
    allowedRoles: ["WORKER"],
    description: "Technician arrives on site and starts restoration work",
  },
  {
    from: "ACCEPTED",
    to: "IN_PROGRESS",
    allowedRoles: ["WORKER"],
    description: "Technician starts repair operations",
  },
  {
    from: "IN_PROGRESS",
    to: "AWAITING_VERIFICATION",
    allowedRoles: ["WORKER"],
    description: "Technician completes repairs and submits after-photo + GPS evidence",
  },
  {
    from: "AWAITING_VERIFICATION",
    to: "CLOSED",
    allowedRoles: ["ORG_MEMBER", "PLATFORM_ADMIN"],
    description: "Department inspector verifies evidence, GPS tolerance, and closes grievance",
  },
  {
    from: "AWAITING_VERIFICATION",
    to: "VERIFIED",
    allowedRoles: ["ORG_MEMBER", "PLATFORM_ADMIN"],
    description: "Intermediary verified state prior to final archive closure",
  },
  {
    from: "VERIFIED",
    to: "CLOSED",
    allowedRoles: ["ORG_MEMBER", "PLATFORM_ADMIN"],
    description: "Archival ledger closure",
  },
  {
    from: "AWAITING_VERIFICATION",
    to: "REWORK_REQUIRED",
    allowedRoles: ["ORG_MEMBER", "PLATFORM_ADMIN"],
    description: "Inspector requests remedial adjustment from technician",
  },
  {
    from: "AWAITING_VERIFICATION",
    to: "AWAITING_VERIFICATION",
    allowedRoles: ["WORKER", "PLATFORM_ADMIN"],
    description: "Technician submits updated or retaken resolution evidence prior to review",
  },
  {
    from: "REWORK_REQUIRED",
    to: "ASSIGNED",
    allowedRoles: ["ORG_MEMBER", "PLATFORM_ADMIN"],
    description: "Coordinator re-routes job to technician",
  },
  {
    from: "REWORK_REQUIRED",
    to: "IN_PROGRESS",
    allowedRoles: ["WORKER"],
    description: "Technician returns to site and recommences rework operations",
  },
];

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a state transition from `currentStatus` to `nextStatus` is permitted for `role`.
 */
export function validateStateTransition(
  currentStatus: GrievanceStatus,
  nextStatus: GrievanceStatus,
  role: UserRole
): ValidationResult {
  const match = VALID_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === nextStatus
  );

  if (!match) {
    return {
      allowed: false,
      reason: `Forbidden state transition: cannot jump directly from "${currentStatus}" to "${nextStatus}".`,
    };
  }

  if (!match.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role "${role}" does not have authority to transition grievance to "${nextStatus}". Required: ${match.allowedRoles.join(" or ")}.`,
    };
  }

  return { allowed: true };
}
