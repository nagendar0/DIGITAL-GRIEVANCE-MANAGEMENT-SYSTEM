import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkerJobCardActions } from "./worker-job-card-actions";
import { WorkerDispatchCard } from "@/components/worker/worker-dispatch-card";
import { WorkerDistanceCalculator } from "@/components/worker/worker-distance-calculator";
import { ApplyOrgButton, InvitationCardActions } from "@/components/worker/worker-org-actions";
import { 
  Wrench, 
  MapPin, 
  Clock, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle,
  Building2, 
  Calendar,
  Navigation,
  Phone,
  Mail,
  ShieldCheck,
  Users,
  Flame,
  Send,
  Eye,
  Camera,
  ExternalLink,
  Sparkles,
  XCircle
} from "lucide-react";

export const dynamic = "force-dynamic";

interface WorkerDashboardProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function WorkerDashboardPage({ searchParams }: WorkerDashboardProps) {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/worker");
  }

  const adminClient = createAdminClient();

  // 1. Resolve or auto-heal worker record
  let workerId = user.workerId;
  if (!workerId) {
    const { data: workerByUserId } = await adminClient
      .from("workers")
      .select("id, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (workerByUserId) {
      workerId = workerByUserId.id;
    } else {
      // Auto-create worker profile so field specialist is never locked out
      const { data: createdWorker } = await adminClient
        .from("workers")
        .insert({
          user_id: user.id,
          organization_id: null,
          skills: ["General Maintenance", "Civic Repairs", "Electrical", "Roads"],
          is_active: true,
          current_active_jobs: 0,
        })
        .select("id")
        .single();
      workerId = createdWorker?.id || null;
    }
  }

  // Fallback for platform admin testing
  if (!workerId && user.role === "PLATFORM_ADMIN") {
    const { data: firstWorker } = await adminClient
      .from("workers")
      .select("id, organization_id")
      .limit(1)
      .maybeSingle();
    workerId = firstWorker?.id || null;
  }

  if (!workerId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Initializing Technician Profile</h2>
        <p className="text-sm text-slate-600 mt-1 mb-6">
          Your field operations account is being configured. Please refresh or return home.
        </p>
        <Link href="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    );
  }

  // 2. Fetch Worker Profile & Primary Organization
  const { data: worker } = await adminClient
    .from("workers")
    .select(`
      id,
      current_active_jobs,
      skills,
      organization_id,
      organizations (
        id,
        name,
        type,
        official_email,
        official_phone,
        address,
        status
      )
    `)
    .eq("id", workerId)
    .single();

  const orgRaw = worker?.organizations as any;
  const currentOrg = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { 
    id: string; 
    name: string; 
    type: string;
    official_email?: string;
    official_phone?: string;
    address?: string;
    status?: string;
  } | null;

  // 3. Fetch Fellow Technicians in Current Organization (if affiliated)
  let fellowWorkers: any[] = [];
  if (currentOrg?.id) {
    const { data: orgWorkers } = await adminClient
      .from("workers")
      .select(`
        id,
        skills,
        is_active,
        current_active_jobs,
        profiles (
          full_name,
          phone
        )
      `)
      .eq("organization_id", currentOrg.id);
    fellowWorkers = orgWorkers || [];
  }

  // 4. Fetch All Organizations & Worker Counts
  const { data: allOrganizations } = await adminClient
    .from("organizations")
    .select("id, name, type, official_email, official_phone, address, status")
    .order("name", { ascending: true });

  const orgList = allOrganizations || [];

  // Fetch technician counts for each organization
  const { data: orgWorkerCounts } = await adminClient
    .from("workers")
    .select("organization_id");

  const countMap: Record<string, number> = {};
  if (orgWorkerCounts) {
    for (const w of orgWorkerCounts) {
      if (w.organization_id) {
        countMap[w.organization_id] = (countMap[w.organization_id] || 0) + 1;
      }
    }
  }

  // 5. Fetch Worker Requests (Applications & Department Invitations)
  const { data: workerRequests } = await adminClient
    .from("worker_organization_requests")
    .select(`
      id,
      type,
      status,
      message,
      created_at,
      organization_id,
      organizations (
        id,
        name,
        type,
        official_phone
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  const requests = workerRequests || [];
  const pendingInvites = requests.filter(
    (r) => r.type === "ORG_INVITATION" && r.status === "PENDING"
  );
  const pendingApplications = requests.filter(
    (r) => r.type === "WORKER_APPLICATION" && r.status === "PENDING"
  );
  const appliedOrgIdSet = new Set(pendingApplications.map((r) => r.organization_id));

  // 6. Fetch Grievances assigned to this worker or department pool
  let grievanceQuery = adminClient
    .from("grievances")
    .select(`
      id,
      public_id,
      title,
      description,
      category,
      priority,
      status,
      coarse_address,
      latitude,
      longitude,
      created_at,
      updated_at,
      assigned_worker_id,
      assigned_org_id,
      organizations (
        name,
        type,
        official_phone
      ),
      worker_assignments (
        status,
        assigned_at,
        responded_at
      ),
      grievance_images (
        storage_path,
        is_before
      ),
      completion_evidence (
        id,
        after_image_url,
        description,
        submitted_at
      ),
      ai_evidence_verifications (
        result,
        confidence,
        reason,
        consistency_notes,
        visual_improvement
      )
    `);

  if (currentOrg?.id) {
    // If affiliated with a department, fetch both directly assigned jobs and department dispatch orders
    grievanceQuery = grievanceQuery.or(`assigned_worker_id.eq.${workerId},assigned_org_id.eq.${currentOrg.id}`);
  } else {
    grievanceQuery = grievanceQuery.eq("assigned_worker_id", workerId);
  }

  const { data: grievances } = await grievanceQuery.order("created_at", { ascending: false });

  const { tab } = await searchParams;
  const activeTab = tab || (currentOrg ? "active" : "organizations");

  const allGrievances = grievances || [];

  // Dispatch Orders: directly assigned to technician OR available in department pool
  const actionRequiredGrievances = allGrievances.filter((g) => {
    if (g.assigned_worker_id === workerId) {
      return ["ASSIGNED", "REWORK_REQUIRED"].includes(g.status);
    }
    if (currentOrg?.id && g.assigned_org_id === currentOrg.id && !g.assigned_worker_id) {
      return ["PENDING", "ASSIGNED"].includes(g.status);
    }
    return false;
  });

  const inProgressGrievances = allGrievances.filter(
    (g) => g.assigned_worker_id === workerId && g.status === "IN_PROGRESS"
  );
  const completedGrievances = allGrievances.filter(
    (g) => g.assigned_worker_id === workerId && ["AWAITING_VERIFICATION", "VERIFIED", "CLOSED"].includes(g.status)
  );

  const myAllGrievances = allGrievances.filter((g) => {
    if (g.assigned_worker_id === workerId) return true;
    if (currentOrg?.id && g.assigned_org_id === currentOrg.id && !g.assigned_worker_id) return true;
    return false;
  });

  const displayedList =
    activeTab === "in_progress"
      ? inProgressGrievances
      : activeTab === "completed"
      ? completedGrievances
      : activeTab === "all"
      ? myAllGrievances
      : actionRequiredGrievances;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Mobile-Friendly Operations Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">
                <Wrench className="w-3 h-3" />
                Field Operations Command
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>{user.fullName || "Field Specialist"}</span>
                {currentOrg && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium px-2 py-0.5 rounded-full">
                    Active On-Duty
                  </span>
                )}
              </h1>
              {currentOrg ? (
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Affiliated Department: <strong>{currentOrg.name}</strong></span>
                  <span className="text-slate-400">({fellowWorkers.length} Technicians)</span>
                </p>
              ) : (
                <p className="text-xs text-amber-300 mt-1 flex items-center gap-1.5 font-medium flex-wrap">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Independent Technician • Browse departments below to apply or accept invites.</span>
                </p>
              )}
            </div>

            {/* Quick stats badges */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="bg-slate-800 px-2 sm:px-3 py-2 rounded-xl border border-slate-700/80 text-center min-w-0">
                <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase truncate">Offers</p>
                <p className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">{actionRequiredGrievances.length}</p>
              </div>
              <div className="bg-slate-800 px-2 sm:px-3 py-2 rounded-xl border border-slate-700/80 text-center min-w-0">
                <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase truncate">In Progress</p>
                <p className="text-base sm:text-lg font-bold text-blue-400 mt-0.5">{inProgressGrievances.length}</p>
              </div>
              <div className="bg-slate-800 px-2 sm:px-3 py-2 rounded-xl border border-slate-700/80 text-center min-w-0">
                <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase truncate">Completed</p>
                <p className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">{completedGrievances.length}</p>
              </div>
            </div>
          </div>

          {/* Pending Invitations Banner */}
          {pendingInvites.length > 0 && (
            <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-200">
                    Department Invitation Received ({pendingInvites.length})
                  </p>
                  <p className="text-[11px] text-slate-300">
                    A civic department has invited you to join their official field technical roster.
                  </p>
                </div>
              </div>
              <Link href="/worker?tab=organizations" className="shrink-0 w-full sm:w-auto">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs h-8 sm:h-7 px-3 w-full sm:w-auto">
                  View Invitations
                </Button>
              </Link>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-5 sm:mt-6 overflow-x-auto touch-scroll scrollbar-none pb-1.5 text-xs">
            <Link href="/worker?tab=active" className="shrink-0">
              <Button
                variant={activeTab === "active" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 ${activeTab === "active" ? "bg-amber-600 hover:bg-amber-700 text-white font-bold" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
              >
                <Flame className="w-3.5 h-3.5 mr-1" />
                Dispatch Orders ({actionRequiredGrievances.length})
              </Button>
            </Link>
            <Link href="/worker?tab=in_progress" className="shrink-0">
              <Button
                variant={activeTab === "in_progress" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 ${activeTab === "in_progress" ? "bg-blue-600 hover:bg-blue-700 text-white font-bold" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
              >
                Active Repairs ({inProgressGrievances.length})
              </Button>
            </Link>
            <Link href="/worker?tab=completed" className="shrink-0">
              <Button
                variant={activeTab === "completed" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 ${activeTab === "completed" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Completed & Verified ({completedGrievances.length})
              </Button>
            </Link>
            <Link href="/worker?tab=organizations" className="shrink-0">
              <Button
                variant={activeTab === "organizations" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 ${activeTab === "organizations" ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
              >
                <Building2 className="w-3.5 h-3.5 mr-1" />
                Civic Departments ({orgList.length})
              </Button>
            </Link>
            <Link href="/worker?tab=all" className="shrink-0">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 ${activeTab === "all" ? "bg-slate-700 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
              >
                All Jobs ({allGrievances.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: CIVIC DEPARTMENTS DIRECTORY & APPLICATIONS HUB */}
        {/* ========================================================= */}
        {activeTab === "organizations" ? (
          <div className="space-y-6">
            {/* Pending Invitations Section */}
            {pendingInvites.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600" />
                  Incoming Department Invitations
                </h3>
                <div className="space-y-3">
                  {pendingInvites.map((invite) => {
                    const orgName = (invite.organizations as any)?.name || "Civic Department";
                    return (
                      <div
                        key={invite.id}
                        className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                              Invitation to Join
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(invite.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {orgName}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {invite.message || "This department has invited you to join their certified field repair roster."}
                          </p>
                        </div>
                        <InvitationCardActions
                          requestId={invite.id}
                          organizationName={orgName}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Our Department Card (If Worker is Affiliated) */}
            {currentOrg && (
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Our Affiliated Department
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      {currentOrg.name}
                    </h2>
                    <p className="text-xs text-indigo-200 mt-0.5 uppercase tracking-wide font-medium">
                      {currentOrg.type} • Official Operational Roster
                    </p>
                  </div>

                  <div className="bg-indigo-800/60 px-4 py-2.5 rounded-xl border border-indigo-600/40 text-center sm:text-right">
                    <p className="text-[11px] text-indigo-300 uppercase font-semibold">Total Technicians</p>
                    <p className="text-2xl font-black text-white mt-0.5">{fellowWorkers.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-indigo-200 border-t border-indigo-800/80">
                  {currentOrg.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{currentOrg.address}</span>
                    </div>
                  )}
                  {currentOrg.official_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Helpline: {currentOrg.official_phone}</span>
                    </div>
                  )}
                  {currentOrg.official_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Email: {currentOrg.official_email}</span>
                    </div>
                  )}
                </div>

                {/* Fellow Technicians List in Department */}
                {fellowWorkers.length > 0 && (
                  <div className="pt-3 border-t border-indigo-800/60">
                    <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Department Technicians Squad ({fellowWorkers.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fellowWorkers.map((fw) => {
                        const name = fw.profiles?.full_name || "Specialist";
                        const isMe = fw.id === workerId;
                        return (
                          <div
                            key={fw.id}
                            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border ${
                              isMe
                                ? "bg-indigo-600/50 border-indigo-400 text-white font-bold ring-1 ring-indigo-400/50"
                                : "bg-slate-800/60 border-slate-700 text-slate-300"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${fw.is_active ? "bg-emerald-400" : "bg-slate-500"}`} />
                            <span>{name} {isMe && "(You)"}</span>
                            <span className="text-[10px] opacity-75 font-mono">
                              [{fw.current_active_jobs || 0} active]
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Organizations Directory */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Civic Departments & Organizations Directory
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Browse all verified municipal bodies and utility boards. Technicians can submit applications to join department dispatch rosters.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                  {orgList.length} Departments Registered
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orgList.map((o) => {
                  const isMyOrg = Boolean(currentOrg && o.id === currentOrg.id);
                  const hasApplied = appliedOrgIdSet.has(o.id);
                  const technicianCount = countMap[o.id] || 0;

                  return (
                    <Card
                      key={o.id}
                      className={`border transition-all shadow-xs ${
                        isMyOrg
                          ? "border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <CardHeader className="pb-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                              {o.name}
                            </CardTitle>
                            <span className="text-xs font-medium text-slate-500 uppercase mt-0.5 block">
                              {o.type}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            o.status === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {o.status || "ACTIVE"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs text-slate-600 pt-0">
                        {/* Worker Count Badge */}
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span><strong>{technicianCount}</strong> Technicians Active in Department</span>
                        </div>

                        {o.address && (
                          <p className="flex items-start gap-1.5 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{o.address}</span>
                          </p>
                        )}
                        {o.official_phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Helpline: {o.official_phone}</span>
                          </p>
                        )}
                        {o.official_email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Email: {o.official_email}</span>
                          </p>
                        )}

                        {/* Application Action Button */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            {isMyOrg ? "Currently affiliated" : "Apply to join dispatch team"}
                          </span>
                          <ApplyOrgButton
                            organizationId={o.id}
                            organizationName={o.name}
                            isCurrentOrg={isMyOrg}
                            hasApplied={hasApplied}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === "completed" ? (
          /* ========================================================= */
          /* TAB 2: COMPLETED & VERIFIED JOBS (BEFORE/AFTER & AI NOTES) */
          /* ========================================================= */
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Completed & Verified Work Orders
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Archived resolutions verified by Gemini AI comparative visual analysis and departmental inspection.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {completedGrievances.length} Resolved
              </Badge>
            </div>

            {completedGrievances.length === 0 ? (
              <Card className="border-slate-200/80 shadow-xs">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No Completed Jobs Yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accept incoming dispatch orders, complete repairs, and submit resolution evidence to see them verified here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedGrievances.map((g) => {
                const evidence = Array.isArray(g.completion_evidence) && g.completion_evidence.length > 0
                  ? g.completion_evidence[0]
                  : null;
                const aiVerification = Array.isArray(g.ai_evidence_verifications) && g.ai_evidence_verifications.length > 0
                  ? g.ai_evidence_verifications[0]
                  : null;
                const beforeImage = Array.isArray(g.grievance_images) 
                  ? g.grievance_images.find((img) => img.is_before)
                  : null;

                const isPass = aiVerification?.result === "PASS" || aiVerification?.visual_improvement;

                return (
                  <Card key={g.id} className="border-slate-200/80 shadow-xs bg-white overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {g.public_id}
                          </span>
                          <StatusBadge status={g.status} />
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {g.category}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Completed: {new Date(evidence?.submitted_at || g.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 mt-2">
                        {g.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600">
                        {g.coarse_address}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* Before and After Photographs Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Before Photo */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-slate-400" />
                            Before (Reported Damage)
                          </span>
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                            {beforeImage?.storage_path ? (
                              <img
                                src={beforeImage.storage_path}
                                alt="Reported Damage"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-slate-400">Citizen initial photo on file</span>
                            )}
                          </div>
                        </div>

                        {/* After Photo */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            After (Completed On-Site Repair)
                          </span>
                          <div className="rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 aspect-video flex items-center justify-center">
                            {evidence?.after_image_url ? (
                              <img
                                src={evidence.after_image_url}
                                alt="Repair Proof"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-slate-400">Resolution evidence submitted</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Verification Analysis Audit Card */}
                      {aiVerification ? (
                        <div className={`p-4 rounded-xl border ${
                          isPass
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                            : "bg-rose-50/70 border-rose-200 text-rose-950"
                        } space-y-2`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className={`w-4 h-4 ${isPass ? "text-emerald-600" : "text-rose-600"}`} />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Gemini AI Comparative Analysis
                              </span>
                            </div>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isPass ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"
                            }`}>
                              Verification: {aiVerification.result || (isPass ? "PASS" : "FAIL")}
                              {aiVerification.confidence && ` (${Math.round(aiVerification.confidence * 100)}% Confidence)`}
                            </span>
                          </div>

                          <p className="text-xs font-medium leading-relaxed">
                            {aiVerification.reason || "Technician completion evidence verified consistent with reported civic defect."}
                          </p>

                          {aiVerification.consistency_notes && (
                            <p className="text-[11px] opacity-80 italic">
                              Inspector Note: {aiVerification.consistency_notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                          Evidence submitted and queued for departmental sign-off.
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-1">
                        <Link href={`/worker/jobs/${g.id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-8">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Full Job Dossier
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* TAB 3: DISPATCH OFFERS / ACTIVE REPAIRS / ALL JOBS */
          /* ========================================================= */
          <div className="space-y-4">
            {activeTab === "active" && actionRequiredGrievances.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900">
                <span className="flex items-center gap-2 font-bold">
                  <Flame className="w-4 h-4 text-amber-600" />
                  {actionRequiredGrievances.length} Active Dispatch Orders Offered to You
                </span>
                <span className="text-[11px] text-amber-700">
                  Review GPS distance, turn-by-turn routes, and accept or decline below.
                </span>
              </div>
            )}

            {displayedList.length === 0 ? (
              <Card className="border-slate-200/80 shadow-xs">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No Jobs In This Queue</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Check other tabs or standby for new dispatch assignments from your coordinator.
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayedList.map((g) => {
                const assignment = Array.isArray(g.worker_assignments) && g.worker_assignments.length > 0
                  ? g.worker_assignments[0]
                  : null;

                // For New Requests (ASSIGNED or unassigned department dispatch offer), use the Rapido / Uber delivery partner style card!
                if (
                  g.status === "ASSIGNED" ||
                  (g.status === "PENDING" && (!g.assigned_worker_id || g.assigned_worker_id === workerId))
                ) {
                  return (
                    <WorkerDispatchCard
                      key={g.id}
                      grievance={g as any}
                      assignmentStatus={assignment?.status}
                    />
                  );
                }

                // Standard card for In Progress / All
                return (
                  <Card key={g.id} className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-all bg-white">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {g.public_id}
                            </span>
                            <StatusBadge status={g.status} />
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              g.priority === "CRITICAL" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                            }`}>
                              {g.priority}
                            </span>
                            <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {g.category}
                            </span>
                          </div>

                          <h3 className="text-base font-semibold text-slate-900 leading-snug">
                            {g.title}
                          </h3>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {g.description}
                          </p>

                          {/* Location & Live Distance Details */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              {g.coarse_address}
                            </span>

                            {/* Live Distance Calculator */}
                            <WorkerDistanceCalculator
                              targetLatitude={g.latitude}
                              targetLongitude={g.longitude}
                              compact={true}
                            />

                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${g.latitude},${g.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-medium ml-auto sm:ml-0"
                            >
                              <Navigation className="w-3 h-3" />
                              GPS Directions
                            </a>
                          </div>
                        </div>

                        {/* Actions (Accept, Decline, Submit Evidence, Details) */}
                        <div className="pt-2 sm:pt-0 sm:self-center shrink-0 border-t sm:border-t-0 border-slate-100">
                          <WorkerJobCardActions
                            grievanceId={g.id}
                            status={g.status}
                            assignmentStatus={assignment?.status}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
