import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger" | "default";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm shadow-blue-500/20 focus-visible:ring-blue-500",
      default:
        "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm shadow-blue-500/20 focus-visible:ring-blue-500",
      secondary:
        "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 focus-visible:ring-slate-400",
      accent:
        "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 active:opacity-90 focus-visible:ring-orange-500",
      outline:
        "border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700 focus-visible:ring-slate-400",
      ghost:
        "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700 focus-visible:ring-slate-400",
      danger:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 shadow-sm focus-visible:ring-red-500",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs rounded-md min-h-[36px]",
      md: "h-11 px-4 text-sm rounded-lg min-h-[44px]",
      lg: "h-13 px-6 text-base rounded-lg min-h-[48px]",
      icon: "h-11 w-11 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
