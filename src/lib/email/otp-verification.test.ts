import { describe, it, expect } from "vitest";
import { signVerifiedEmail, verifyEmailSignature } from "./otp-crypto";

describe("Email OTP Crypto Verification", () => {
  it("generates a signed token with correct format (email:timestamp:signature)", () => {
    const email = "worker@civic.gov.in";
    const token = signVerifiedEmail(email);

    const parts = token.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("worker@civic.gov.in");
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(parts[2].length).toBe(64); // SHA-256 hex digest
  });

  it("verifies a valid token for the matching email", () => {
    const email = "officer@municipality.gov";
    const token = signVerifiedEmail(email);

    expect(verifyEmailSignature(token, email)).toBe(true);
    // Case insensitivity
    expect(verifyEmailSignature(token, "OFFICER@MUNICIPALITY.GOV")).toBe(true);
  });

  it("rejects token for mismatched email address", () => {
    const email = "officer1@municipality.gov";
    const token = signVerifiedEmail(email);

    expect(verifyEmailSignature(token, "officer2@municipality.gov")).toBe(false);
  });

  it("rejects tampered signature", () => {
    const email = "worker@resolveai.in";
    const token = signVerifiedEmail(email);
    const tampered = token.slice(0, -4) + "0000";

    expect(verifyEmailSignature(tampered, email)).toBe(false);
  });

  it("rejects expired token older than 30 minutes", () => {
    const email = "worker@resolveai.in";
    const oldTimestamp = Date.now() - 35 * 60 * 1000;
    const fakeToken = `${email}:${oldTimestamp}:dummy`;

    expect(verifyEmailSignature(fakeToken, email)).toBe(false);
  });
});
