import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatDuration, formatGrievanceId } from "@/lib/utils";
import { 
  MapPin, 
  Plus, 
  Clock, 
  CheckCircle2, 
  FileText, 
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Building2,
  HardHat,
  Calendar,
  ShieldCheck
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CitizenDashboardPage() {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login?redirect=/citizen");
  }

  // If user is platform admin, redirect to admin
  if (user.role === "PLATFORM_ADMIN") {
    redirect("/admin");
  }

  const adminClient = createAdminClient();

  // Fetch all grievances for this citizen with full organizational & technician relations
  const { data: grievances } = await adminClient
    .from("grievances")
    .select(`
      *,
      organizations (id, name, type),
      workers (
        id,
        profiles (full_name)
      ),
      completion_evidence (
        id,
        submitted_at
      )
    `)
    .eq("citizen_id", user.id)
    .order("created_at", { ascending: false });

  const items = grievances || [];
  const totalCount = items.length;
  const inProgressCount = items.filter((g) =>
    ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "AWAITING_VERIFICATION", "REWORK_REQUIRED"].includes(g.status)
  ).length;
  const resolvedCount = items.filter((g) =>
    ["VERIFIED", "CLOSED"].includes(g.status)
  ).length;
  const pendingCount = items.filter((g) => g.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8 lg:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Verified Citizen Account
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome, {user.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Registered Phone: {user.phone || "Not specified"} &bull; Account: {user.email}
            </p>
          </div>

          <Link href="/citizen/new" className="w-full sm:w-auto">
            <Button variant="accent" size="lg" className="shadow-md shadow-orange-500/20 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              Report New Grievance
            </Button>
          </Link>
        </div>

        {/* Stats Grid - 4 on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Filed
                </span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{totalCount}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Intake
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-700 mt-2 tabular-nums">{pendingCount}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  In Progress
                </span>
                <AlertTriangle className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-2 tabular-nums">{inProgressCount}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Verified & Resolved
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 mt-2 tabular-nums">{resolvedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Grievances List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              My Grievance Reports
            </h2>
            <span className="text-xs text-slate-500">
              Showing {items.length} records
            </span>
          </div>

          {items.length === 0 ? (
            <Card className="border-slate-200 bg-white text-center py-12 px-4">
              <CardContent className="space-y-4 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    No Grievances Reported Yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    See a pothole, broken streetlight, or burst pipe in your community? Submit your first report with location and photo evidence.
                  </p>
                </div>
                <Link href="/citizen/new">
                  <Button variant="accent" size="md">
                    <Plus className="w-4 h-4 mr-1.5" />
                    File a Complaint
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item: any) => {
                const wRaw = item.workers;
                const workerData = Array.isArray(wRaw) ? wRaw[0] : wRaw;
                const workerProfile = Array.isArray(workerData?.profiles) ? workerData?.profiles[0] : workerData?.profiles;
                const workerName = workerProfile?.full_name;

                const evRaw = item.completion_evidence;
                const completedAt = item.closed_at || (Array.isArray(evRaw) ? evRaw[0]?.submitted_at : evRaw?.submitted_at);
                const isCompleted = ["VERIFIED", "CLOSED", "AWAITING_VERIFICATION"].includes(item.status);

                return (
                  <Link
                    key={item.id}
                    href={`/citizen/grievances/${item.id}`}
                    className="block group"
                  >
                    <Card className="border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all">
                      <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {item.public_id}
                              </span>
                              <StatusBadge status={item.status} />
                              <span className="text-xs font-medium text-slate-500">
                                {item.category}
                              </span>
                            </div>

                            <h3 className="font-semibold text-slate-900 text-base group-hover:text-blue-600 transition-colors break-words">
                              {item.title}
                            </h3>

                            <p className="text-xs text-slate-500 flex items-center gap-1.5 break-words">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate sm:whitespace-normal">{item.coarse_address}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto self-stretch sm:self-center">
                            <Button variant="outline" size="sm" className="group-hover:bg-blue-50 group-hover:text-blue-600 w-full sm:w-auto justify-center min-h-[40px] sm:min-h-0">
                              View Details <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>

                        {/* Full Resolution & Completed Information Bar */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs min-w-0">
                          {/* Issue Raised Date & Time */}
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Raised: <strong className="text-slate-700 font-medium">{formatDate(item.created_at)}</strong></span>
                          </span>

                          {/* Assigned Organization */}
                          {item.organizations?.name && (
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Authority: <strong className="text-slate-800 font-medium">{item.organizations.name}</strong></span>
                            </span>
                          )}

                          {/* Assigned Worker / Technician */}
                          {workerName && (
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              <HardHat className="w-3.5 h-3.5 text-amber-600" />
                              <span>Technician: <strong className="text-slate-800 font-medium">{workerName}</strong></span>
                            </span>
                          )}

                          {/* Completed Date & Time Information */}
                          {isCompleted && completedAt && (
                            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Completed: <strong className="font-semibold">{formatDate(completedAt)}</strong>
                                {item.created_at && (
                                  <span className="text-emerald-700 font-normal ml-1">
                                    (resolved in {formatDuration(item.created_at, completedAt)})
                                  </span>
                                )}
                              </span>
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
