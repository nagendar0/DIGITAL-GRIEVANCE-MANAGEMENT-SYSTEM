"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  ChevronDown, 
  LayoutDashboard, 
  Bell, 
  MapPin, 
  LogOut, 
  CheckCircle
} from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { ThemeToggleItem } from "./theme-toggle";
import { getDashboardRoute } from "@/lib/auth/routes";

interface UserNavDropdownProps {
  userRole?: string | null;
  userEmail: string;
  unreadCount?: number;
}

export function UserNavDropdown({
  userRole,
  userEmail,
  unreadCount = 0,
}: UserNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const dashboardRoute = getDashboardRoute(userRole);

  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button in Top Right Corner */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        aria-label="User menu"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20 dark:ring-blue-400/30 shadow-md shadow-blue-500/20">
          {initial}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Downside Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-68 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-2xl shadow-slate-900/20 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Profile Header */}
          <div className="p-4 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {userEmail}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    {userRole || "CITIZEN"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1 text-xs">
            <Link
              href={dashboardRoute}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>My Dashboard</span>
            </Link>

            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-slate-500" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            {(!userRole || userRole === "CITIZEN") && (
              <Link
                href="/citizen/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Report Grievance</span>
              </Link>
            )}

            <Link
              href="/public"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Transparency Portal</span>
            </Link>


            {/* Theme Toggle Option (Black/White) */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <ThemeToggleItem />
            </div>

            {/* Sign Out Action */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <form action={signOut} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
