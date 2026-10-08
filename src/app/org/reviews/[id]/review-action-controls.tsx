"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveResolution, requestRework } from "@/server/actions/review";
import { CheckCircle2, RotateCcw, Loader2, X } from "lucide-react";

interface ReviewActionControlsProps {
  grievanceId: string;
  publicId: string;
}

export function ReviewActionControls({ grievanceId, publicId }: ReviewActionControlsProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [reworking, setReworking] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [reworkReason, setReworkReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!confirm(`Confirm final closure for grievance ${publicId}? This will update the state to CLOSED and publish resolution evidence to the public ledger.`)) {
      return;
    }

    setErrorMsg(null);
    setApproving(true);
    try {
      const res = await approveResolution(grievanceId, approvalNotes || undefined);
      if (res?.error) {
        setErrorMsg(res.error);
        setApproving(false);
      } else {
        router.push("/org?status=CLOSED");
      }
    } catch {
      setErrorMsg("Failed to approve resolution.");
      setApproving(false);
    }
  };

  const handleRework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reworkReason.trim() || reworkReason.trim().length < 15) {
      setErrorMsg("Please provide detailed inspection notes explaining why rework is needed (at least 15 characters).");
      return;
    }

    setErrorMsg(null);
    setReworking(true);
    try {
      const res = await requestRework(grievanceId, reworkReason);
      if (res?.error) {
        setErrorMsg(res.error);
        setReworking(false);
      } else {
        setShowReworkModal(false);
        router.push("/org");
      }
    } catch {
      setErrorMsg("Failed to submit rework request.");
      setReworking(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Inspector Verification Decision
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare photographs, GPS distance match, and technician notes before approving.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReworkModal(true)}
            disabled={approving || reworking}
            className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs h-9 px-4 flex items-center justify-center gap-1.5 font-medium w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Request Rework
          </Button>

          <Button
            type="button"
            onClick={handleApprove}
            disabled={approving || reworking}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 flex items-center justify-center gap-1.5 font-semibold shadow-xs w-full sm:w-auto"
          >
            {approving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Approve & Formally Close
          </Button>
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
          {errorMsg}
        </p>
      )}

      {/* Rework Modal */}
      {showReworkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-left border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Request Technician Rework
              </h3>
              <button
                type="button"
                onClick={() => setShowReworkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRework} className="space-y-4 mt-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide specific inspection guidance for the technician explaining which restoration aspects require remedial action.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rework Specification / Rejection Reason *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  placeholder="e.g., Pothole edges not properly sealed with emulsion; loose gravel remains across roadway..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReworkModal(false)}
                  disabled={reworking}
                  className="text-xs w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={reworking}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  {reworking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Dispatch Rework Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
