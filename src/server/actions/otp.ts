"use server";

import crypto from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/email/mailer";
import { signVerifiedEmail } from "@/lib/email/otp-crypto";
import { getExistingAuthUserByEmail } from "@/lib/auth/get-user";

const emailSchema = z.string().email("Invalid email address format");

/**
 * Check if an email is marked verified in the database within the last 30 minutes
 */
export async function isEmailVerifiedInDb(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_verifications")
      .select("verified_at")
      .eq("email", cleanEmail)
      .single();

    if (!data?.verified_at) return false;

    const verifiedAt = new Date(data.verified_at).getTime();
    return Date.now() - verifiedAt < 30 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Server action to generate and dispatch an OTP to a target email
 */
export async function sendOtp(
  email: string,
  roleContext: "Citizen" | "Field Worker" | "Authority Admin" | "Department Official"
): Promise<{ success: boolean; message?: string; error?: string }> {
  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const cleanEmail = validation.data.trim().toLowerCase();

  try {
    const admin = createAdminClient();

    // Check if email is already registered specifically for this role before sending OTP
    if (roleContext === "Citizen") {
      const existingUser = await getExistingAuthUserByEmail(cleanEmail);
      if (existingUser) {
        return {
          success: false,
          error: "Already registered. An account with this email is already registered as a Citizen. Please log in.",
        };
      }
    } else if (roleContext === "Authority Admin") {
      const existingUser = await getExistingAuthUserByEmail(cleanEmail);
      if (existingUser) {
        return {
          success: false,
          error: "Already registered. An account with this email is already registered as an Organization. Please log in.",
        };
      }
    } else if (roleContext === "Field Worker") {
      const existingUser = await getExistingAuthUserByEmail(cleanEmail);
      if (existingUser) {
        return {
          success: false,
          error: "Already registered. An account with this email is already registered as a Field Worker. Please log in.",
        };
      }
    } else if (roleContext === "Department Official") {
      const { data: existingOrg } = await admin
        .from("organizations")
        .select("id")
        .ilike("official_email", cleanEmail)
        .maybeSingle();
      if (existingOrg) {
        return {
          success: false,
          error: "Already registered. An organization with this official department email already exists. Please log in.",
        };
      }
    }

    // Generate 6-digit numeric OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Upsert into email_verifications table
    const { error: dbError } = await admin.from("email_verifications").upsert({
      email: cleanEmail,
      otp: otpCode,
      expires_at: expiresAt,
      attempts: 0,
      verified_at: null,
    });

    if (dbError) {
      console.error("Database error saving OTP:", dbError);
    }

    // Send the email via SMTP
    const mailResult = await sendOtpEmail(cleanEmail, otpCode, roleContext);
    if (!mailResult.success) {
      return {
        success: false,
        error: mailResult.error || "Failed to deliver OTP via SMTP. Please check your email configuration.",
      };
    }

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam.`,
    };
  } catch (err: any) {
    console.error("sendOtp error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while sending verification code.",
    };
  }
}

/**
 * Server action to verify an OTP entered by the user
 */
export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: "Please enter a valid 6-digit verification code." };
  }

  try {
    const admin = createAdminClient();
    const { data: record, error: fetchError } = await admin
      .from("email_verifications")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (fetchError || !record) {
      return {
        success: false,
        error: "No active verification code found for this email. Please request a new code.",
      };
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return {
        success: false,
        error: "Verification code has expired. Please request a new one.",
      };
    }

    if (record.attempts >= 5) {
      return {
        success: false,
        error: "Too many failed attempts. Please request a new code.",
      };
    }

    if (record.otp !== cleanOtp) {
      await admin
        .from("email_verifications")
        .update({ attempts: (record.attempts || 0) + 1 })
        .eq("email", cleanEmail);

      return {
        success: false,
        error: "Invalid code entered. Please double-check the 6 digits and try again.",
      };
    }

    // Successfully verified!
    const verifiedAt = new Date().toISOString();
    await admin
      .from("email_verifications")
      .update({ verified_at: verifiedAt, attempts: 0 })
      .eq("email", cleanEmail);

    const signedToken = signVerifiedEmail(cleanEmail);

    return {
      success: true,
      token: signedToken,
    };
  } catch (err: any) {
    console.error("verifyOtp error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during verification.",
    };
  }
}

/**
 * Server action to generate and dispatch an OTP for password reset
 */
export async function sendPasswordResetOtp(
  email: string
): Promise<{ success: boolean; message?: string; error?: string; notRegistered?: boolean }> {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) {
    return {
      success: false,
      error: "Please provide your email address to reset your password.",
    };
  }

  const validation = emailSchema.safeParse(cleanEmail);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    // 1. Check if an account is registered with this email
    const existingUser = await getExistingAuthUserByEmail(cleanEmail);
    if (!existingUser) {
      return {
        success: false,
        notRegistered: true,
        error: "No registered account found with this email address. Please create an account.",
      };
    }

    const admin = createAdminClient();

    // 2. Generate 6-digit numeric OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 3. Upsert into email_verifications table
    const { error: dbError } = await admin.from("email_verifications").upsert({
      email: cleanEmail,
      otp: otpCode,
      expires_at: expiresAt,
      attempts: 0,
      verified_at: null,
    });

    if (dbError) {
      console.error("Database error saving password reset OTP:", dbError);
    }

    // 4. Send email via SMTP
    const mailResult = await sendOtpEmail(cleanEmail, otpCode, "Password Reset");
    if (!mailResult.success) {
      return {
        success: false,
        error: mailResult.error || "Failed to deliver OTP via SMTP. Please try again later.",
      };
    }

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam.`,
    };
  } catch (err: any) {
    console.error("sendPasswordResetOtp error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while sending verification code.",
    };
  }
}

