import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OnboardWorkerDialog } from "./onboard-worker-dialog";
import { WorkerToggleButton } from "./worker-toggle-button";
import { ApplicationActions, InviteWorkerButton } from "@/components/org/org-worker-requests-actions";
import { 
  OrgTechniciansHub, 
  WorkerItem, 
  PendingApplicationItem 
} from "@/components/org/org-technicians-hub";
import { 
  Users, 
  ArrowLeft, 
  Clock,
  UserPlus
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrgWorkersDirectoryPage() {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/org/workers");
  }

  if (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN") {
    redirect("/citizen");
  }

  const adminClient = createAdminClient();
  let orgId = user.organizationId;

  if (!orgId) {
    const { data: firstOrg } = await adminClient
      .from("organizations")
      .select("id")
      .limit(1)
      .single();
    orgId = firstOrg?.id || null;
  }

  if (!orgId) {
    redirect("/org");
  }

  // Fetch organization details
  const { data: org } = await adminClient
    .from("organizations")
    .select("id, name, status")
    .eq("id", orgId)
    .single();

  if (!org) {
    redirect("/org");
  }

  // Parallel fetch: All platform workers and organization requests
  const [allWorkersResult, orgRequestsResult] = await Promise.all([
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

  const squadCount = mappedWorkers.filter((w) => w.isCurrentOrg).length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
            <Link href="/org" className="hover:text-slate-800 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Command Center
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Technicians Roster</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Field Technicians & Specialists Hub
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Directory of certified maintenance personnel for {org.name}. Manage applications, squad members, and recruit platform technicians.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {org.status === "VERIFIED" ? (
                <OnboardWorkerDialog organizationId={org.id} />
              ) : (
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs py-1.5 px-3">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Onboarding unlocked once org is verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Full Interactive Technicians Hub */}
        <OrgTechniciansHub
          currentOrgId={org.id}
          currentOrgName={org.name}
          workers={mappedWorkers}
          pendingApplications={pendingAppItems}
          defaultTab={pendingAppItems.length > 0 ? "pending" : "available"}
        />
      </div>
    </div>
  );
}
