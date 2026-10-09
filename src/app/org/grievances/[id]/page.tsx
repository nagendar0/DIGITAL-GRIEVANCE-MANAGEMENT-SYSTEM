import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { AssignWorkerForm } from "./assign-worker-form";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Wrench, 
  CheckCircle2, 
  Clock,
  AlertCircle
} from "lucide-react";

export const dynamic = "force-dynamic";

interface OrgGrievancePageProps {
  params: Promise<{ id: string }>;
}

export default async function OrgGrievanceDetailPage({ params }: OrgGrievancePageProps) {
  const { id } = await params;
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect(`/login?next=/org/grievances/${id}`);
  }

  if (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN") {
    redirect("/citizen");
  }

  const adminClient = createAdminClient();

  // 1. Fetch Grievance
  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select(`
      *,
      profiles!grievances_citizen_id_fkey (
        full_name,
        phone
      ),
      organizations (
        id,
        name,
        status
      ),
      workers (
        id,
        skills,
        profiles (
          full_name,
          phone
        )
      )
    `)
    .eq("id", id)
    .single();

  if (gError || !grievance) {
    notFound();
  }

  // 2. Fetch Before Image and Sign URL
  const { data: images } = await adminClient
    .from("grievance_images")
    .select("storage_path, is_before")
    .eq("grievance_id", id);

  let beforeImageUrl: string | null = null;
  const beforeImg = images?.find((img) => img.is_before);
  if (beforeImg) {
    const { data: signedData } = await adminClient.storage
      .from("grievance-images")
      .createSignedUrl(beforeImg.storage_path, 3600);
    beforeImageUrl = signedData?.signedUrl || null;
  }

  // 3. Fetch AI Analysis
  const { data: aiAnalysis } = await adminClient
    .from("ai_analyses")
    .select("*")
    .eq("grievance_id", id)
    .maybeSingle();

  // 4. Fetch Status History
  const { data: history } = await adminClient
    .from("grievance_status_history")
    .select(`
      *,
      profiles (
        full_name,
        role
      )
    `)
    .eq("grievance_id", id)
    .order("created_at", { ascending: true });

  // 5. Fetch available active workers for this organization
  const orgId = user.organizationId || grievance.assigned_org_id;
  const { data: activeWorkers } = await adminClient
    .from("workers")
    .select(`
      id,
      current_active_jobs,
      skills,
      profiles (
        full_name,
        phone
      )
    `)
    .eq("organization_id", orgId || "")
    .eq("is_active", true);

  const workerOptions = (activeWorkers || []).map((w) => ({
    id: w.id,
    fullName: (w.profiles as { full_name?: string } | null)?.full_name || "Field Specialist",
    phone: (w.profiles as { phone?: string } | null)?.phone || null,
    activeJobs: w.current_active_jobs || 0,
    skills: w.skills || [],
  }));

  const citizenProfile = grievance.profiles as { full_name?: string; phone?: string } | null;
  const assignedWorker = grievance.workers as { 
    id: string; 
    skills?: string[]; 
    profiles?: { full_name?: string; phone?: string } 
  } | null;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Link href="/org" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Command Center
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-900 font-semibold">{grievance.public_id}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {grievance.title}
                </h1>
                <StatusBadge status={grievance.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Reported on {new Date(grievance.created_at).toLocaleString()}</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">{grievance.category}</span>
                <span>•</span>
                <span className="font-mono">Priority: {grievance.priority}</span>
              </p>
            </div>

            {grievance.status === "AWAITING_VERIFICATION" && (
              <Link href={`/org/reviews/${grievance.id}`}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Review Field Evidence Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main 2-Column Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grievance Description & Evidence */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Citizen Submission Details
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Submitted by {citizenProfile?.full_name || "Verified Citizen"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Description & Observations
                  </h4>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/60">
                    {grievance.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Report Location
                    </h4>
                    <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 text-xs text-slate-700 space-y-1">
                      <p className="font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        {grievance.coarse_address}
                      </p>
                      <p className="font-mono text-slate-500 text-[11px]">
                        GPS: {grievance.latitude.toFixed(6)}, {grievance.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Citizen Contact
                    </h4>
                    <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 text-xs text-slate-700 space-y-1">
                      <p className="font-medium">{citizenProfile?.full_name || "Citizen"}</p>
                      <p className="text-slate-500">{citizenProfile?.phone || "No phone listed"}</p>
                    </div>
                  </div>
                </div>

                {beforeImageUrl && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Initial Damage Photo (Evidence Baseline)
                    </h4>
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-96 flex items-center justify-center">
                      <img
                        src={beforeImageUrl}
                        alt="Initial Grievance Photographic Evidence"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Triage Intelligence */}
            {aiAnalysis && (
              <Card className="border-blue-100 bg-blue-50/30 shadow-xs">
                <CardHeader className="pb-3 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Gemini Advisory Triage Assessment
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Automated multi-modal preliminary analysis for departmental routing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {aiAnalysis.summary && (
                    <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-lg border border-blue-100">
                      {aiAnalysis.summary}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                      <p className="text-[11px] text-slate-500">Severity Score</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {aiAnalysis.severity_score !== null ? `${aiAnalysis.severity_score}/10` : "N/A"}
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                      <p className="text-[11px] text-slate-500">Duplicate Risk</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {aiAnalysis.duplicate_score !== null ? `${Math.round(aiAnalysis.duplicate_score * 100)}%` : "Low"}
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                      <p className="text-[11px] text-slate-500">AI Priority</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {aiAnalysis.suggested_priority || "NORMAL"}
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                      <p className="text-[11px] text-slate-500">Target Dept</p>
                      <p className="text-xs font-semibold text-slate-900 mt-1 truncate">
                        {aiAnalysis.suggested_department || "Public Works"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status History Timeline */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Lifecycle Audit History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {history?.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 font-mono">
                          {h.to_status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{h.notes || "State changed."}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Dispatch & Worker Management */}
          <div className="space-y-6">
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Technician Dispatch
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Assign or track certified personnel responsible for on-site execution.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {assignedWorker ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                          {assignedWorker.profiles?.full_name?.charAt(0) || "T"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {assignedWorker.profiles?.full_name || "Field Technician"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {assignedWorker.profiles?.phone || "Phone on file"}
                          </p>
                        </div>
                      </div>

                      {assignedWorker.skills && assignedWorker.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {assignedWorker.skills.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="flex items-center gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {grievance.status === "ASSIGNED" && "Dispatched: Awaiting technician acceptance on field portal."}
                        {grievance.status === "ACCEPTED" && "Accepted: Technician is preparing to travel to site."}
                        {grievance.status === "IN_PROGRESS" && "In Progress: Technician is actively working on-site."}
                        {grievance.status === "AWAITING_VERIFICATION" && "Completed: Awaiting photo & AI verification review."}
                        {["VERIFIED", "CLOSED"].includes(grievance.status) && "Resolved: Job completed and verified."}
                        {grievance.status === "REWORK_REQUIRED" && "Rework Required: Previous attempt rejected."}
                      </p>
                    </div>

                    {(grievance.status === "ASSIGNED" || grievance.status === "REWORK_REQUIRED") && (
                      <div className="pt-2 border-t border-slate-100">
                        <AssignWorkerForm
                          grievanceId={grievance.id}
                          workers={workerOptions.filter((w) => w.id !== assignedWorker.id)}
                          grievanceCategory={grievance.category}
                          isReassign={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {grievance.status === "PENDING" || grievance.status === "REWORK_REQUIRED" ? (
                      <AssignWorkerForm
                        grievanceId={grievance.id}
                        workers={workerOptions}
                        grievanceCategory={grievance.category}
                      />
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-500">
                        This grievance is currently in status <strong>{grievance.status}</strong> and cannot be assigned.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jurisdiction Info */}
            <Card className="border-slate-200/80 shadow-xs bg-slate-50/50">
              <CardContent className="p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Chain of Custody Notice
                </p>
                <p className="leading-relaxed">
                  Every state transition, GPS ping, and image hash is logged immutably. 
                  Resolution can only be approved after mathematical GPS verification and photographic proof of repair.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
