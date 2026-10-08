import { describe, it, expect } from "vitest";
import { validateStateTransition } from "./state-machine/transitions";
import { calculateHaversineDistance, ALLOWED_RADIUS_METERS, GPS_VERIFICATION_DISCLAIMER } from "./geo/haversine";
import { GrievanceStatus } from "@/types/state-machine";

describe("ResolveAI Complete Lifecycle & Security Invariant Suite", () => {
  it("enforces complete canonical happy-path lifecycle", () => {
    // 1. Citizen creates grievance -> initial state is PENDING
    let currentStatus: GrievanceStatus = "PENDING";

    // 2. Organization assigns certified field technician -> ASSIGNED
    const assignStep = validateStateTransition(currentStatus, "ASSIGNED", "ORG_MEMBER");
    expect(assignStep.allowed).toBe(true);
    currentStatus = "ASSIGNED";

    // 3. Worker acknowledges / starts work -> IN_PROGRESS
    const startStep = validateStateTransition(currentStatus, "IN_PROGRESS", "WORKER");
    expect(startStep.allowed).toBe(true);
    currentStatus = "IN_PROGRESS";

    // 4. Worker submits repair photo & verified GPS -> AWAITING_VERIFICATION
    const submitStep = validateStateTransition(currentStatus, "AWAITING_VERIFICATION", "WORKER");
    expect(submitStep.allowed).toBe(true);
    currentStatus = "AWAITING_VERIFICATION";

    // 5. Department inspector reviews and approves resolution -> CLOSED
    const approveStep = validateStateTransition(currentStatus, "CLOSED", "ORG_MEMBER");
    expect(approveStep.allowed).toBe(true);
    currentStatus = "CLOSED";

    expect(currentStatus).toBe("CLOSED");
  });

  it("enforces remedial rework loop when inspector rejects initial evidence", () => {
    // Starting at AWAITING_VERIFICATION
    const currentStatus = "AWAITING_VERIFICATION" as const;

    // Inspector demands rework
    const reworkStep = validateStateTransition(currentStatus, "REWORK_REQUIRED", "ORG_MEMBER");
    expect(reworkStep.allowed).toBe(true);

    // Worker resumes work
    const resumeStep = validateStateTransition("REWORK_REQUIRED", "IN_PROGRESS", "WORKER");
    expect(resumeStep.allowed).toBe(true);

    // Worker re-submits evidence
    const reSubmitStep = validateStateTransition("IN_PROGRESS", "AWAITING_VERIFICATION", "WORKER");
    expect(reSubmitStep.allowed).toBe(true);

    // Inspector finally approves
    const finalApprove = validateStateTransition("AWAITING_VERIFICATION", "CLOSED", "ORG_MEMBER");
    expect(finalApprove.allowed).toBe(true);
  });

  it("verifies mathematical Haversine spherical distance calculation under 100m", () => {
    const reportLoc = { latitude: 13.0827, longitude: 80.2707 }; // Chennai Central
    const nearbyLoc = { latitude: 13.0832, longitude: 80.2707 }; // ~55m north

    const result = calculateHaversineDistance(reportLoc, nearbyLoc, ALLOWED_RADIUS_METERS);
    expect(result.distanceMeters).toBeGreaterThan(50);
    expect(result.distanceMeters).toBeLessThan(60);
    expect(result.isWithinRadius).toBe(true);
    expect(result.result).toBe("MATCH");
    expect(result.disclaimer).toBe(GPS_VERIFICATION_DISCLAIMER);
  });

  it("fails verification when worker is 200m away", () => {
    const reportLoc = { latitude: 13.0827, longitude: 80.2707 };
    const farLoc = { latitude: 13.0845, longitude: 80.2707 }; // ~200m away

    const result = calculateHaversineDistance(reportLoc, farLoc, ALLOWED_RADIUS_METERS);
    expect(result.distanceMeters).toBeGreaterThan(150);
    expect(result.isWithinRadius).toBe(false);
    expect(result.result).toBe("MISMATCH");
  });

  it("enforces role-based privilege boundaries (Zero client trust)", () => {
    // Citizen cannot assign grievances
    expect(validateStateTransition("PENDING", "ASSIGNED", "CITIZEN").allowed).toBe(false);

    // Citizen cannot close grievances
    expect(validateStateTransition("AWAITING_VERIFICATION", "CLOSED", "CITIZEN").allowed).toBe(false);

    // Worker cannot close grievances directly
    expect(validateStateTransition("IN_PROGRESS", "CLOSED", "WORKER").allowed).toBe(false);
    expect(validateStateTransition("AWAITING_VERIFICATION", "CLOSED", "WORKER").allowed).toBe(false);

    // Organization member cannot submit evidence on behalf of worker
    expect(validateStateTransition("IN_PROGRESS", "AWAITING_VERIFICATION", "ORG_MEMBER").allowed).toBe(false);
  });
});
