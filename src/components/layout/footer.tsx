import React from "react";
import Link from "next/link";
import { Shield, CheckCircle, Lock, Compass, FileText } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Resolve<span className="text-blue-500">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Open, accountable civic grievance resolution infrastructure. Powered by AI triage, mathematical GPS verification, and strict human organization sign-off.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Platform Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#how-it-works" className="hover:text-white transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/#roles" className="hover:text-white transition-colors">
                  Roles Overview
                </Link>
              </li>
              <li>
                <Link href="/public" className="hover:text-white transition-colors">
                  Transparency Portal
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Access & Onboarding */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Get Started
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/citizen/new" className="hover:text-white transition-colors">
                  Report a Problem
                </Link>
              </li>
              <li>
                <Link href="/register-organization" className="hover:text-white transition-colors">
                  Onboard Municipal Body / Dept
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In to Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Verification Principles & Integrity */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Security & Verification
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Haversine GPS Verification</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero Client Role Escalation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Privacy-Safe Public Derivation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Immutable State Machine Audit</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} ResolveAI. Built on Supabase, Gemini 2.5 Flash & Next.js.
          </p>
          <p className="text-[11px] text-slate-500">
            GPS verification corroborates on-site technician location; human organization approval is strictly mandatory for closure.
          </p>
        </div>
      </div>
    </footer>
  );
}
