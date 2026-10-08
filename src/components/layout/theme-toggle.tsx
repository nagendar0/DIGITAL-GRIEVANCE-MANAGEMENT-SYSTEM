"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check initial preference from localStorage or class
    const savedTheme = localStorage.getItem("resolveai-theme") as "light" | "dark" | null;
    const isDark = savedTheme === "dark" || (!savedTheme && document.documentElement.classList.contains("dark"));
    
    if (isDark) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("resolveai-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return { theme, toggleTheme };
}

export function ThemeToggleItem() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {theme === "dark" ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        <span>Theme</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
        {theme === "dark" ? "Black" : "White"}
      </span>
    </button>
  );
}
