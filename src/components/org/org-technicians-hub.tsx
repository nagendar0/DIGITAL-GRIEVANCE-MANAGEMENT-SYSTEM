"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApplicationActions, InviteWorkerButton } from "./org-worker-requests-actions";
import { 
  Users, 
  Search, 
  UserPlus, 
  Wrench, 
  Phone, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Send, 
  ShieldCheck, 
  Briefcase,
  AlertCircle,
  X
} from "lucide-react";

export interface WorkerItem {
  id: string;
  userId: string;
  fullName: string;
  phone?: string | null;
  skills: string[];
  isActive: boolean;
  activeJobs: number;
  organizationId?: string | null;
  organizationName?: string | null;
  isCurrentOrg: boolean;
  hasPendingApplication?: boolean;
  applicationRequestId?: string | null;
  applicationMessage?: string | null;
  applicationCreatedAt?: string | null;
  hasPendingInvitation?: boolean;
}

export interface PendingApplicationItem {
  id: string;
  workerId: string;
  workerName: string;
  workerPhone?: string | null;
  skills: string[];
  message: string;
  createdAt: string;
}

interface OrgTechniciansHubProps {
  currentOrgId: string;
  currentOrgName: string;
  workers: WorkerItem[];
  pendingApplications: PendingApplicationItem[];
  defaultTab?: "pending" | "available" | "all" | "squad";
}

export function OrgTechniciansHub({
  currentOrgId,
  currentOrgName,
  workers,
  pendingApplications,
  defaultTab
}: OrgTechniciansHubProps) {
  const initialTab = defaultTab || (pendingApplications.length > 0 ? "pending" : "available");
  const [activeTab, setActiveTab] = useState<"pending" | "available" | "all" | "squad">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Categorize workers
  const availableWorkers = useMemo(() => {
    return workers.filter((w) => !w.organizationId || !w.isCurrentOrg);
  }, [workers]);

  const freelanceWorkers = useMemo(() => {
    return workers.filter((w) => !w.organizationId);
  }, [workers]);

  const squadWorkers = useMemo(() => {
    return workers.filter((w) => w.isCurrentOrg);
  }, [workers]);

  // Filter based on search query
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (activeTab === "pending") {
      if (!q) return pendingApplications;
      return pendingApplications.filter((app) => 
        app.workerName.toLowerCase().includes(q) ||
        (app.workerPhone && app.workerPhone.toLowerCase().includes(q)) ||
        app.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    let base: WorkerItem[] = [];
    if (activeTab === "available") {
      base = freelanceWorkers;
    } else if (activeTab === "squad") {
      base = squadWorkers;
    } else {
      base = workers;
    }

    if (!q) return base;

    return base.filter((w) => 
      w.fullName.toLowerCase().includes(q) ||
      (w.phone && w.phone.toLowerCase().includes(q)) ||
      w.skills.some((s) => s.toLowerCase().includes(q)) ||
      (w.organizationName && w.organizationName.toLowerCase().includes(q))
    );
  }, [activeTab, searchQuery, pendingApplications, freelanceWorkers, squadWorkers, workers]);

  return (
    <Card id="technicians-hub" className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Field Technicians & Recruitment Hub
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Review technician applications, recruit available specialists, and manage your department&apos;s active operations squad.
            </CardDescription>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, skill, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto touch-scroll scrollbar-none text-xs">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "pending" ? "default" : "outline"}
            onClick={() => setActiveTab("pending")}
            className={`text-xs h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === "pending"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : pendingApplications.length > 0
                ? "border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100"
                : "text-slate-700"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Pending Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              pendingApplications.length > 0
                ? activeTab === "pending" 
                : "bg-slate-200 text-slate-700"
            }`}>
              {pendingApplications.length}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "available" ? "default" : "outline"}
            onClick={() => setActiveTab("available")}
            className={`text-xs h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === "available" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-slate-700"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Available Technicians</span>
            <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {freelanceWorkers.length}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
            className={`text-xs h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === "all" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-slate-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Platform Workers</span>
            <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {workers.length}
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "squad" ? "default" : "outline"}
            onClick={() => setActiveTab("squad")}
            className={`text-xs h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === "squad" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-slate-700"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Department Squad</span>
            <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {squadWorkers.length}
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {/* TAB 1: PENDING REQUESTS / APPLICATIONS */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingApplications.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">No Pending Technician Applications</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  All technician applications have been reviewed. You can invite available field technicians from the &ldquo;Available Technicians&rdquo; tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(filteredList as PendingApplicationItem[]).map((app) => (
                  <Card key={app.id} className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/20 shadow-xs hover:border-indigo-300 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {app.workerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-900">
                              {app.workerName}
                            </CardTitle>
                            <CardDescription className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Applied {new Date(app.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>

                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold shrink-0">
                          Pending Review
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0 text-xs">
                      {app.workerPhone && (
                        <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{app.workerPhone}</span>
                        </p>
                      )}

                      {app.skills && app.skills.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500 mb-1">Certified Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {app.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium shadow-2xs"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-slate-600 text-[11px] italic">
                        &ldquo;{app.message || "Field technician requested to join official department dispatch roster."}&rdquo;
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Action Required:
                        </span>
                        <ApplicationActions requestId={app.id} workerName={app.workerName} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2, 3, 4: AVAILABLE, ALL, SQUAD */}
        {activeTab !== "pending" && (
          <div className="space-y-4">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center">
                <Wrench className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  {searchQuery ? "No matching technicians found" : "No technicians in this category"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery 
                    ? `No field specialists matching "${searchQuery}". Try a different skill or name.` 
                    : "Switch tabs to view other available personnel or browse all platform technicians."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(filteredList as WorkerItem[]).map((w) => {
                  return (
                    <Card 
                      key={w.id} 
                      className={`border transition-all shadow-xs ${
                        w.isCurrentOrg 
                          ? "border-emerald-200 bg-emerald-50/15" 
                          : w.hasPendingApplication 
                          ? "border-amber-200 bg-amber-50/20" 
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <CardHeader className="pb-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              w.isCurrentOrg 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {w.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-bold text-slate-900">
                                {w.fullName}
                              </CardTitle>
                              <CardDescription className="text-[10px] text-slate-400 font-mono">
                                ID: {w.id.slice(0, 8)}...
                              </CardDescription>
                            </div>
                          </div>

                          {/* Affiliation / Status Badge */}
                          {w.isCurrentOrg ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                              In Your Squad
                            </Badge>
                          ) : w.hasPendingApplication ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold animate-pulse">
                              Applied
                            </Badge>
                          ) : !w.organizationId ? (
                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-semibold">
                              Available / Freelance
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-[10px]">
                              {w.organizationName || "Affiliated"}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0 text-xs text-slate-600">
                        {w.phone ? (
                          <p className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{w.phone}</span>
                          </p>
                        ) : (
                          <p className="text-slate-400 italic text-[11px]">No contact number</p>
                        )}

                        {/* Skills */}
                        {w.skills && w.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {w.skills.map((s, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-700 text-[10.5px] px-2 py-0.5 rounded font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action buttons footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            {w.isCurrentOrg 
                              ? `${w.activeJobs} active jobs` 
                              : !w.organizationId 
                              ? "Ready for hire" 
                              : "Registered specialist"}
                          </span>

                          {w.isCurrentOrg ? (
                            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active Staff
                            </span>
                          ) : w.hasPendingApplication && w.applicationRequestId ? (
                            <ApplicationActions requestId={w.applicationRequestId} workerName={w.fullName} />
                          ) : w.hasPendingInvitation ? (
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Request Sent
                            </span>
                          ) : (
                            <InviteWorkerButton
                              workerId={w.id}
                              workerName={w.fullName}
                              orgId={currentOrgId}
                              buttonLabel="Send Request / Invite"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
