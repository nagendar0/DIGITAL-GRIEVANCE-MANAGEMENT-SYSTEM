import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Building2, 
  AlertTriangle, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Wrench, 
  Search, 
  MapPin, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Filter,
  UserPlus,
  Phone,
  Send
} from "lucide-react";
import { isGrievanceInOrgDomain, ORG_DOMAIN_MAPPING } from "@/lib/org/domain-mapping";
import { OrgTechniciansHub, WorkerItem, PendingApplicationItem } from "@/components/org/org-technicians-hub";
import { ApplicationActions, InviteWorkerButton } from "@/components/org/org-worker-requests-actions";

export const dynamic = "force-dynamic";

interface OrgPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function OrgDashboardPage({ searchParams }: OrgPageProps) {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/org");
  }

  if (!user.organizationId && user.role !== "PLATFORM_ADMIN") {
    redirect("/login?role=org&mode=signup");
  }

  const adminClient = createAdminClient();

  // If PLATFORM_ADMIN is viewing, or ORG_MEMBER
  let orgId = user.organizationId;

  // If user has no organization associated yet (e.g. fresh registration or admin preview)
  if (!orgId) {
    const { data: firstOrg } = await adminClient
      .from("organizations")
      .select("id")
      .limit(1)
      .single();
    orgId = firstOrg?.id || null;
  }

  if (!orgId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">No Organization Linked</h2>
        <p className="text-sm text-slate-600 mt-1 mb-6">
          Your account is not currently assigned to an operational authority.
        </p>
        <Link href="/register-organization">
          <Button>Register an Organization</Button>
        </Link>
      </div>
    );
  }

  // Fetch organization profile
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    redirect("/login");
  }

  const { status: statusFilter } = await searchParams;
  const orgDomain = ORG_DOMAIN_MAPPING[org.type] || ORG_DOMAIN_MAPPING.OTHER;

  // Parallel fetch: Workers count, candidate grievances, all platform workers, and org requests
  const [workersResult, grievancesResult, allWorkersResult, orgRequestsResult] = await Promise.all([
    adminClient.from("workers").select("*", { count: "exact", head: true }).eq("organization_id", org.id).eq("is_active", true),
    adminClient
      .from("grievances")
      .select(`
        id, public_id, title, description, category, priority, status, coarse_address, created_at, assigned_org_id, assigned_worker_id,
        workers (
          id,
          profiles (full_name)
        )
      `)
      .or(`assigned_org_id.eq.${org.id},status.eq.PENDING`)
      .order("created_at", { ascending: false })
      .limit(100),
    adminClient
      .from("workers")
      .select(`
        id,
        user_id,
        organization_id,
        skills,
        is_active,
        current_active_jobs,
        created_at,
        profiles (
          id,
          full_name,
          phone
        ),
        organizations (
          id,
          name,
          type
        )
      `)
      .order("created_at", { ascending: false }),
    adminClient
      .from("worker_organization_requests")
      .select(`
        id,
        worker_id,
        type,
        status,
        message,
        created_at,
        workers (
          id,
          skills,
          profiles (
            full_name,
            phone
          )
        )
      `)
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
  ]);

  const rawGrievances = (grievancesResult.data || []) as any[];
  const workersCount = workersResult.count || 0;

  // Process worker requests
  const rawRequests = (orgRequestsResult.data || []) as any[];
  const pendingApplications = rawRequests.filter(
    (r) => r.type === "WORKER_APPLICATION" && r.status === "PENDING"
  );
  const pendingInvitations = rawRequests.filter(
    (r) => r.type === "ORG_INVITATION" && r.status === "PENDING"
  );

  const pendingAppWorkerMap = new Map<string, any>();
  for (const app of pendingApplications) {
    pendingAppWorkerMap.set(app.worker_id, app);
  }

  const pendingInviteWorkerMap = new Map<string, any>();
  for (const inv of pendingInvitations) {
    pendingInviteWorkerMap.set(inv.worker_id, inv);
  }

  const rawAllWorkers = (allWorkersResult.data || []) as any[];
  const mappedWorkers: WorkerItem[] = rawAllWorkers.map((w) => {
    const profile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles;
    const orgData = Array.isArray(w.organizations) ? w.organizations[0] : w.organizations;
    const app = pendingAppWorkerMap.get(w.id);
    const inv = pendingInviteWorkerMap.get(w.id);

    return {
      id: w.id,
      userId: w.user_id,
      fullName: profile?.full_name || "Specialist",
      phone: profile?.phone || null,
      skills: (w.skills as string[]) || [],
      isActive: Boolean(w.is_active),
      activeJobs: w.current_active_jobs || 0,
      organizationId: w.organization_id || null,
      organizationName: orgData?.name || null,
      isCurrentOrg: w.organization_id === org.id,
      hasPendingApplication: Boolean(app),
      applicationRequestId: app?.id || null,
      applicationMessage: app?.message || null,
      applicationCreatedAt: app?.created_at || null,
      hasPendingInvitation: Boolean(inv),
    };
  });

  const pendingAppItems: PendingApplicationItem[] = pendingApplications.map((app) => {
    const workerRaw = Array.isArray(app.workers) ? app.workers[0] : app.workers;
    const profile = Array.isArray(workerRaw?.profiles) ? workerRaw?.profiles[0] : workerRaw?.profiles;
    return {
      id: app.id,
      workerId: app.worker_id,
      workerName: profile?.full_name || "Specialist",
      workerPhone: profile?.phone || null,
      skills: (workerRaw?.skills as string[]) || [],
      message: app.message || "Field technician requested to join dispatch roster.",
      createdAt: app.created_at,
    };
  });

  // Filter grievances strictly belonging to this organization's specialized domain
  const domainGrievances = rawGrievances.filter((g) => isGrievanceInOrgDomain(g, org));

  // Domain-isolated KPI counts
  const pendingCount = domainGrievances.filter((g) => g.status === "PENDING").length;
  const inProgressCount = domainGrievances.filter((g) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(g.status)).length;
  const awaitingReviewCount = domainGrievances.filter((g) => g.status === "AWAITING_VERIFICATION").length;
  const resolvedCount = domainGrievances.filter((g) => ["VERIFIED", "CLOSED"].includes(g.status)).length;

  // Apply UI status tab filter on domain grievances
  const grievances = statusFilter && statusFilter !== "ALL"
    ? domainGrievances.filter((g) => g.status === statusFilter)
    : domainGrievances;

  const isPendingVerification = org.status === "PENDING_VERIFICATION";
  const isRejected = org.status === "REJECTED";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Organization Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {org.type.replace(/_/g, " ")}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-mono">Reg: {org.registration_number}</span>
                <span className="text-slate-300">•</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${orgDomain.badgeColor}`}>
                  <Zap className="w-3 h-3" />
                  {orgDomain.label}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2 break-words">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
                <span>{org.name}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5 break-words">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{org.address}</span>
              </p>
              <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-2 max-w-full">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="break-words">
                  <strong>Jurisdiction Scope:</strong> Exclusive intake for <strong>{orgDomain.label}</strong> complaints.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <Link href="#technicians-hub" className="flex-1 sm:flex-none">
                <Button variant="outline" className="text-xs h-9 flex items-center justify-center gap-1.5 relative border-slate-300 hover:border-blue-400 w-full sm:w-auto">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>Field Technicians ({workersCount || 0})</span>
                  {pendingAppItems.length > 0 && (
                    <span className="bg-amber-500 text-white font-bold rounded-full px-2 py-0.2 text-[10px] animate-pulse">
                      {pendingAppItems.length} New
                    </span>
                  )}
                </Button>
              </Link>
              {awaitingReviewCount ? (
                <Link href="/org?status=AWAITING_VERIFICATION" className="flex-1 sm:flex-none">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 flex items-center justify-center gap-1.5 w-full sm:w-auto">
                    <Clock className="w-4 h-4" />
                    Review Pending ({awaitingReviewCount})
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          {/* Pending Verification Banner */}
          {isPendingVerification && (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">
                    Accreditation Under Platform Review
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your organization registration has been submitted and is currently being audited by the Platform Administration. 
                    Field technician dispatch and resolution approval capabilities will become active immediately upon approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Banner */}
          {isRejected && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900">
                    Registration Application Rejected
                  </h3>
                  <p className="text-xs text-red-800 mt-1">
                    Reason provided: {org.rejection_reason || "Incomplete documentation or unverifiable jurisdiction."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* PENDING TECHNICIAN APPLICATION ALERT BANNER */}
        {pendingAppItems.length > 0 && (
          <div className="rounded-2xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-sky-50/90 p-5 sm:p-6 shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <UserPlus className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      New Field Technician Applications ({pendingAppItems.length})
                    </h2>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[11px] animate-pulse">
                      Action Required
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Certified technicians have applied to join <strong>{org.name}</strong>&apos;s field dispatch roster. Review credentials and approve to immediately assign them repair orders.
                  </p>
                </div>
              </div>

              <Link href="#technicians-hub">
                <Button size="sm" variant="outline" className="text-xs h-8 text-indigo-700 border-indigo-300 hover:bg-indigo-100/70 font-semibold shrink-0">
                  Manage Roster Hub ↓
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAppItems.map((app) => (
                <Card key={app.id} className="border-indigo-200 bg-white shadow-xs">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {app.workerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900">
                            {app.workerName}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Applied {new Date(app.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-semibold">
                        Pending Approval
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
                        <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1 tracking-wider">Skills & Expertise</p>
                        <div className="flex flex-wrap gap-1">
                          {app.skills.map((s, idx) => (
                            <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] italic">
                      &ldquo;{app.message}&rdquo;
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Roster Decision:
                      </span>
                      <ApplicationActions requestId={app.id} workerName={app.workerName} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Incoming Grievances</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{pendingCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Available for triage & assignment</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">In Progress</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{inProgressCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Assigned to field technicians</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Pending Review</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{awaitingReviewCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Evidence submitted, awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Resolved</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Formally verified and closed</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Field Squad</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{workersCount || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                {pendingAppItems.length > 0 ? (
                  <span className="text-amber-600 font-semibold">{pendingAppItems.length} application pending</span>
                ) : (
                  <span>Certified active personnel</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Grievance Queue */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Operational Grievance Dispatch Queue
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Assign qualified personnel, track on-site repair status, and review submitted verification evidence.
                </CardDescription>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll scrollbar-none pb-1.5 text-xs">
                <Link href="/org" className="shrink-0">
                  <Button
                    variant={!statusFilter || statusFilter === "ALL" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                  >
                    All
                  </Button>
                </Link>
                <Link href="/org?status=PENDING" className="shrink-0">
                  <Button
                    variant={statusFilter === "PENDING" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                  >
                    Unassigned
                  </Button>
                </Link>
                <Link href="/org?status=ASSIGNED" className="shrink-0">
                  <Button
                    variant={statusFilter === "ASSIGNED" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                  >
                    Assigned
                  </Button>
                </Link>
                <Link href="/org?status=IN_PROGRESS" className="shrink-0">
                  <Button
                    variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                  >
                    In Progress
                  </Button>
                </Link>
                <Link href="/org?status=AWAITING_VERIFICATION" className="shrink-0">
                  <Button
                    variant={statusFilter === "AWAITING_VERIFICATION" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                  >
                    Review Ready
                  </Button>
                </Link>
                <Link href="/org?status=CLOSED" className="shrink-0">
                  <Button
                    variant={statusFilter === "CLOSED" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                  >
                    Closed
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {grievances.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">Queue is clear</p>
                <p className="text-xs text-slate-500 mt-1">
                  No grievances currently matching your specialized domain ({orgDomain.label})
                  {statusFilter && statusFilter !== "ALL" ? ` with filter "${statusFilter}"` : ""}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Case ID & Title</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Priority</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Assigned Worker</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grievances.map((g) => {
                      const wRaw = g.workers as any;
                      const workerData = Array.isArray(wRaw) ? wRaw[0] : wRaw;
                      const workerProfile = Array.isArray(workerData?.profiles) ? workerData?.profiles[0] : workerData?.profiles;
                      const workerName = workerProfile?.full_name;

                      return (
                        <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {g.public_id}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(g.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900 mt-1">{g.title}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {g.coarse_address}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="text-xs capitalize">
                              {g.category.replace(/_/g, " ").toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                              g.priority === "URGENT" 
                                ? "bg-red-100 text-red-800" 
                                : g.priority === "HIGH" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {g.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={g.status} />
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {workerName ? (
                              <span className="font-medium text-slate-800">{workerName}</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {g.status === "AWAITING_VERIFICATION" ? (
                              <Link href={`/org/reviews/${g.id}`}>
                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                                  Review Evidence
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/org/grievances/${g.id}`}>
                                <Button size="sm" variant="outline" className="text-xs h-8">
                                  Manage
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Technicians & Recruitment Hub */}
        <OrgTechniciansHub
          currentOrgId={org.id}
          currentOrgName={org.name}
          workers={mappedWorkers}
          pendingApplications={pendingAppItems}
        />
      </div>
    </div>
  );
}
