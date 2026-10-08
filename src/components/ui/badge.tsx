import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-300",
    success: "bg-emerald-50 text-emerald-800 border-emerald-300",
    warning: "bg-amber-50 text-amber-800 border-amber-300",
    danger: "bg-red-50 text-red-800 border-red-300",
    info: "bg-blue-50 text-blue-800 border-blue-300",
    outline: "border-slate-300 text-slate-700 bg-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
