"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Shield, 
  MapPin, 
  CheckCircle, 
  Menu, 
  X, 
  Bell,
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";
import { UserNavDropdown } from "./user-nav-dropdown";
import { ThemeToggleItem } from "./theme-toggle";
import { getDashboardRoute } from "@/lib/auth/routes";

interface NavbarProps {
  userRole?: string | null;
  userEmail?: string | null;
  unreadCount?: number;
}

export function Navbar({ userRole, userEmail, unreadCount = 0 }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Determine active context role based on current portal path
  const activeRole = pathname.startsWith("/citizen")
    ? "CITIZEN"
    : pathname.startsWith("/worker")
    ? "WORKER"
    : pathname.startsWith("/org")
    ? "ORG_MEMBER"
    : pathname.startsWith("/admin")
    ? "PLATFORM_ADMIN"
    : userRole || "CITIZEN";

  const dashboardRoute = getDashboardRoute(activeRole);

  // "Report Grievance" is ONLY visible in Citizen portal or public citizen views,
  // NEVER in Worker or Organization dashboards/routes
  const isWorkerOrOrgSection =
    pathname.startsWith("/worker") ||
    pathname.startsWith("/org") ||
    pathname.startsWith("/admin");

  const canReportGrievance =
    !isWorkerOrOrgSection &&
    (activeRole === "CITIZEN" || pathname.startsWith("/citizen"));

  return (
    <header
      className={`w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#090d16]/85 backdrop-blur-xl transition-all duration-300 shadow-xs dark:shadow-2xl dark:shadow-slate-950/40 ${
        isAuthPage ? "relative" : "sticky top-0 z-50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo - Navigates to Dashboard if logged in, otherwise Landing Page */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href={userEmail ? dashboardRoute : "/"} className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/40 shrink-0">
                <Shield className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
                  Resolve<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400">AI</span>
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest block -mt-0.5 truncate max-w-[130px] sm:max-w-none">
                  Verified Grievance OS
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav - ONLY visible on the landing page as an elegant floating island */}
          {isLandingPage && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-full border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md shadow-2xs">
              <Link
                href="/#how-it-works"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all duration-200"
              >
                How it works
              </Link>
              <Link
                href="/#roles"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all duration-200"
              >
                Roles
              </Link>

              <Link
                href="/public"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Transparency portal
              </Link>
            </nav>
          )}

          {/* CTAs / User Section in Top Right Corner */}
          <div className="hidden md:flex items-center gap-3">
            {userEmail ? (
              <div className="flex items-center gap-3">
                {/* Only visible in Citizen Dashboard / Citizen accounts — NOT in Worker or Org dashboards */}
                {canReportGrievance && (
                  <Link href="/citizen/new">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Report Grievance</span>
                    </button>
                  </Link>
                )}

                <Link
                  href="/notifications"
                  className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                  )}
                </Link>

                {/* Profile dropdown menu with profile info, dashboard, theme black/white, and sign out */}
                <UserNavDropdown
                  userEmail={userEmail}
                  userRole={activeRole}
                  unreadCount={unreadCount}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link href="/login">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    Sign In
                  </button>
                </Link>
                {canReportGrievance && !isAuthPage && (
                  <Link href="/citizen/new">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Report Grievance</span>
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-1 sm:gap-2">
            {userEmail && (
              <Link href="/notifications" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 active:bg-slate-100 dark:active:bg-slate-800 transition-colors" aria-label="View notifications">
                <Bell className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Landing navigation links if on homepage */}
          {isLandingPage && (
            <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Link
                href="/#how-it-works"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2.5 min-h-[44px] rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
              >
                How it works
              </Link>
              <Link
                href="/#roles"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2.5 min-h-[44px] rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
              >
                Roles
              </Link>
              <Link
                href="/public"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 p-2.5 min-h-[44px] rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
              >
                Transparency portal
              </Link>
            </div>
          )}

          {/* User profile & actions when logged in */}
          {userEmail ? (
            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userEmail}
                  </p>
                  <span className="text-[10px] font-mono uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-semibold inline-block mt-0.5">
                    {activeRole}
                  </span>
                </div>
              </div>

              <Link
                href={dashboardRoute}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>My Dashboard</span>
              </Link>

              {canReportGrievance && (
                <Link
                  href="/citizen/new"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-medium text-sm transition-colors"
                >
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>Report Grievance</span>
                </Link>
              )}

              {/* Theme Toggle in Mobile */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <ThemeToggleItem />
              </div>

              {/* Sign Out */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl text-red-600 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
              <Link href="/citizen/new" onClick={() => setIsOpen(false)} className="w-full">
                <Button variant="accent" className="w-full min-h-[44px] text-sm">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  Report a Grievance
                </Button>
              </Link>
              <Link href="/login" onClick={() => setIsOpen(false)} className="w-full">
                <Button variant="outline" className="w-full min-h-[44px] text-sm">
                  Sign In
                </Button>
              </Link>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <ThemeToggleItem />
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
