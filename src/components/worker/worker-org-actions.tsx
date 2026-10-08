"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { applyToOrganization, respondToOrgInvitation } from "@/server/actions/worker";
import { Building2, CheckCircle2, XCircle, Loader2, Send } from "lucide-react";

interface ApplyOrgButtonProps {
  organizationId: string;
  organizationName: string;
  hasApplied?: boolean;
  isCurrentOrg?: boolean;
}

export function ApplyOrgButton({
  organizationId,
  organizationName,
  hasApplied = false,
  isCurrentOrg = false,
}: ApplyOrgButtonProps) {
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(hasApplied);
  const [error, setError] = useState<string | null>(null);

  if (isCurrentOrg) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" />
        My Department
      </span>
    );
  }

  if (applied) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Application Pending Review
      </span>
    );
  }

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await applyToOrganization(
        organizationId,
        `Field technician requested to join ${organizationName} dispatch team.`
      );
      if (res?.error) {
        setError(res.error);
      } else {
        setApplied(true);
      }
    } catch {
      setError("Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        onClick={handleApply}
        disabled={loading}
        className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
        Apply to Join
      </Button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}

interface InvitationCardActionsProps {
  requestId: string;
  organizationName: string;
}

export function InvitationCardActions({
  requestId,
  organizationName,
}: InvitationCardActionsProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "ACCEPTED" | "DECLINED">("IDLE");

  const handleResponse = async (accept: boolean) => {
    setLoading(true);
    try {
      await respondToOrgInvitation(requestId, accept);
      setStatus(accept ? "ACCEPTED" : "DECLINED");
    } catch {
      console.error("Failed to respond to invitation");
    } finally {
      setLoading(false);
    }
  };

  if (status === "ACCEPTED") {
    return (
      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
        <CheckCircle2 className="w-4 h-4" />
        Invitation Accepted! Welcome to {organizationName}.
      </span>
    );
  }

  if (status === "DECLINED") {
    return (
      <span className="text-xs text-slate-500 flex items-center gap-1">
        <XCircle className="w-4 h-4" />
        Invitation Declined
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={loading}
        onClick={() => handleResponse(true)}
        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Accept Invitation
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => handleResponse(false)}
        className="text-xs h-8 text-rose-700 border-rose-200 hover:bg-rose-50"
      >
        <XCircle className="w-3.5 h-3.5 mr-1" />
        Decline
      </Button>
    </div>
  );
}
