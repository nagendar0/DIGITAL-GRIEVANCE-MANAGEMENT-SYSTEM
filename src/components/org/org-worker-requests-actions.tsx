"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  acceptWorkerApplication, 
  declineWorkerApplication, 
  inviteWorkerToOrg 
} from "@/server/actions/worker";
import { CheckCircle2, XCircle, Loader2, Send, Clock, UserCheck } from "lucide-react";

interface ApplicationActionsProps {
  requestId: string;
  workerName?: string;
  onSuccess?: (action: "ACCEPTED" | "DECLINED") => void;
}

export function ApplicationActions({ requestId, workerName, onSuccess }: ApplicationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "ACCEPTED" | "DECLINED">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await acceptWorkerApplication(requestId);
      if (res && "error" in res && res.error) {
        setErrorMessage(res.error);
      } else {
        setStatus("ACCEPTED");
        onSuccess?.("ACCEPTED");
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to accept worker application");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await declineWorkerApplication(requestId, "Department roster is currently full.");
      if (res && "error" in res && res.error) {
        setErrorMessage(res.error);
      } else {
        setStatus("DECLINED");
        onSuccess?.("DECLINED");
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to decline worker application");
    } finally {
      setLoading(false);
    }
  };

  if (status === "ACCEPTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Approved & Added to Roster
      </span>
    );
  }

  if (status === "DECLINED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-300">
        <XCircle className="w-3.5 h-3.5" />
        Application Declined
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={loading}
          onClick={handleAccept}
          className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
          Approve & Add ✓
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={handleDecline}
          className="text-xs h-8 px-2.5 text-rose-700 border-rose-200 hover:bg-rose-50"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Decline
        </Button>
      </div>
      {errorMessage && (
        <span className="text-[11px] text-rose-600 font-medium">{errorMessage}</span>
      )}
    </div>
  );
}

interface InviteWorkerButtonProps {
  workerId: string;
  workerName: string;
  orgId?: string;
  buttonLabel?: string;
  onSuccess?: () => void;
}

export function InviteWorkerButton({ 
  workerId, 
  workerName, 
  orgId, 
  buttonLabel = "Send Request / Invite",
  onSuccess 
}: InviteWorkerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInvite = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await inviteWorkerToOrg(workerId, orgId);
      if (res?.success) {
        setInvited(true);
        onSuccess?.();
        router.refresh();
      } else if (res?.error) {
        setErrorMessage(res.error);
      }
    } catch {
      setErrorMessage("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  if (invited) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
        <Clock className="w-3.5 h-3.5" />
        Request Sent (Pending)
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={loading}
        onClick={handleInvite}
        className="text-xs h-7.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 shadow-xs transition-all hover:shadow-sm"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        {buttonLabel}
      </Button>
      {errorMessage && (
        <span className="text-[11px] text-rose-600 font-medium">{errorMessage}</span>
      )}
    </div>
  );
}

