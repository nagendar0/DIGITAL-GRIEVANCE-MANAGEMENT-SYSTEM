"use client";

import React, { useState, useEffect, useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  User,
  Building2,
  HardHat,
  ArrowRight,
  AlertCircle,
  Shield,
  Briefcase,
  CheckCircle2,
  Info,
  KeyRound,
  RotateCcw,
  ArrowLeft,
  Mail,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmailOtpField } from "@/components/auth/email-otp-field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  signIn,
  signUpCitizen,
  registerOrganization,
  signUpWorker,
  checkEmailDomainStatus,
  resetPassword,
  type EmailDomainCheckResult,
} from "@/server/actions/auth";
import { sendPasswordResetOtp, verifyOtp } from "@/server/actions/otp";

type RoleCategory = "CITIZEN" | "ORGANIZATION" | "WORKER";
type AuthMode = "SIGN_IN" | "SIGN_UP" | "FORGOT_PASSWORD";

function AuthPortal() {
  const searchParams = useSearchParams();

  // Read initial category and mode from URL params or redirect/next params
  const initialRoleParam = searchParams.get("role")?.toLowerCase();
  const initialModeParam = searchParams.get("mode")?.toLowerCase();
  const redirectParam = (searchParams.get("redirect") || searchParams.get("next") || "").toLowerCase();

  const [role, setRole] = useState<RoleCategory>(() => {
    if (initialRoleParam === "org" || initialRoleParam === "organization" || redirectParam.includes("org")) return "ORGANIZATION";
    if (initialRoleParam === "worker" || initialRoleParam === "technician" || redirectParam.includes("worker")) return "WORKER";
    return "CITIZEN"; // Citizen is the default
  });

  const [mode, setMode] = useState<AuthMode>(() => {
    if (initialModeParam === "signup" || initialModeParam === "register") return "SIGN_UP";
    return "SIGN_IN";
  });

  // Global email state to preserve inputs when switching between sign-in and sign-up
  const [email, setEmail] = useState("");
  const [emailCheck, setEmailCheck] = useState<EmailDomainCheckResult | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Controlled error state to clear errors immediately on role shift, mode change, or email edit
  const [displayedSignInError, setDisplayedSignInError] = useState<string | null>(null);
  const [signInErrorRole, setSignInErrorRole] = useState<RoleCategory | null>(null);
  const [displayedCitizenSignUpError, setDisplayedCitizenSignUpError] = useState<string | null>(null);
  const [displayedOrgSignUpError, setDisplayedOrgSignUpError] = useState<string | null>(null);
  const [displayedWorkerSignUpError, setDisplayedWorkerSignUpError] = useState<string | null>(null);

  // Action states for all 4 flows
  const [signInState, signInAction, isSignInPending] = useActionState(signIn, null);
  const [citizenSignUpState, citizenSignUpAction, isCitizenPending] = useActionState(signUpCitizen, null);
  const [orgSignUpState, orgSignUpAction, isOrgPending] = useActionState(registerOrganization, null);
  const [workerSignUpState, workerSignUpAction, isWorkerPending] = useActionState(signUpWorker, null);

  // Success message for Sign In (e.g. after password reset)
  const [signInSuccessMessage, setSignInSuccessMessage] = useState<string | null>(null);

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotNotRegistered, setForgotNotRegistered] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetOtpCooldown, setResetOtpCooldown] = useState(0);

  // Countdown timer for reset OTP resend
  useEffect(() => {
    if (resetOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetOtpCooldown]);

  const handleStartForgotPassword = () => {
    clearAllErrors();
    setSignInSuccessMessage(null);
    setForgotEmail(email.trim());
    setForgotOtp("");
    setForgotToken("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotStep(1);
    setForgotError(null);
    setForgotSuccess(null);
    setForgotNotRegistered(false);
    setMode("FORGOT_PASSWORD");
  };

  const handleSendResetOtp = async () => {
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean) {
      setForgotError("Please provide your email address to reset your password.");
      return;
    }
    if (!clean.includes("@") || !clean.includes(".")) {
      setForgotError("Please enter a valid email address format.");
      return;
    }

    setIsSendingResetOtp(true);
    setForgotError(null);
    setForgotNotRegistered(false);

    try {
      const res = await sendPasswordResetOtp(clean);
      if (res.notRegistered) {
        setForgotNotRegistered(true);
        setForgotError(res.error || "No registered account found with this email address. Please create an account.");
      } else if (!res.success) {
        setForgotError(res.error || "Failed to send verification code. Please try again.");
      } else {
        setForgotSuccess(res.message || `Verification code sent to ${clean}. Please check your inbox or spam.`);
        setForgotStep(2);
        setResetOtpCooldown(60);
      }
    } catch (err: any) {
      setForgotError(err?.message || "An unexpected error occurred while sending verification code.");
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setForgotError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingResetOtp(true);
    setForgotError(null);

    try {
      const res = await verifyOtp(forgotEmail.trim(), cleanOtp);
      if (!res.success || !res.token) {
        setForgotError(res.error || "Invalid verification code entered.");
      } else {
        setForgotToken(res.token);
        setForgotStep(3);
        setForgotSuccess("Email successfully verified! Enter your new password below.");
      }
    } catch (err: any) {
      setForgotError(err?.message || "An unexpected error occurred during verification.");
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("New password and confirmation password do not match.");
      return;
    }

    setIsResettingPassword(true);
    setForgotError(null);

    try {
      const res = await resetPassword({
        email: forgotEmail.trim(),
        token: forgotToken,
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      if (!res.success) {
        setForgotError(res.error || "Failed to update password. Please try again.");
      } else {
        // Redirect back to sign in with pre-filled email and success message
        setEmail(forgotEmail.trim());
        if (res.suggestedRole) {
          setRole(res.suggestedRole);
        }
        setSignInSuccessMessage(res.message || "Password reset successfully! Please sign in with your new password.");
        setMode("SIGN_IN");
        setForgotStep(1);
        setForgotOtp("");
        setForgotToken("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotError(null);
        setForgotSuccess(null);
      }
    } catch (err: any) {
      setForgotError(err?.message || "An unexpected error occurred while resetting password.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  useEffect(() => {
    if (signInState?.error) {
      setDisplayedSignInError(signInState.error);
      setSignInErrorRole(role);
    }
  }, [signInState]);

  useEffect(() => {
    if (citizenSignUpState?.error) {
      setDisplayedCitizenSignUpError(citizenSignUpState.error);
    }
  }, [citizenSignUpState]);

  useEffect(() => {
    if (orgSignUpState?.error) {
      setDisplayedOrgSignUpError(orgSignUpState.error);
    }
  }, [orgSignUpState]);

  useEffect(() => {
    if (workerSignUpState?.error) {
      setDisplayedWorkerSignUpError(workerSignUpState.error);
    }
  }, [workerSignUpState]);

  const clearAllErrors = () => {
    setDisplayedSignInError(null);
    setSignInErrorRole(null);
    setDisplayedCitizenSignUpError(null);
    setDisplayedOrgSignUpError(null);
    setDisplayedWorkerSignUpError(null);
    setEmailCheck(null);
    setForgotError(null);
    setForgotSuccess(null);
    setForgotNotRegistered(false);
  };

  // Check email domain registration status when email, role, or mode changes
  const runEmailDomainCheck = async (
    emailToCheck: string,
    targetRole: RoleCategory,
    targetMode: "SIGN_IN" | "SIGN_UP" = mode === "SIGN_UP" ? "SIGN_UP" : "SIGN_IN"
  ) => {
    if (mode === "FORGOT_PASSWORD") {
      setEmailCheck(null);
      return;
    }
    const clean = emailToCheck.trim();
    if (!clean || !clean.includes("@")) {
      setEmailCheck(null);
      return;
    }
    setIsCheckingEmail(true);
    try {
      const res = await checkEmailDomainStatus(clean, targetRole, targetMode);
      setEmailCheck(res);
    } catch {
      setEmailCheck(null);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleRoleChange = (newRole: RoleCategory) => {
    setRole(newRole);
    clearAllErrors();
    if (email.trim() && mode !== "FORGOT_PASSWORD") {
      runEmailDomainCheck(email.trim(), newRole, mode === "SIGN_UP" ? "SIGN_UP" : "SIGN_IN");
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    clearAllErrors();
    if (email.trim() && newMode !== "FORGOT_PASSWORD") {
      runEmailDomainCheck(email.trim(), role, newMode === "SIGN_UP" ? "SIGN_UP" : "SIGN_IN");
    }
  };

  const handleEmailChange = (newVal: string) => {
    setEmail(newVal);
    // When the user changes the email, previous error message is NOT visible!
    clearAllErrors();
  };

  // Live debounced check as the user types
  useEffect(() => {
    if (mode === "FORGOT_PASSWORD") {
      setEmailCheck(null);
      return;
    }
    const clean = email.trim();
    if (!clean || !clean.includes("@") || clean.length < 5) {
      setEmailCheck(null);
      return;
    }
    const timer = setTimeout(() => {
      runEmailDomainCheck(clean, role, mode === "SIGN_UP" ? "SIGN_UP" : "SIGN_IN");
    }, 400);
    return () => clearTimeout(timer);
  }, [email, role, mode]);

  // Track email verification status for Citizen, Organization, and Field Worker
  const [isCitizenEmailVerified, setIsCitizenEmailVerified] = useState(false);
  const [isAdminEmailVerified, setIsAdminEmailVerified] = useState(false);
  const [isOfficialEmailVerified, setIsOfficialEmailVerified] = useState(false);
  const [isWorkerEmailVerified, setIsWorkerEmailVerified] = useState(false);

  // Dynamic Theme Colors and Metadata
  const roleConfig = {
    CITIZEN: {
      name: "Citizen",
      badge: "Public Resident",
      description: "Report civic issues, track live repairs, and verify resolution evidence.",
      icon: User,
      color: "blue",
      activeTabClass: "bg-white text-blue-600 shadow-sm border border-slate-200/80 ring-1 ring-blue-500/20",
      iconBgClass: "bg-blue-50 text-blue-600 border border-blue-100",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    },
    ORGANIZATION: {
      name: "Organization",
      badge: "Municipal & Utility",
      description: "Coordinate municipal operations, review grievances, and dispatch work orders.",
      icon: Building2,
      color: "orange",
      activeTabClass: "bg-white text-orange-600 shadow-sm border border-slate-200/80 ring-1 ring-orange-500/20",
      iconBgClass: "bg-orange-50 text-orange-600 border border-orange-100",
      btnClass: "bg-orange-600 hover:bg-orange-700 text-white shadow-sm",
    },
    WORKER: {
      name: "Field Worker",
      badge: "Service Technician",
      description: "Receive on-site work tasks, upload before/after photos, and complete GPS repairs.",
      icon: HardHat,
      color: "indigo",
      activeTabClass: "bg-white text-indigo-600 shadow-sm border border-slate-200/80 ring-1 ring-indigo-500/20",
      iconBgClass: "bg-indigo-50 text-indigo-600 border border-indigo-100",
      btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    },
  }[role];

  const CurrentIcon = roleConfig.icon;
  const isPending = isSignInPending || isCitizenPending || isOrgPending || isWorkerPending;

  return (
    <div className="flex-1 flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      <Card
        className={cn(
          "w-full border-slate-200/80 shadow-lg transition-all duration-300",
          role === "ORGANIZATION" && mode === "SIGN_UP" ? "max-w-2xl" : "max-w-md"
        )}
      >
        <CardHeader className="text-center space-y-3 pb-4">
          {/* Header Icon */}
          <div
            className={cn(
              "mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
              mode === "FORGOT_PASSWORD"
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : roleConfig.iconBgClass
            )}
          >
            {mode === "FORGOT_PASSWORD" ? (
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <CurrentIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>

          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {mode === "FORGOT_PASSWORD"
                ? "Reset Password"
                : mode === "SIGN_IN"
                ? `${roleConfig.name} Portal Sign In`
                : role === "CITIZEN"
                ? "New Citizen Registration"
                : role === "ORGANIZATION"
                ? "Civic Organization Onboarding"
                : "Field Worker Registration"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {mode === "FORGOT_PASSWORD"
                ? forgotStep === 1
                  ? "Enter your registered email address to receive an OTP verification code."
                  : forgotStep === 2
                  ? `Enter the 6-digit verification code sent to ${forgotEmail}.`
                  : "Create and confirm your new password below."
                : roleConfig.description}
            </CardDescription>
          </div>

          {/* If in FORGOT_PASSWORD mode: show step indicator */}
          {mode === "FORGOT_PASSWORD" && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors",
                  forgotStep === 1
                    ? "bg-amber-100 text-amber-900 font-semibold ring-1 ring-amber-400/40"
                    : "bg-slate-100 text-slate-500 font-medium"
                )}
              >
                <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span>Email</span>
              </div>
              <span className="text-slate-300 text-xs">→</span>
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors",
                  forgotStep === 2
                    ? "bg-amber-100 text-amber-900 font-semibold ring-1 ring-amber-400/40"
                    : "bg-slate-100 text-slate-500 font-medium"
                )}
              >
                <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span>OTP</span>
              </div>
              <span className="text-slate-300 text-xs">→</span>
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors",
                  forgotStep === 3
                    ? "bg-amber-100 text-amber-900 font-semibold ring-1 ring-amber-400/40"
                    : "bg-slate-100 text-slate-500 font-medium"
                )}
              >
                <span className="w-4 h-4 rounded-full bg-current text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span>Password</span>
              </div>
            </div>
          )}

          {/* 3 Role/Category Tabs (Citizen is Default) - Only in Sign In and Sign Up */}
          {mode !== "FORGOT_PASSWORD" && (
            <div className="pt-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
                Select User Category
              </label>
              <div
                className="grid grid-cols-3 gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100 rounded-xl border border-slate-200/60"
                role="tablist"
                aria-label="User Category Selector"
              >
                {/* 1. Citizen Tab (Default) */}
                <button
                  type="button"
                  role="tab"
                  id="tab-citizen"
                  aria-selected={role === "CITIZEN"}
                  onClick={() => handleRoleChange("CITIZEN")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer min-w-0",
                    role === "CITIZEN"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80 ring-1 ring-blue-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  <User className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="truncate max-w-full text-[11px] sm:text-xs">Citizen</span>
                  <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">
                    (Default)
                  </span>
                </button>

                {/* 2. Organization Tab */}
                <button
                  type="button"
                  role="tab"
                  id="tab-organization"
                  aria-selected={role === "ORGANIZATION"}
                  onClick={() => handleRoleChange("ORGANIZATION")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer min-w-0",
                    role === "ORGANIZATION"
                      ? "bg-white text-orange-600 shadow-sm border border-slate-200/80 ring-1 ring-orange-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  <Building2 className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="truncate max-w-full text-[11px] sm:text-xs">Organization</span>
                  <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">
                    Authority
                  </span>
                </button>

                {/* 3. Field Worker Tab */}
                <button
                  type="button"
                  role="tab"
                  id="tab-worker"
                  aria-selected={role === "WORKER"}
                  onClick={() => handleRoleChange("WORKER")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer min-w-0",
                    role === "WORKER"
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200/80 ring-1 ring-indigo-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  <HardHat className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="truncate max-w-full text-[11px] sm:text-xs">Field Worker</span>
                  <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">
                    Technician
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Mode Switch: Sign In vs Create Account / Register */}
          {mode !== "FORGOT_PASSWORD" && (
            <div className="flex items-center justify-center pt-1">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs">
                <button
                  type="button"
                  id="btn-mode-signin"
                  onClick={() => handleModeChange("SIGN_IN")}
                  className={cn(
                    "px-4 py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer",
                    mode === "SIGN_IN"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="btn-mode-signup"
                  onClick={() => handleModeChange("SIGN_UP")}
                  className={cn(
                    "px-4 py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer",
                    mode === "SIGN_UP"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {role === "ORGANIZATION" ? "Register Department" : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          {/* ======================================================== */}
          {/* MODE: SIGN IN (For Citizen, Organization, or Worker)     */}
          {/* ======================================================== */}
          {mode === "SIGN_IN" && (
            <form action={signInAction} className="space-y-4">
              <input type="hidden" name="intendedRole" value={role} />

              {signInSuccessMessage && (
                <div
                  id="signin-success-banner"
                  className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{signInSuccessMessage}</span>
                </div>
              )}

              {displayedSignInError && signInErrorRole === role && (
                <div
                  id="signin-error"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{displayedSignInError}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 pl-6">
                    {displayedSignInError.toLowerCase().includes("incorrect password") && (
                      <button
                        type="button"
                        id="btn-signin-error-forgot-password"
                        onClick={handleStartForgotPassword}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Forgot Password? Reset Here <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {displayedSignInError.toLowerCase().includes("not registered") && (
                      <button
                        type="button"
                        id="btn-signin-error-create-account"
                        onClick={() => handleModeChange("SIGN_UP")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Create New {roleConfig.name} Account <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {displayedSignInError.includes("Citizen portal") && (
                      <button
                        type="button"
                        onClick={() => {
                          handleRoleChange("CITIZEN");
                          handleModeChange("SIGN_IN");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Switch to Citizen Sign In <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {displayedSignInError.includes("Organization portal") && (
                      <button
                        type="button"
                        onClick={() => {
                          handleRoleChange("ORGANIZATION");
                          handleModeChange("SIGN_IN");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Switch to Organization Sign In <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {displayedSignInError.includes("Field Worker portal") && (
                      <button
                        type="button"
                        onClick={() => {
                          handleRoleChange("WORKER");
                          handleModeChange("SIGN_IN");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Switch to Field Worker Sign In <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Input
                  id="signin-email"
                  label={
                    role === "CITIZEN"
                      ? "Email Address"
                      : role === "ORGANIZATION"
                      ? "Official Admin Email"
                      : "Worker Email Address"
                  }
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    if (email.trim()) runEmailDomainCheck(email.trim(), role, "SIGN_IN");
                  }}
                  placeholder={
                    role === "CITIZEN"
                      ? "you@example.com"
                      : role === "ORGANIZATION"
                      ? "admin@pwd.gov.in"
                      : "worker@services.gov.in"
                  }
                  required
                  autoComplete="email"
                />

                {isCheckingEmail && (
                  <p className="text-[11px] text-slate-500 animate-pulse pl-1">
                    Checking {roleConfig.name} account registration status...
                  </p>
                )}

                {!isCheckingEmail && emailCheck && mode === "SIGN_IN" && (
                  <div className="pt-1">
                    {emailCheck.status === "NOT_REGISTERED" && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{emailCheck.message || `No ${roleConfig.name} account found with this email.`}</span>
                        </div>
                        <button
                          type="button"
                          id="btn-signin-live-create"
                          onClick={() => handleModeChange("SIGN_UP")}
                          className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:underline pl-5 cursor-pointer text-[11px]"
                        >
                          Create New {roleConfig.name} Account →
                        </button>
                      </div>
                    )}
                    {emailCheck.status === "DIFFERENT_ROLE" && (
                      <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-950 text-xs space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>{emailCheck.message}</span>
                        </div>
                        {emailCheck.actualRole && (
                          <button
                            type="button"
                            id="btn-switch-role-from-check"
                            onClick={() => {
                              const targetRole: RoleCategory =
                                emailCheck.actualRole === "WORKER"
                                  ? "WORKER"
                                  : emailCheck.actualRole === "ORG_MEMBER" ||
                                    emailCheck.actualRole === "PLATFORM_ADMIN"
                                  ? "ORGANIZATION"
                                  : "CITIZEN";
                              handleRoleChange(targetRole);
                              handleModeChange("SIGN_IN");
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-orange-800 hover:underline pl-5 cursor-pointer text-[11px]"
                          >
                            Switch to{" "}
                            {emailCheck.actualRole === "WORKER"
                              ? "Field Worker"
                              : emailCheck.actualRole === "ORG_MEMBER" ||
                                emailCheck.actualRole === "PLATFORM_ADMIN"
                              ? "Organization"
                              : "Citizen"}{" "}
                            Sign In →
                          </button>
                        )}
                      </div>
                    )}
                    {(emailCheck.status === "ALREADY_REGISTERED" ||
                      emailCheck.status === "AVAILABLE") && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 pl-1 font-medium animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{emailCheck.message || `Registered account found. Enter password to sign in as ${roleConfig.name}.`}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="signin-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    id="btn-forgot-password-link"
                    onClick={handleStartForgotPassword}
                    className={cn(
                      "text-xs font-semibold hover:underline cursor-pointer transition-colors",
                      role === "CITIZEN"
                        ? "text-blue-600 hover:text-blue-700"
                        : role === "ORGANIZATION"
                        ? "text-orange-600 hover:text-orange-700"
                        : "text-indigo-600 hover:text-indigo-700"
                    )}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                id="signin-submit"
                type="submit"
                className={cn("w-full mt-2 font-medium transition-all", roleConfig.btnClass)}
                isLoading={isPending}
              >
                Sign In as {roleConfig.name} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              <div className="pt-3 text-center text-xs text-slate-500">
                <span>Don&apos;t have an account yet? </span>
                <button
                  type="button"
                  id="link-toggle-to-signup"
                  onClick={() => handleModeChange("SIGN_UP")}
                  className={cn(
                    "font-semibold hover:underline cursor-pointer",
                    role === "CITIZEN"
                      ? "text-blue-600"
                      : role === "ORGANIZATION"
                      ? "text-orange-600"
                      : "text-indigo-600"
                  )}
                >
                  {role === "ORGANIZATION"
                    ? "Register Organization"
                    : role === "WORKER"
                    ? "Register as Field Worker"
                    : "Create Citizen Account"}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODE: FORGOT / RESET PASSWORD                            */}
          {/* ======================================================== */}
          {mode === "FORGOT_PASSWORD" && (
            <div className="space-y-4">
              {/* Step 1: Provide Email & Request OTP */}
              {forgotStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  {forgotError && (
                    <div
                      id="forgot-step1-error"
                      className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{forgotError}</span>
                      </div>
                      {forgotNotRegistered && (
                        <div className="pt-1 pl-6">
                          <button
                            type="button"
                            id="btn-forgot-not-registered-create"
                            onClick={() => {
                              setEmail(forgotEmail.trim());
                              handleModeChange("SIGN_UP");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-xs"
                          >
                            Create New Account with this Email <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Input
                      id="forgot-email"
                      label="Registered Account Email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setForgotError(null);
                        setForgotNotRegistered(false);
                      }}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                    <p className="text-[11px] text-slate-500 pl-1">
                      Enter the email address registered with your account. We will verify your registration and send a verification OTP code.
                    </p>
                  </div>

                  <Button
                    type="button"
                    id="btn-forgot-send-otp"
                    onClick={handleSendResetOtp}
                    isLoading={isSendingResetOtp}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  >
                    Send Verification Code <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      id="btn-forgot-step1-back-to-signin"
                      onClick={() => {
                        setMode("SIGN_IN");
                        clearAllErrors();
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Enter & Verify 6-digit OTP */}
              {forgotStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Verification code sent to <strong>{forgotEmail}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotError(null);
                      }}
                      className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {forgotError && (
                    <div
                      id="forgot-step2-error"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in"
                    >
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="space-y-2 text-center">
                    <label
                      htmlFor="forgot-otp"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      id="forgot-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setForgotOtp(val);
                        setForgotError(null);
                      }}
                      placeholder="123456"
                      className="w-full max-w-[240px] mx-auto text-center font-mono text-2xl tracking-[0.4em] py-2.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold text-slate-800 bg-white"
                      autoFocus
                    />
                  </div>

                  <div className="text-center text-xs text-slate-500">
                    {resetOtpCooldown > 0 ? (
                      <span>
                        Resend code in <strong className="text-slate-700">{resetOtpCooldown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        id="btn-forgot-resend-otp"
                        onClick={handleSendResetOtp}
                        disabled={isSendingResetOtp}
                        className="text-amber-700 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Resend Verification Code
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    id="btn-forgot-verify-otp"
                    onClick={handleVerifyResetOtp}
                    isLoading={isVerifyingResetOtp}
                    disabled={forgotOtp.length !== 6}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  >
                    Verify Code & Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      id="btn-forgot-step2-back-to-signin"
                      onClick={() => {
                        setMode("SIGN_IN");
                        clearAllErrors();
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Enter New Password and Confirm Password */}
              {forgotStep === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Identity verified for <strong>{forgotEmail}</strong>. Please choose your new password.
                    </span>
                  </div>

                  {forgotError && (
                    <div
                      id="forgot-step3-error"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in"
                    >
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <Input
                    id="forgot-new-password"
                    label="New Password"
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => {
                      setForgotNewPassword(e.target.value);
                      setForgotError(null);
                    }}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />

                  <Input
                    id="forgot-confirm-password"
                    label="Confirm New Password"
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => {
                      setForgotConfirmPassword(e.target.value);
                      setForgotError(null);
                    }}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />

                  <Button
                    type="button"
                    id="btn-forgot-submit-password"
                    onClick={handleResetPasswordSubmit}
                    isLoading={isResettingPassword}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  >
                    Save Password & Return to Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      id="btn-forgot-step3-back-to-signin"
                      onClick={() => {
                        setMode("SIGN_IN");
                        clearAllErrors();
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Cancel and Return to Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE: SIGN UP - CITIZEN FORM                             */}
          {/* ======================================================== */}
          {mode === "SIGN_UP" && role === "CITIZEN" && (
            <form action={citizenSignUpAction} className="space-y-4">
              {displayedCitizenSignUpError && (
                <div
                  id="citizen-signup-error"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{displayedCitizenSignUpError}</span>
                  </div>
                  {displayedCitizenSignUpError.toLowerCase().includes("already registered") && (
                    <div className="pt-1 pl-6 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        id="btn-citizen-switch-to-login"
                        onClick={() => handleModeChange("SIGN_IN")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-xs"
                      >
                        Sign In with this Email <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Input
                id="citizen-fullname"
                label="Full Name"
                name="fullName"
                placeholder="e.g. Rahul Sharma"
                required
                autoComplete="name"
              />

              {/* Citizen Email with SMTP OTP Verification */}
              <EmailOtpField
                id="citizen-email"
                label="Citizen Email Address (Verified via SMTP OTP)"
                name="email"
                value={email}
                onEmailChange={handleEmailChange}
                onSwitchToSignIn={(emailToUse) => {
                  if (emailToUse) setEmail(emailToUse);
                  handleModeChange("SIGN_IN");
                }}
                domainRole="CITIZEN"
                placeholder="rahul@example.com"
                roleContext="Citizen"
                tokenInputName="citizenEmailVerificationToken"
                accentColor="blue"
                onVerifiedChange={(verified) => setIsCitizenEmailVerified(verified)}
                required
              />

              <Input
                id="citizen-phone"
                label="Mobile Number (for SMS & Resolution Alerts)"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                required
                autoComplete="tel"
              />

              <Input
                id="citizen-password"
                label="Create Password (min. 6 characters)"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 text-blue-900 text-[11px] flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Public citizen registration enables verified grievance lodging and live tracking.
                  Personal contact information is strictly protected from public transparency views.
                </span>
              </div>

              <Button
                id="citizen-signup-submit"
                type="submit"
                disabled={!isCitizenEmailVerified || isPending}
                className={cn(
                  "w-full mt-2 font-medium transition-all",
                  isCitizenEmailVerified
                    ? roleConfig.btnClass
                    : "bg-slate-300 hover:bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                )}
                isLoading={isPending}
              >
                {isCitizenEmailVerified ? (
                  <>
                    Create Citizen Account <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                ) : (
                  "Verify Email with OTP to Register"
                )}
              </Button>

              <div className="pt-3 text-center text-xs text-slate-500">
                <span>Already registered? </span>
                <button
                  type="button"
                  id="link-citizen-to-signin"
                  onClick={() => handleModeChange("SIGN_IN")}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Sign In as Citizen
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODE: SIGN UP - ORGANIZATION FORM                        */}
          {/* ======================================================== */}
          {mode === "SIGN_UP" && role === "ORGANIZATION" && (
            <form action={orgSignUpAction} className="space-y-5">
              {displayedOrgSignUpError && (
                <div
                  id="org-signup-error"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{displayedOrgSignUpError}</span>
                  </div>
                  {displayedOrgSignUpError.toLowerCase().includes("already registered") && (
                    <div className="pt-1 pl-6">
                      <button
                        type="button"
                        id="btn-org-switch-to-login"
                        onClick={() => handleModeChange("SIGN_IN")}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Sign In to Organization Now <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Section 1: Administrator Credentials */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  <span>1. Official Authority Administrator Account</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="org-admin-name"
                    label="Official Contact Person"
                    name="adminName"
                    placeholder="e.g. Ramesh Kumar (Director)"
                    required
                  />

                  {/* Admin Email with SMTP OTP Verification */}
                  <div className="sm:col-span-2">
                    <EmailOtpField
                      id="org-admin-email"
                      label="Admin Login Email (Verified via SMTP OTP)"
                      name="adminEmail"
                      value={email}
                      onEmailChange={handleEmailChange}
                      onSwitchToSignIn={(emailToUse) => {
                        if (emailToUse) setEmail(emailToUse);
                        handleRoleChange("ORGANIZATION");
                        handleModeChange("SIGN_IN");
                      }}
                      domainRole="ORGANIZATION"
                      placeholder="ramesh@pwd.gov.in"
                      roleContext="Authority Admin"
                      tokenInputName="adminEmailVerificationToken"
                      accentColor="orange"
                      onVerifiedChange={(verified) => setIsAdminEmailVerified(verified)}
                      required
                    />
                  </div>

                  <Input
                    id="org-admin-phone"
                    label="Official Mobile Phone"
                    name="adminPhone"
                    type="tel"
                    placeholder="+91 98765 00000"
                    required
                  />
                  <Input
                    id="org-admin-password"
                    label="Secure Password"
                    name="adminPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Section 2: Department Profile */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>2. Department Profile & Jurisdiction</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="org-name"
                    label="Organization / Department Name"
                    name="orgName"
                    placeholder="e.g. Public Works Department, Zone 3"
                    required
                  />

                  <div className="w-full space-y-1.5">
                    <label
                      htmlFor="org-type-select"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Department Type
                    </label>
                    <select
                      id="org-type-select"
                      name="orgType"
                      required
                      defaultValue="PUBLIC_WORKS"
                      className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      <option value="MUNICIPALITY">Municipality & City Corp</option>
                      <option value="PUBLIC_WORKS">Public Works (Roads, Bridges)</option>
                      <option value="WATER_BOARD">Water & Sewerage Board</option>
                      <option value="ELECTRICITY_BOARD">Electricity & Streetlights</option>
                      <option value="TRANSPORT_AUTHORITY">Transport Authority</option>
                      <option value="SANITATION">Sanitation & Waste Management</option>
                      <option value="OTHER">Other Public Utility</option>
                    </select>
                  </div>

                  <Input
                    id="org-reg-number"
                    label="Government Registration / Act Number"
                    name="registrationNumber"
                    placeholder="e.g. GOV-REG-2024-8841"
                    required
                  />

                  <Input
                    id="org-official-phone"
                    label="Department Official Desk Phone"
                    name="officialPhone"
                    placeholder="080-2223344"
                    required
                  />

                  {/* Official Department Email with SMTP OTP Verification */}
                  <div className="sm:col-span-2">
                    <EmailOtpField
                      id="org-official-email"
                      label="Official Department Email (Verified via SMTP OTP)"
                      name="officialEmail"
                      domainRole="ORGANIZATION"
                      onSwitchToSignIn={() => {
                        handleRoleChange("ORGANIZATION");
                        handleModeChange("SIGN_IN");
                      }}
                      placeholder="contact@pwd.gov.in"
                      roleContext="Department Official"
                      tokenInputName="officialEmailVerificationToken"
                      accentColor="orange"
                      onVerifiedChange={(verified) => setIsOfficialEmailVerified(verified)}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Textarea
                      id="org-address"
                      label="Headquarters Physical Address"
                      name="address"
                      placeholder="Floor 4, Municipal Corporation Complex, Main Road..."
                      required
                    />
                  </div>

                  <input
                    type="hidden"
                    name="verificationDocUrl"
                    value="GOV-OFFICIAL-AFFILIATION-VERIFIED"
                  />
                </div>
              </div>

              {/* Dual Email Verification Checklist Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  className={cn(
                    "p-2.5 rounded-lg border flex items-center gap-2 transition-colors",
                    isAdminEmailVerified
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isAdminEmailVerified ? "text-emerald-600" : "text-slate-300"
                    )}
                  />
                  <span>Admin Contact Email: {isAdminEmailVerified ? "Verified ✓" : "Requires OTP"}</span>
                </div>
                <div
                  className={cn(
                    "p-2.5 rounded-lg border flex items-center gap-2 transition-colors",
                    isOfficialEmailVerified
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isOfficialEmailVerified ? "text-emerald-600" : "text-slate-300"
                    )}
                  />
                  <span>Department Email: {isOfficialEmailVerified ? "Verified ✓" : "Requires OTP"}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Verification Notice:</strong> Both official email addresses must be verified via
                  SMTP one-time passcodes before submission. Upon registration, your department is placed in{" "}
                  <em>PENDING_VERIFICATION</em> until Platform Administration activates full dispatch access.
                </span>
              </div>

              <Button
                id="org-signup-submit"
                type="submit"
                disabled={!isAdminEmailVerified || !isOfficialEmailVerified || isPending}
                className={cn(
                  "w-full text-base font-medium transition-all",
                  isAdminEmailVerified && isOfficialEmailVerified
                    ? roleConfig.btnClass
                    : "bg-slate-300 hover:bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                )}
                isLoading={isPending}
              >
                {isAdminEmailVerified && isOfficialEmailVerified ? (
                  <>
                    Register Organization <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                ) : (
                  "Verify Both Emails with OTP to Register"
                )}
              </Button>

              <div className="pt-2 text-center text-xs text-slate-500">
                <span>Already registered? </span>
                <button
                  type="button"
                  id="link-org-to-signin"
                  onClick={() => handleModeChange("SIGN_IN")}
                  className="font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  Sign In to Organization
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODE: SIGN UP - FIELD WORKER FORM                        */}
          {/* ======================================================== */}
          {mode === "SIGN_UP" && role === "WORKER" && (
            <form action={workerSignUpAction} className="space-y-4">
              {displayedWorkerSignUpError && (
                <div
                  id="worker-signup-error"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs space-y-2 animate-in fade-in"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{displayedWorkerSignUpError}</span>
                  </div>
                  {displayedWorkerSignUpError.toLowerCase().includes("already registered") && (
                    <div className="pt-1 pl-6">
                      <button
                        type="button"
                        id="btn-worker-switch-to-login"
                        onClick={() => handleModeChange("SIGN_IN")}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Sign In as Field Worker Now <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Input
                id="worker-fullname"
                label="Full Name"
                name="fullName"
                placeholder="e.g. Suresh Patel"
                required
                autoComplete="name"
              />

              {/* Worker Email with SMTP OTP Verification */}
              <EmailOtpField
                id="worker-email"
                label="Worker Email Address (Verified via SMTP OTP)"
                name="email"
                value={email}
                onEmailChange={handleEmailChange}
                onSwitchToSignIn={(emailToUse) => {
                  if (emailToUse) setEmail(emailToUse);
                  handleRoleChange("WORKER");
                  handleModeChange("SIGN_IN");
                }}
                domainRole="WORKER"
                placeholder="suresh.worker@civic.gov.in"
                roleContext="Field Worker"
                tokenInputName="workerEmailVerificationToken"
                accentColor="indigo"
                onVerifiedChange={(verified) => setIsWorkerEmailVerified(verified)}
                required
              />

              <Input
                id="worker-phone"
                label="Mobile Phone (for SMS dispatch & on-site alerts)"
                name="phone"
                type="tel"
                placeholder="+91 98765 11223"
                required
                autoComplete="tel"
              />

              <div className="w-full space-y-1.5">
                <label
                  htmlFor="worker-skill-select"
                  className="block text-sm font-medium text-slate-700"
                >
                  Primary Technical Specialization
                </label>
                <select
                  id="worker-skill-select"
                  name="skill"
                  required
                  defaultValue="Roads & Pothole Repair"
                  className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="Roads & Pothole Repair">Roads & Pothole Repair</option>
                  <option value="Electrical & Streetlights">Electrical & Streetlights</option>
                  <option value="Water Works & Sewerage Pipeline">Water Works & Sewerage Pipeline</option>
                  <option value="Sanitation & Waste Management">Sanitation & Waste Management</option>
                  <option value="Parks & Public Infrastructure">Parks & Public Infrastructure</option>
                  <option value="General Municipal Maintenance">General Municipal Maintenance</option>
                </select>
              </div>

              <Input
                id="worker-password"
                label="Create Password (min. 6 characters)"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-indigo-900 text-[11px] flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Technician accounts are connected to verified municipal service dispatch. You will receive
                  real-time task assignments with on-site GPS verification and repair evidence uploads.
                </span>
              </div>

              <Button
                id="worker-signup-submit"
                type="submit"
                disabled={!isWorkerEmailVerified || isPending}
                className={cn(
                  "w-full mt-2 font-medium transition-all",
                  isWorkerEmailVerified
                    ? roleConfig.btnClass
                    : "bg-slate-300 hover:bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                )}
                isLoading={isPending}
              >
                {isWorkerEmailVerified ? (
                  <>
                    Register Field Worker Account <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                ) : (
                  "Verify Email with OTP to Register"
                )}
              </Button>

              <div className="pt-3 text-center text-xs text-slate-500">
                <span>Already registered as a technician? </span>
                <button
                  type="button"
                  id="link-worker-to-signin"
                  onClick={() => handleModeChange("SIGN_IN")}
                  className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Sign In as Field Worker
                </button>
              </div>
            </form>
          )}

          {/* Quick Category Switch Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Switch category:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange("CITIZEN")}
                className={cn(
                  "hover:underline font-medium cursor-pointer",
                  role === "CITIZEN" ? "text-blue-600 font-bold" : "text-slate-600"
                )}
              >
                Citizen
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleRoleChange("ORGANIZATION")}
                className={cn(
                  "hover:underline font-medium cursor-pointer",
                  role === "ORGANIZATION" ? "text-orange-600 font-bold" : "text-slate-600"
                )}
              >
                Organization
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleRoleChange("WORKER")}
                className={cn(
                  "hover:underline font-medium cursor-pointer",
                  role === "WORKER" ? "text-indigo-600 font-bold" : "text-slate-600"
                )}
              >
                Field Worker
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-10 px-4">
          <div className="text-sm text-slate-500 font-medium">Loading authentication portal...</div>
        </div>
      }
    >
      <AuthPortal />
    </Suspense>
  );
}
