"use client";

import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2, KeyRound, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendOtp, verifyOtp } from "@/server/actions/otp";
import { cn } from "@/lib/utils";

interface EmailOtpFieldProps {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  roleContext: "Field Worker" | "Authority Admin" | "Department Official";
  tokenInputName: string;
  accentColor?: "blue" | "orange" | "indigo";
  onVerifiedChange?: (verified: boolean, email: string) => void;
  required?: boolean;
}

export function EmailOtpField({
  id,
  label,
  name,
  placeholder,
  roleContext,
  tokenInputName,
  accentColor = "blue",
  onVerifiedChange,
  required = true,
}: EmailOtpFieldProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setErrorMsg(null); // Clear previous error immediately when user edits email
    if (isVerified) {
      // Reset verification if user modifies email
      setIsVerified(false);
      setVerifiedToken("");
      setOtpSent(false);
      setOtp("");
      setSuccessMsg(null);
      onVerifiedChange?.(false, newEmail);
    }
  };

  const handleSendOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address first.");
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await sendOtp(cleanEmail, roleContext);
      if (res.success) {
        setOtpSent(true);
        setSuccessMsg(res.message || `Verification code sent to ${cleanEmail}`);
        setResendCooldown(45);
      } else {
        setErrorMsg(res.error || "Failed to send verification code.");
      }
    } catch {
      setErrorMsg("Failed to deliver OTP via SMTP. Please check connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifyOtp(email, cleanOtp);
      if (res.success && res.token) {
        setIsVerified(true);
        setVerifiedToken(res.token);
        setSuccessMsg("Email successfully verified!");
        setErrorMsg(null);
        onVerifiedChange?.(true, email);
      } else {
        setErrorMsg(res.error || "Invalid code. Please try again.");
      }
    } catch {
      setErrorMsg("Verification request failed. Please retry.");
    } finally {
      setIsVerifying(false);
    }
  };

  const colorStyles = {
    blue: {
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
      border: "border-blue-500",
      ring: "focus:ring-blue-500",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    },
    orange: {
      btn: "bg-orange-600 hover:bg-orange-700 text-white",
      border: "border-orange-500",
      ring: "focus:ring-orange-500",
      badge: "bg-orange-50 text-orange-700 border-orange-200",
    },
    indigo: {
      btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
      border: "border-indigo-500",
      ring: "focus:ring-indigo-500",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
  }[accentColor];

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {isVerified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified via SMTP
          </span>
        ) : (
          <span className="text-[11px] font-medium text-amber-600">
            Requires Email OTP Verification
          </span>
        )}
      </div>

      {/* Main Email Input + Action Button */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            name={name}
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder={placeholder}
            required={required}
            readOnly={isVerified}
            className={cn(
              "flex h-11 w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
              isVerified
                ? "border-emerald-400 bg-emerald-50/20 text-emerald-950 font-medium cursor-not-allowed"
                : "border-slate-300 focus:outline-none focus:ring-2",
              !isVerified && colorStyles.ring
            )}
          />
        </div>

        {!isVerified ? (
          <Button
            type="button"
            id={`${id}-send-otp-btn`}
            onClick={handleSendOtp}
            disabled={isSending || !email.includes("@") || resendCooldown > 0}
            className={cn(
              "h-11 px-4 text-xs font-semibold shrink-0 cursor-pointer transition-all",
              colorStyles.btn
            )}
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend (${resendCooldown}s)`
            ) : otpSent ? (
              "Resend Code"
            ) : (
              "Send OTP"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsVerified(false);
              setVerifiedToken("");
              onVerifiedChange?.(false, email);
            }}
            className="h-11 px-3 text-xs text-slate-600 border-slate-300 hover:bg-slate-100 shrink-0"
          >
            Change
          </Button>
        )}
      </div>

      {/* Hidden input carrying the cryptographically signed token */}
      <input type="hidden" name={tokenInputName} value={verifiedToken} />

      {/* OTP Entry Section (Shown once code is sent and not yet verified) */}
      {otpSent && !isVerified && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              Enter 6-Digit Verification Code
            </span>
            <span className="text-[11px] text-slate-500">Sent to {email}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              id={`${id}-otp-input`}
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 482915"
              className="flex h-10 w-40 tracking-widest text-center font-mono font-bold text-base rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="button"
              id={`${id}-verify-btn`}
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.trim().length !== 6}
              className={cn("h-10 px-4 text-xs font-semibold shrink-0 cursor-pointer", colorStyles.btn)}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.toLowerCase().includes("already registered") && (
            <div className="pl-5 pt-0.5">
              <a
                href="/login?mode=signin"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Already registered? Please sign in here →
              </a>
            </div>
          )}
        </div>
      )}
      {successMsg && !errorMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
