import { describe, it, expect } from "vitest";
import { validateStateTransition } from "./transitions";

describe("ResolveAI Lifecycle State Machine", () => {
  it("allows ORG_MEMBER to assign a PENDING grievance", () => {
    const res = validateStateTransition("PENDING", "ASSIGNED", "ORG_MEMBER");
    expect(res.allowed).toBe(true);
  });

  it("allows PLATFORM_ADMIN to assign a PENDING grievance", () => {
    const res = validateStateTransition("PENDING", "ASSIGNED", "PLATFORM_ADMIN");
    expect(res.allowed).toBe(true);
  });

  it("blocks CITIZEN from assigning a grievance", () => {
    const res = validateStateTransition("PENDING", "ASSIGNED", "CITIZEN");
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("does not have authority");
  });

  it("allows WORKER to start work from ASSIGNED state", () => {
    const res = validateStateTransition("ASSIGNED", "IN_PROGRESS", "WORKER");
    expect(res.allowed).toBe(true);
  });

  it("allows WORKER to submit evidence and transition to AWAITING_VERIFICATION", () => {
    const res = validateStateTransition("IN_PROGRESS", "AWAITING_VERIFICATION", "WORKER");
    expect(res.allowed).toBe(true);
  });

  it("STRICT SECURITY CHECK: prevents WORKER from self-closing or self-verifying a grievance", () => {
    const directClose = validateStateTransition("IN_PROGRESS", "CLOSED", "WORKER");
    expect(directClose.allowed).toBe(false);

    const approveFromReview = validateStateTransition("AWAITING_VERIFICATION", "CLOSED", "WORKER");
    expect(approveFromReview.allowed).toBe(false);
    expect(approveFromReview.reason).toContain("does not have authority");
  });

  it("allows ORG_MEMBER to approve and CLOSE after verification", () => {
    const res = validateStateTransition("AWAITING_VERIFICATION", "CLOSED", "ORG_MEMBER");
    expect(res.allowed).toBe(true);
  });

  it("allows ORG_MEMBER to demand REWORK from AWAITING_VERIFICATION", () => {
    const res = validateStateTransition("AWAITING_VERIFICATION", "REWORK_REQUIRED", "ORG_MEMBER");
    expect(res.allowed).toBe(true);
  });

  it("allows WORKER to resume work from REWORK_REQUIRED state", () => {
    const res = validateStateTransition("REWORK_REQUIRED", "IN_PROGRESS", "WORKER");
    expect(res.allowed).toBe(true);
  });

  it("prevents jumping directly from PENDING to CLOSED without triage, dispatch, and review", () => {
    const res = validateStateTransition("PENDING", "CLOSED", "PLATFORM_ADMIN");
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("cannot jump directly");
  });
});
