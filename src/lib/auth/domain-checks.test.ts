import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation and next/headers
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// Mock supabase admin
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Mock nodemailer to prevent network SMTP timeout in tests
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "mock-123" }),
    })),
  },
}));

// Mock supabase server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { checkEmailDomainStatus } from "@/server/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";

describe("checkEmailDomainStatus Category & Sector Enrollment Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles invalid email input gracefully", async () => {
    const res = await checkEmailDomainStatus("invalid", "CITIZEN", "SIGN_IN");
    expect(res.status).toBe("NOT_REGISTERED");
    expect(res.message).toContain("valid email address");
  });

  it("returns NOT_REGISTERED with custom message for unregistered email in Citizen Sign In", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("newcitizen@test.com", "CITIZEN", "SIGN_IN");
    expect(res.status).toBe("NOT_REGISTERED");
    expect(res.message).toBe("No Citizen account found with this email. Please register or create an account.");
  });

  it("returns NOT_REGISTERED with custom message for unregistered email in Citizen Sign Up", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("newcitizen@test.com", "CITIZEN", "SIGN_UP");
    expect(res.status).toBe("NOT_REGISTERED");
    expect(res.message).toBe("Email available for new Citizen registration.");
  });

  it("detects registered Citizen email on Organization portal Sign In as ALREADY_REGISTERED for multi-role sign-in", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "citizen@test.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("citizen@test.com", "ORGANIZATION", "SIGN_IN");
    expect(res.status).toBe("ALREADY_REGISTERED");
    expect(res.message).toBe("Organization account found. Enter your password to sign in.");
  });

  it("marks registered email on Organization portal Sign Up as ALREADY_REGISTERED", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "citizen@test.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("citizen@test.com", "ORGANIZATION", "SIGN_UP");
    expect(res.status).toBe("ALREADY_REGISTERED");
    expect(res.message).toContain("Already registered");
    expect(res.message).toContain("Please go to sign in");
  });

  it("detects registered Citizen email on Field Worker portal Sign In as ALREADY_REGISTERED for multi-role sign-in", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "citizen@test.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("citizen@test.com", "WORKER", "SIGN_IN");
    expect(res.status).toBe("ALREADY_REGISTERED");
    expect(res.message).toBe("Field Worker account found. Enter your password to sign in.");
  });

  it("detects registered Worker on Field Worker Sign In as ALREADY_REGISTERED", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "workers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "w-1" } }),
            }),
          }),
        };
      }
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-worker", email: "worker@test.com", user_metadata: { role: "WORKER" } },
              ],
            },
          }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("worker@test.com", "WORKER", "SIGN_IN");
    expect(res.status).toBe("ALREADY_REGISTERED");
    expect(res.message).toBe("Field Worker account found. Enter your password to sign in.");
  });

  it("sendOtp blocks an existing registered user from receiving Field Worker registration OTP", async () => {
    const { sendOtp } = await import("@/server/actions/otp");
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "citizen@test.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);

    const res = await sendOtp("citizen@test.com", "Field Worker");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Already registered");
  });

  it("sendOtp blocks an existing registered Worker from receiving Field Worker registration OTP", async () => {
    const { sendOtp } = await import("@/server/actions/otp");
    const mockFrom = vi.fn((table: string) => {
      if (table === "workers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "w-existing" } }), // Already a worker!
            }),
          }),
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-worker", email: "worker@test.com", user_metadata: { role: "WORKER" } },
              ],
            },
          }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await sendOtp("worker@test.com", "Field Worker");
    expect(res.success).toBe(false);
    expect(res.error).toBe(
      "Already registered. An account with this email is already registered as a Field Worker. Please log in."
    );
  });

  it("checkEmailDomainStatus marks existing email as ALREADY_REGISTERED in Citizen SIGN_UP mode", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });

    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "existing@citizen.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: mockFrom,
    } as any);

    const res = await checkEmailDomainStatus("existing@citizen.com", "CITIZEN", "SIGN_UP");
    expect(res.status).toBe("ALREADY_REGISTERED");
    expect(res.message).toContain("Already registered");
    expect(res.message).toContain("Please go to sign in");
  });

  it("sendOtp blocks an existing registered user from receiving Citizen signup OTP", async () => {
    const { sendOtp } = await import("@/server/actions/otp");
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "existing@citizen.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any);

    const res = await sendOtp("existing@citizen.com", "Citizen");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Already registered");
    expect(res.error).toContain("Please log in");
  });

  it("signUpCitizen blocks registration when email is already registered", async () => {
    const { signUpCitizen } = await import("@/server/actions/auth");
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-citizen", email: "existing@citizen.com", user_metadata: { role: "CITIZEN" } },
              ],
            },
          }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "email_verifications") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { verified_at: new Date().toISOString() },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
    } as any);

    const formData = new FormData();
    formData.append("fullName", "Existing User");
    formData.append("email", "existing@citizen.com");
    formData.append("phone", "9876543210");
    formData.append("password", "Password123!");

    const res = await signUpCitizen(null, formData);
    expect(res?.error).toBe(
      "Already registered. An account with this email address is already registered. Please go to sign in."
    );
  });

  it("registerOrganization blocks registration when admin email is already registered", async () => {
    const { registerOrganization } = await import("@/server/actions/auth");
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-admin", email: "existing.admin@gov.in", user_metadata: { role: "ORG_MEMBER" } },
              ],
            },
          }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "email_verifications") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { verified_at: new Date().toISOString() },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
    } as any);

    const formData = new FormData();
    formData.append("adminName", "Admin Test");
    formData.append("adminEmail", "existing.admin@gov.in");
    formData.append("adminPassword", "Password123!");
    formData.append("adminPhone", "9876543210");
    formData.append("orgName", "Public Works Dept");
    formData.append("orgType", "PUBLIC_WORKS");
    formData.append("registrationNumber", "PWD-2026-999");
    formData.append("officialEmail", "dept@gov.in");
    formData.append("officialPhone", "080-223344");
    formData.append("address", "Civic Center Road");

    const res = await registerOrganization(null, formData);
    expect(res?.error).toBe(
      "Already registered. An account with this email address is already registered. Please go to sign in."
    );
  });

  it("signUpWorker blocks registration when worker email is already registered", async () => {
    const { signUpWorker } = await import("@/server/actions/auth");
    vi.mocked(createAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u-worker", email: "existing.worker@gov.in", user_metadata: { role: "WORKER" } },
              ],
            },
          }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "email_verifications") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { verified_at: new Date().toISOString() },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
    } as any);

    const formData = new FormData();
    formData.append("fullName", "Technician Test");
    formData.append("email", "existing.worker@gov.in");
    formData.append("phone", "9876543210");
    formData.append("password", "Password123!");

    const res = await signUpWorker(null, formData);
    expect(res?.error).toBe(
      "Already registered. An account with this email address is already registered. Please go to sign in."
    );
  });
});

