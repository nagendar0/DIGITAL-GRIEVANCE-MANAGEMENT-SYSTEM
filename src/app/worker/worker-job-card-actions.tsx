"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { acceptJob, declineJob, startWork } from "@/server/actions/worker-job";
import { CheckCircle2, Play, Camera, Loader2, ArrowRight, XCircle } from "lucide-react";

interface WorkerJobCardActionsProps {
  grievanceId: string;
  status: string;
  assignmentStatus?: string;
}

export function WorkerJobCardActions({ grievanceId, status, assignmentStatus }: WorkerJobCardActionsProps) {
  const [loading, setLoading] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptJob(grievanceId);
    } catch {
      console.error("Failed to accept job");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await declineJob(grievanceId, "Technician indicated unavailability for immediate on-site dispatch.");
    } catch {
      console.error("Failed to decline job");
    } finally {
      setLoading(false);
      setDeclineOpen(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await startWork(grievanceId);
    } catch {
      console.error("Failed to start work");
    } finally {
      setLoading(false);
    }
  };

  if (status === "ASSIGNED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Accept Request
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={loading}
          className="text-xs h-8 px-2.5 text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Decline
        </Button>

        <Link href={`/worker/jobs/${grievanceId}`}>
          <Button size="sm" variant="outline" className="text-xs h-8 px-2.5">
            Details
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "REWORK_REQUIRED") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleStart}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Re-commence Work
        </Button>
        <Link href={`/worker/jobs/${grievanceId}`}>
          <Button size="sm" variant="outline" className="text-xs h-8 px-2.5">
            Inspection Notes
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <div className="flex items-center gap-2">
        <Link href={`/worker/jobs/${grievanceId}/submit`}>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            Submit Evidence
          </Button>
        </Link>
        <Link href={`/worker/jobs/${grievanceId}`}>
          <Button size="sm" variant="outline" className="text-xs h-8 px-2.5">
            Details
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Link href={`/worker/jobs/${grievanceId}`}>
      <Button size="sm" variant="outline" className="text-xs h-8 px-2.5 flex items-center gap-1">
        View Summary
        <ArrowRight className="w-3 h-3" />
      </Button>
    </Link>
  );
}
