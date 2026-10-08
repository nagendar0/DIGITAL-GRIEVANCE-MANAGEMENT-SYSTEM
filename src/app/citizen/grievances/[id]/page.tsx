import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatDistance, formatDuration } from "@/lib/utils";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Compass, 
  Sparkles, 
  AlertCircle,
  Building2,
  HardHat,
  ShieldCheck,
  RotateCcw,
  Wrench,
  Camera,
  UserCheck,
  Check,
  FileText
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GrievanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  // 1. Fetch grievance with full relations
  const { data: grievance } = await adminClient
    .from("grievances")
    .select(`
      *,
      organizations (
        id,
        name,
        type,
        official_email,
        official_phone
      ),
      workers (
        id,
        skills,
        profiles (
          full_name,
          phone
        )
      ),
      worker_assignments (
        status,
        assigned_at,
        responded_at
      )
    `)
    .eq("id", id)
    .single();

  if (!grievance) {
    notFound();
  }

  // Ensure security: Citizens can only inspect their own grievances
  if (user.role === "CITIZEN" && grievance.citizen_id !== user.id) {
    redirect("/citizen");
  }

  // 2. Fetch Before Image and generate signed URL
  const { data: images } = await adminClient
    .from("grievance_images")
    .select("*")
    .eq("grievance_id", id)
    .order("created_at", { ascending: true });

  let beforeImageUrl: string | null = null;
  const beforeImg = images?.find((img) => img.is_before) || images?.[0];
  if (beforeImg) {
    const { data: signedBefore } = await adminClient.storage
      .from("grievance-images")
      .createSignedUrl(beforeImg.storage_path, 3600);
    beforeImageUrl = signedBefore?.signedUrl || null;
  }

  // 3. Fetch completion evidence (if submitted)
  const { data: evidence } = await adminClient
    .from("completion_evidence")
    .select(`
      *,
      workers (
        skills,
        profiles (
          full_name,
          phone
        )
      )
    `)
    .eq("grievance_id", id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Generate signed URL for After Image
  let afterImageUrl: string | null = null;
  if (evidence?.after_image_url) {
    if (evidence.after_image_url.startsWith("http")) {
      afterImageUrl = evidence.after_image_url;
    } else {
      const { data: signedAfter } = await adminClient.storage
        .from("completion-evidence")
        .createSignedUrl(evidence.after_image_url, 3600);
      afterImageUrl = signedAfter?.signedUrl || null;
    }
  }

  // 5. Fetch real status history
  const { data: history } = await adminClient
    .from("grievance_status_history")
    .select("*, profiles(full_name, role)")
    .eq("grievance_id", id)
    .order("created_at", { ascending: true });

  // 6. Fetch AI triage analysis
  const { data: aiTriage } = await adminClient
    .from("ai_analyses")
    .select("*")
    .eq("grievance_id", id)
    .maybeSingle();

  // 7. Fetch GPS verification (if exists)
  const { data: gpsVerification } = await adminClient
    .from("gps_verifications")
    .select("*")
    .eq("grievance_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 8. Fetch AI evidence verification (Gemini Before vs After analysis)
  const { data: aiEvidenceVerification } = await adminClient
    .from("ai_evidence_verifications")
    .select("*")
    .eq("grievance_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const timelineItems = history || [];

  // Extract worker and organization details
  const workerRaw = (evidence?.workers || grievance.workers) as any;
  const worker = Array.isArray(workerRaw) ? workerRaw[0] : workerRaw;
  const workerProfile = worker?.profiles as { full_name?: string; phone?: string } | null;
  const workerSkills = (worker?.skills as string[]) || [];
  const org = grievance.organizations as {
    name?: string;
    type?: string;
    official_phone?: string;
    official_email?: string;
  } | null;

  const completedAt = grievance.closed_at || evidence?.submitted_at;
  const isCompleted = ["CLOSED", "VERIFIED", "AWAITING_VERIFICATION"].includes(grievance.status);

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8 lg:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
        {/* Navigation */}
        <div>
          <Link
            href="/citizen"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Grievances
          </Link>

          {/* Top Grievance Summary Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs sm:text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                {grievance.public_id}
              </span>
              <StatusBadge status={grievance.status} />
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                Priority: {grievance.priority}
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">
                {grievance.category}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">
              {grievance.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="break-words">{grievance.coarse_address}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Reported on {formatDate(grievance.created_at)}
              </span>
              {org && (
                <span className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  {org.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1. REAL-TIME WORK IN PROGRESS NOTICE (when accepted/in-progress) */}
        {grievance.status === "IN_PROGRESS" && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-400/30 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                  <Wrench className="w-6 h-6 text-white animate-spin" style={{ animationDuration: "6s" }} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Request Accepted — Working in Progress
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    Technician Assigned & Repair Underway
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
                    {workerProfile?.full_name ? (
                      <>
                        <strong>{workerProfile.full_name}</strong> from{" "}
                        <strong>{org?.name || "the Municipal Department"}</strong> has accepted your request and is currently executing physical repair operations on-site.
                      </>
                    ) : (
                      <>
                        An authorized field specialist from{" "}
                        <strong>{org?.name || "the Municipal Department"}</strong> has accepted your request and is actively working on resolving the issue on-site.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {workerProfile && (
                <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/20 text-xs text-white shrink-0 sm:min-w-[200px] w-full sm:w-auto">
                  <p className="text-[10px] text-blue-200 uppercase font-semibold">Assigned Specialist</p>
                  <p className="font-bold text-white text-sm mt-0.5">{workerProfile.full_name}</p>
                  <p className="text-[11px] text-blue-100 mt-0.5">
                    {workerSkills.slice(0, 2).join(", ") || "Certified Technician"}
                  </p>
                  {workerProfile.phone && (
                    <p className="text-[11px] text-blue-200 mt-1.5 font-mono">
                      📞 {workerProfile.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. COMPLETION NOTICE (when awaiting verification, verified, or closed) */}
        {grievance.status === "AWAITING_VERIFICATION" && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-amber-400/30 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Repairs Completed — Pending Official Inspection
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Work Completed by Field Technician
                </h2>
                <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-2xl leading-relaxed">
                  The on-site technician has finished the physical repairs and uploaded completion photographic proof. Department inspectors and AI auditing algorithms are performing final review before official closure.
                </p>
              </div>
            </div>
          </div>
        )}

        {grievance.status === "CLOSED" && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-400/30 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 mb-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Issue Officially Resolved & Closed
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Formally Verified & Restored
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl leading-relaxed">
                  This grievance has been fully resolved, inspected with AI vision analysis, GPS location mathematics, and approved by the municipal department.
                </p>
                {grievance.closure_notes && (
                  <p className="text-xs text-emerald-200 mt-2 bg-white/10 p-2.5 rounded-lg border border-white/20">
                    <strong>Official Notes:</strong> {grievance.closure_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* OFFICIAL MUNICIPAL RESOLUTION & COMPLETION RECORD */}
        {isCompleted && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 shadow-sm overflow-hidden animate-in fade-in">
            <CardHeader className="border-b border-emerald-100 bg-emerald-50/60 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Official Municipal Resolution & Completion Record
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600">
                      Certified public service turnaround record with technician and municipal authority verification.
                    </CardDescription>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {grievance.status === "CLOSED"
                    ? "Formally Closed & Restored"
                    : grievance.status === "VERIFIED"
                    ? "Verified & Solved"
                    : "Work Done — Review Pending"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* 4-Item Comprehensive Key Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Handling Authority / Organization */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Handling Authority</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {org?.name || "Municipal Operations Department"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {org?.type?.replace(/_/g, " ") || "Municipal Utility Authority"}
                  </p>
                  {org?.official_phone && (
                    <p className="text-[11px] text-slate-600 pt-1 font-mono break-all">
                      📞 {org.official_phone}
                    </p>
                  )}
                  {org?.official_email && (
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      ✉️ {org.official_email}
                    </p>
                  )}
                </div>

                {/* 2. Assigned Field Technician */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <HardHat className="w-4 h-4 text-amber-600" />
                    <span>Field Technician</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {workerProfile?.full_name || "Authorized Field Specialist"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {workerSkills.slice(0, 2).join(", ") || "Certified Municipal Specialist"}
                  </p>
                  {workerProfile?.phone && (
                    <p className="text-[11px] text-slate-600 pt-1 font-mono break-all">
                      📞 {workerProfile.phone}
                    </p>
                  )}
                </div>

                {/* 3. Issue Raised Date & Exact Time */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Issue Raised Date</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {formatDate(grievance.created_at)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Logged with verified GPS location telemetry
                  </p>
                </div>

                {/* 4. Completed Date & Exact Time + Duration */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completion Timestamp</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-950 mt-1">
                    {completedAt ? formatDate(completedAt) : "Awaiting Final Administrative Approval"}
                  </p>
                  {completedAt && grievance.created_at && (
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-0.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Resolution Turnaround: {formatDuration(grievance.created_at, completedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Official Sign-off and Technician Field Report Notes */}
              {(grievance.closure_notes || evidence?.description) && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Official Resolution Sign-Off Notes & Reports
                  </h4>
                  {grievance.closure_notes && (
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                      <strong>Department Closure Statement:</strong> {grievance.closure_notes}
                    </p>
                  )}
                  {evidence?.description && (
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                      <strong>Technician Field Report:</strong> {evidence.description}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Photos & Verification Proof */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Evidence Suite: BEFORE & AFTER PHOTOS */}
            <Card className="border-slate-200 overflow-hidden shadow-xs">
              <CardHeader className="bg-slate-50/50 pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    Before & After Photographic Evidence
                  </span>
                  <span className="text-xs font-normal text-slate-500">
                    {afterImageUrl ? "Comparison Complete" : "Intake Baseline"}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {afterImageUrl
                    ? "Side-by-side photographic record comparing initial reported condition against technician restoration."
                    : "Initial citizen report photograph captured at grievance filing."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className={`grid ${afterImageUrl ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-4`}>
                  {/* BEFORE PHOTO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        Origin Before Photo
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(grievance.created_at)}
                      </span>
                    </div>

                    <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {beforeImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={beforeImageUrl}
                          alt="Initial Reported Damage"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-400">
                          <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs font-medium">No initial image provided</p>
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        BEFORE REPAIR
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                      GPS: {grievance.latitude.toFixed(5)}, {grievance.longitude.toFixed(5)}
                    </p>
                  </div>

                  {/* AFTER PHOTO */}
                  {afterImageUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Technician After Photo
                        </span>
                        {evidence?.submitted_at && (
                          <span className="text-[10px] text-emerald-600 font-mono">
                            {formatDate(evidence.submitted_at)}
                          </span>
                        )}
                      </div>

                      <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-emerald-50/50 border-2 border-emerald-400 shadow-xs flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={afterImageUrl}
                          alt="Technician Completion Proof"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                          AFTER REPAIR
                        </span>
                      </div>

                      {evidence && (
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                          GPS: {evidence.latitude.toFixed(5)}, {evidence.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Worker's repair description if submitted */}
                {evidence && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5 text-amber-600" />
                      Technician Field Repair Notes:
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      &ldquo;{evidence.description}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI EVIDENCE VERIFICATION AUDIT (Gemini Before vs After) */}
            {aiEvidenceVerification && (
              <Card className="border-indigo-200 bg-indigo-50/30 shadow-xs">
                <CardHeader className="pb-3 border-b border-indigo-100/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <CardTitle className="text-sm font-bold text-indigo-950">
                        Gemini AI Vision Repair Audit
                      </CardTitle>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        aiEvidenceVerification.result === "MATCH"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {aiEvidenceVerification.result === "MATCH"
                        ? "AI VERIFIED: RESOLVED"
                        : "AI AUDIT: REQUIRES ATTENTION"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 bg-white/80 rounded-xl border border-indigo-100">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Visual Improvement</span>
                      <strong className="text-slate-900 font-semibold flex items-center gap-1 mt-0.5">
                        {aiEvidenceVerification.visual_improvement ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Confirmed Restored
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Needs Inspection
                          </>
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Relevance Score</span>
                      <strong className="text-slate-900 font-semibold mt-0.5 block">
                        {Math.round(aiEvidenceVerification.relevance_score * 100)}% Match
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Confidence Rating</span>
                      <strong className="text-slate-900 font-semibold mt-0.5 block">
                        {Math.round(aiEvidenceVerification.confidence * 100)}%
                      </strong>
                    </div>
                  </div>

                  {aiEvidenceVerification.reason && (
                    <p className="leading-relaxed">
                      <strong>AI Findings:</strong> {aiEvidenceVerification.reason}
                    </p>
                  )}

                  {aiEvidenceVerification.consistency_notes && (
                    <p className="leading-relaxed text-slate-600">
                      <strong>Consistency Details:</strong> {aiEvidenceVerification.consistency_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* GPS Haversine Verification Card */}
            {gpsVerification && (
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="bg-slate-50/50 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        Mathematical GPS Location Verification
                      </CardTitle>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        gpsVerification.result === "PASS"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-red-50 text-red-800 border-red-300"
                      }`}
                    >
                      {gpsVerification.result === "PASS" ? "GPS PASS (On-Site)" : "GPS DEVIATION"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Distance from Report Site</span>
                      <strong className="text-base font-bold text-slate-900 tabular-nums mt-0.5 block">
                        {formatDistance(gpsVerification.distance_meters)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Allowed Tolerance</span>
                      <strong className="text-base font-bold text-slate-900 tabular-nums mt-0.5 block">
                        {gpsVerification.allowed_radius_meters} meters
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-100">
                    {gpsVerification.disclaimer}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Initial Problem Description Card */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Detailed Citizen Grievance Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 whitespace-pre-wrap">
                  {grievance.description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Timeline & Assignment Info */}
          <div className="space-y-6">
            {/* Resolution History Timeline */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="bg-slate-50/50 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Live Resolution Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable progress updates from platform dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timelineItems.map((step, idx) => (
                    <div key={step.id} className="relative">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                          idx === timelineItems.length - 1
                            ? "border-blue-600 ring-4 ring-blue-100"
                            : "border-slate-400"
                        }`}
                      />

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <StatusBadge status={step.to_status} showIcon={false} />
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {formatDate(step.created_at)}
                          </span>
                        </div>

                        {step.notes && (
                          <p className="text-xs text-slate-600 leading-relaxed pt-1">
                            {step.notes}
                          </p>
                        )}

                        {step.profiles?.full_name && (
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {step.profiles.full_name} ({step.profiles.role})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department & Operational Authority Card */}
            {org && (
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Assigned Department
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600">
                  <p className="font-bold text-slate-900 text-sm">{org.name}</p>
                  <p className="text-[11px] text-slate-500 uppercase">{org.type}</p>
                  {org.official_phone && (
                    <p className="text-slate-700">Official Helpline: {org.official_phone}</p>
                  )}
                  {org.official_email && (
                    <p className="text-slate-700">Official Contact: {org.official_email}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
