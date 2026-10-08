"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleWorkerStatus } from "@/server/actions/worker";
import { CheckCircle2, Power, Loader2 } from "lucide-react";

interface WorkerToggleButtonProps {
  workerId: string;
  isActive: boolean;
}

export function WorkerToggleButton({ workerId, isActive }: WorkerToggleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(isActive);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const nextStatus = !active;
      const res = await toggleWorkerStatus(workerId, nextStatus);
      if (res.success) {
        setActive(nextStatus);
      }
    } catch {
      console.error("Failed to toggle status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`text-xs h-8 px-2.5 flex items-center gap-1.5 ${
        active 
          ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" 
          : "border-slate-200 text-slate-500 hover:bg-slate-100"
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Power className="w-3.5 h-3.5" />
      )}
      {active ? "Active" : "Inactive"}
    </Button>
  );
}
