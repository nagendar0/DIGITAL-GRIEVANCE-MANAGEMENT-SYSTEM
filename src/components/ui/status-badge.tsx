import * as React from "react";
import { GrievanceStatus, STATUS_META } from "@/types/state-machine";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  Wrench, 
  ShieldCheck, 
  Sparkles, 
  CheckCheck, 
  RotateCcw 
} from "lucide-react";

interface StatusBadgeProps {
  status: GrievanceStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;

  const renderIcon = () => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-3.5 h-3.5 mr-1" />;
      case "ASSIGNED":
        return <UserCheck className="w-3.5 h-3.5 mr-1" />;
      case "ACCEPTED":
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      case "IN_PROGRESS":
        return <Wrench className="w-3.5 h-3.5 mr-1" />;
      case "AWAITING_VERIFICATION":
        return <Sparkles className="w-3.5 h-3.5 mr-1" />;
      case "VERIFIED":
        return <ShieldCheck className="w-3.5 h-3.5 mr-1" />;
      case "CLOSED":
        return <CheckCheck className="w-3.5 h-3.5 mr-1" />;
      case "REWORK_REQUIRED":
        return <RotateCcw className="w-3.5 h-3.5 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs tracking-wide",
        meta.badgeClass,
        className
      )}
    >
      {showIcon && renderIcon()}
      {meta.label}
    </span>
  );
}
