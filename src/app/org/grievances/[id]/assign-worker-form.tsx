"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { assignWorkerToGrievance } from "@/server/actions/assignment";
import { 
  Wrench, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Filter, 
  PlusCircle,
  Briefcase
} from "lucide-react";

interface WorkerOption {
  id: string;
  fullName: string;
  phone?: string | null;
  activeJobs: number;
  skills: string[];
}

interface AssignWorkerFormProps {
  grievanceId: string;
  workers: WorkerOption[];
  grievanceCategory?: string;
  isReassign?: boolean;
}

const COMMON_ROLES = [
  { value: "ALL", label: "All Specializations / Roles" },
  { value: "ROADS", label: "Roads & Pavement Repairs", keywords: ["road", "pavement", "pothole", "asphalt", "civil"] },
  { value: "DRAINAGE", label: "Drainage & Sewerage", keywords: ["drain", "sewer", "gutter", "water", "plumbing"] },
  { value: "SANITATION", label: "Sanitation & Waste Cleanup", keywords: ["sanitation", "garbage", "waste", "clean", "debris"] },
  { value: "ELECTRICAL", label: "Street Lighting & Electrical", keywords: ["electric", "light", "wire", "pole", "power"] },
  { value: "WATER_SUPPLY", label: "Water Supply & Pipelines", keywords: ["water", "pipe", "leak", "valve"] },
  { value: "TRAFFIC", label: "Traffic Infrastructure & Signals", keywords: ["traffic", "signal", "sign", "paint"] },
  { value: "GENERAL", label: "General Municipal Maintenance", keywords: ["general", "maintenance", "municipal", "repair"] },
];

export function AssignWorkerForm({
  grievanceId,
  workers,
  grievanceCategory,
  isReassign = false,
}: AssignWorkerFormProps) {
  const [showReassignForm, setShowReassignForm] = useState(!isReassign);
  // Try to default to a role matching grievanceCategory if applicable
  const initialRole = useMemo(() => {
    if (!grievanceCategory) return "ALL";
    const cat = grievanceCategory.toUpperCase();
    const match = COMMON_ROLES.find(r => r.value === cat);
    return match ? match.value : "ALL";
  }, [grievanceCategory]);

  const [selectedRole, setSelectedRole] = useState<string>(initialRole);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Extract all unique skills across all available workers to offer dynamic role choices
  const dynamicRoles = useMemo(() => {
    const list = [...COMMON_ROLES];
    const existingValues = new Set(list.map(r => r.value.toLowerCase()));
    
    workers.forEach(w => {
      w.skills.forEach(skill => {
        const clean = skill.trim();
        if (clean && !existingValues.has(clean.toLowerCase())) {
          existingValues.add(clean.toLowerCase());
          list.push({
            value: clean,
            label: clean,
            keywords: [clean.toLowerCase()],
          });
        }
      });
    });
    return list;
  }, [workers]);

  // Filter workers based on selected role
  const filteredWorkers = useMemo(() => {
    if (selectedRole === "ALL") return workers;
    
    const roleDef = dynamicRoles.find(r => r.value === selectedRole);
    const keywords = roleDef?.keywords || [selectedRole.toLowerCase()];

    return workers.filter(w => {
      const workerSkillsText = w.skills.join(" ").toLowerCase();
      // Match keywords or check if worker has general skills
      return keywords.some(k => workerSkillsText.includes(k.toLowerCase())) ||
        workerSkillsText.includes("general");
    });
  }, [workers, selectedRole, dynamicRoles]);

  // Available workers (0 active jobs) vs Busy workers
  const availableWorkers = filteredWorkers.filter(w => w.activeJobs === 0);
  const busyWorkers = filteredWorkers.filter(w => w.activeJobs > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      setErrorMsg("Please select a technician to dispatch.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await assignWorkerToGrievance({
        grievanceId,
        workerId: selectedWorkerId,
        notes: notes.trim() || undefined,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setErrorMsg("Failed to assign technician.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-center space-y-1.5 animate-in fade-in">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
        <p className="text-sm font-semibold">Technician Dispatched Successfully</p>
        <p className="text-xs text-emerald-700">
          Assignment request sent to technician dashboard. Citizen notified that work is beginning.
        </p>
      </div>
    );
  }

  if (isReassign && !showReassignForm) {
    return (
      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowReassignForm(true)}
          className="w-full text-xs text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
          Re-assign to Different Technician
        </Button>
      </div>
    );
  }

  if (isReassign && showReassignForm && workers.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-2.5 animate-in fade-in">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">No Other Technicians Available</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              There are currently no other registered technicians in your organization roster to reassign to.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Link href="/org/workers">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[11px] h-7 bg-white text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3 text-blue-600" />
              Onboard Technician
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowReassignForm(false)}
            className="text-[11px] h-7 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isReassign && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-800">Choose Replacement Technician</span>
          <button
            type="button"
            onClick={() => setShowReassignForm(false)}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline"
          >
            Cancel
          </button>
        </div>
      )}
      {/* 1. Specific Role / Skill Filter */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Filter by Technician Role / Trade
          </span>
          {grievanceCategory && (
            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Category: {grievanceCategory}
            </span>
          )}
        </label>
        
        <select
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setSelectedWorkerId(""); // Reset selected worker when filter changes
          }}
          className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
        >
          {dynamicRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Worker Selection with Availability Status */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>Select Available Field Technician *</span>
          <span className="text-[11px] text-slate-500">
            {availableWorkers.length} available • {busyWorkers.length} busy
          </span>
        </label>

        {filteredWorkers.length === 0 ? (
          /* NO AVAILABLE WORKERS WARNING */
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-amber-950 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  No Available Workers For This Role
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  No registered technicians match &ldquo;{dynamicRoles.find(r => r.value === selectedRole)?.label}&rdquo;.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRole("ALL")}
                className="text-[11px] h-7 bg-white text-slate-700 border-amber-200 hover:bg-amber-100"
              >
                View All Technicians ({workers.length})
              </Button>
              <Link href="/org/workers">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 bg-amber-600 text-white border-transparent hover:bg-amber-700 flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  Onboard Technician
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <select
              required
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- Choose Field Specialist --</option>
              
              {availableWorkers.length > 0 && (
                <optgroup label="🟢 Available Technicians (0 Active Jobs)">
                  {availableWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      🟢 {w.fullName} • Available (0 Jobs) • Skills: {w.skills.join(", ")}
                    </option>
                  ))}
                </optgroup>
              )}

              {busyWorkers.length > 0 && (
                <optgroup label="🟡 Currently Occupied Technicians">
                  {busyWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      🟡 {w.fullName} • Active Jobs: {w.activeJobs} • Skills: {w.skills.join(", ")}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Selected Worker Preview */}
            {selectedWorkerId && (
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {filteredWorkers.find(w => w.id === selectedWorkerId)?.fullName}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Skills: {filteredWorkers.find(w => w.id === selectedWorkerId)?.skills.join(", ")}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (filteredWorkers.find(w => w.id === selectedWorkerId)?.activeJobs || 0) === 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {(filteredWorkers.find(w => w.id === selectedWorkerId)?.activeJobs || 0) === 0
                    ? "Available Now"
                    : `${filteredWorkers.find(w => w.id === selectedWorkerId)?.activeJobs} Active Jobs`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Dispatch Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Special Dispatch Instructions / Field Directives
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Inspect surrounding area for underlying pipe bursts before filling pothole..."
          className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errorMsg && (
        <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
          {errorMsg}
        </p>
      )}

      {/* 4. Action Button */}
      <Button
        type="submit"
        disabled={loading || !selectedWorkerId || filteredWorkers.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 flex items-center justify-center gap-2 shadow-xs transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
        Dispatch Technician to Site
      </Button>
    </form>
  );
}
