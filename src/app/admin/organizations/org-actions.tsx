"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyOrganization, rejectOrganization } from "@/server/actions/admin";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface OrgActionsProps {
  orgId: string;
  orgName: string;
  currentStatus: string;
}

export function OrgActions({ orgId, orgName, currentStatus }: OrgActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!confirm(`Are you sure you want to approve "${orgName}"? They will gain immediate operational dispatch authority.`)) {
      return;
    }
    setErrorMsg(null);
    setIsApproving(true);
    try {
      const res = await verifyOrganization(orgId);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    } catch {
      setErrorMsg("Failed to approve organization.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      setErrorMsg("Please provide a valid rejection reason of at least 10 characters.");
      return;
    }

    setErrorMsg(null);
    setIsRejecting(true);
    try {
      const res = await rejectOrganization(orgId, rejectionReason);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setShowRejectModal(false);
      }
    } catch {
      setErrorMsg("Failed to reject organization.");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {errorMsg && (
        <span className="text-xs text-red-600 font-medium mr-2">{errorMsg}</span>
      )}

      {currentStatus === "PENDING_VERIFICATION" && (
        <>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5 flex items-center gap-1.5"
          >
            {isApproving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Approve
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectModal(true)}
            disabled={isApproving || isRejecting}
            className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8 px-2.5 flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </Button>
        </>
      )}

      {currentStatus === "VERIFIED" && (
        <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Active Authority
        </span>
      )}

      {currentStatus === "REJECTED" && (
        <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Application Rejected
        </span>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-left border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Reject Registration Application
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the legal or documentation issue for <strong>{orgName}</strong>. This feedback will be sent directly to their administrative contact.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Incomplete municipal charter documentation or unverifiable domain..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isRejecting}
                  className="text-xs w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isRejecting}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
