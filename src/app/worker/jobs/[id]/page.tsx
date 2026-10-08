import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkerJobCardActions } from "../../worker-job-card-actions";
import { WorkerDistanceCalculator } from "@/components/worker/worker-distance-calculator";
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Calendar, 
  AlertTriangle, 
  Camera, 
  Wrench,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  XCircle,
  RotateCcw
} from "lucide-react";

export const dynamic = "force-dynamic";

interface WorkerJobPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkerJobDetailPage({ params }: WorkerJobPageProps) {
  const { id } = await params;
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect(`/login?next=/worker/jobs/${id}`);
  }

  if (user.role !== "WORKER" && user.role !== "PLATFORM_ADMIN") {
    redirect("/citizen");
  }

  const adminClient = createAdminClient();

  // Fetch Grievance
  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select(`
      *,
      organizations (
        name,
        type,
        official_phone
      ),
      worker_assignments (
        status,
        assigned_at,
        responded_at
      )
    `)
    .eq("id", id)
    .single();

  if (gError || !grievance) {
    notFound();
  }

  // Fetch Before Image
  const { data: images } = await adminClient
    .from("grievance_images")
    .select("storage_path, is_before")
    .eq("grievance_id", id);

  let beforeImageUrl: string | null = null;
  const beforeImg = images?.find((img) => img.is_before);
  if (beforeImg) {
    if (beforeImg.storage_path.startsWith("http")) {
      beforeImageUrl = beforeImg.storage_path;
    } else {
      const { data: signedData } = await adminClient.storage
        .from("grievance-images")
        .createSignedUrl(beforeImg.storage_path, 3600);
      beforeImageUrl = signedData?.signedUrl || null;
    }
  }

  // Fetch Latest Completion Evidence
  const { data: evidence } = await adminClient
    .from("completion_evidence")
    .select("*")
    .eq("grievance_id", id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  // Fetch Latest AI Evidence Verification (Gemini Before vs After)
  const { data: aiVerification } = await adminClient
    .from("ai_evidence_verifications")
    .select("*")
    .eq("grievance_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch Latest Resolution Review (if rework required)
  const { data: latestReview } = await adminClient
    .from("resolution_reviews")
    .select("*")
    .eq("grievance_id", id)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const assignment = Array.isArray(grievance.worker_assignments) && grievance.worker_assignments.length > 0
    ? grievance.worker_assignments[0]
    : null;

  const org = grievance.organizations as { name?: string; type?: string; official_phone?: string } | null;
  const isPass = aiVerification?.result === "PASS" || (aiVerification?.visual_improvement && aiVerification?.result !== "FAIL");

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Link href="/worker" className="hover:text-slate-800 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Field Operations Portal
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-900 font-semibold">{grievance.public_id}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {grievance.public_id}
                </span>
                <StatusBadge status={grievance.status} />
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {grievance.priority} Priority
                </span>
                <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {grievance.category}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
                {grievance.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Assigned by <strong>{org?.name || "Operational Authority"}</strong></span>
                {org?.official_phone && <span>(Helpline: {org.official_phone})</span>}
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <WorkerJobCardActions
                grievanceId={grievance.id}
                status={grievance.status}
                assignmentStatus={assignment?.status}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
        {/* Rework Notice Banner if applicable */}
        {grievance.status === "REWORK_REQUIRED" && latestReview && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Rework Requested by Department Inspector
                </h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  &ldquo;{latestReview.reason || "The submitted repair does not satisfy official quality standards."}&rdquo;
                </p>
                <p className="text-[11px] text-amber-700 mt-2 font-medium">
                  Please return to the site, complete necessary adjustments, and re-submit resolution evidence.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location & Navigation Card */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              On-Site Geographic Target & Proximity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <div>
                <p className="text-xs font-semibold text-slate-900">{grievance.coarse_address}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Target GPS: {grievance.latitude.toFixed(6)}, {grievance.longitude.toFixed(6)}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${grievance.latitude},${grievance.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 flex items-center gap-1.5 w-full sm:w-auto font-medium">
                  <Navigation className="w-3.5 h-3.5" />
                  Launch Turn-by-Turn GPS Map
                </Button>
              </a>
            </div>

            {/* Live GPS Distance Calculator */}
            <WorkerDistanceCalculator
              targetLatitude={grievance.latitude}
              targetLongitude={grievance.longitude}
            />

            <p className="text-[11px] text-slate-500 italic">
              * Note: Strict tolerance requirement. You must be physically within 100 meters of these coordinates when submitting completion evidence.
            </p>
          </CardContent>
        </Card>

        {/* Visual Evidence: Before & After Comparison */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              Visual Repair Evidence (Before & After Analysis)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/60 whitespace-pre-wrap">
              <strong>Incident Description:</strong> {grievance.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-slate-400" />
                  Initial Damage (Citizen Report)
                </span>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                  {beforeImageUrl ? (
                    <img
                      src={beforeImageUrl}
                      alt="Initial Reported Damage"
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
                  Completion Proof (Technician Photo)
                </span>
                <div className="rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 aspect-video flex items-center justify-center">
                  {afterImageUrl ? (
                    <img
                      src={afterImageUrl}
                      alt="Completed Repair"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <span className="text-xs text-slate-400 block">Pending completion photo</span>
                      {grievance.status === "IN_PROGRESS" && (
                        <Link href={`/worker/jobs/${grievance.id}/submit`}>
                          <Button size="sm" className="mt-2 text-xs h-7 bg-indigo-600 text-white">
                            Submit Photo Now
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Verification Analysis Breakdown */}
            {aiVerification && (
              <div className={`p-4 rounded-xl border mt-3 ${
                isPass 
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950" 
                  : "bg-rose-50/80 border-rose-300 text-rose-950"
              } space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${isPass ? "text-emerald-600" : "text-rose-600"}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Gemini AI Verification Result
                    </span>
                  </div>
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    isPass ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"
                  }`}>
                    {aiVerification.result || (isPass ? "PASS" : "FAIL")}
                    {aiVerification.confidence && ` (${Math.round(aiVerification.confidence * 100)}% Confidence)`}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-semibold">
                    {isPass ? "Verification Status: Passed" : "Verification Status: Issues Detected / Incomplete"}
                  </p>
                  <p className="leading-relaxed">
                    {aiVerification.reason}
                  </p>
                  {aiVerification.consistency_notes && (
                    <p className="opacity-80 italic pt-1 border-t border-black/10">
                      <strong>Inspector Note:</strong> {aiVerification.consistency_notes}
                    </p>
                  )}
                </div>

                {!isPass && grievance.status === "IN_PROGRESS" && (
                  <div className="pt-2">
                    <Link href={`/worker/jobs/${grievance.id}/submit`}>
                      <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Re-photograph & Resubmit Resolution Evidence
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Submit CTA if in progress and no evidence submitted */}
        {grievance.status === "IN_PROGRESS" && !afterImageUrl && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-center space-y-3">
            <Camera className="w-8 h-8 text-indigo-600 mx-auto" />
            <h3 className="text-sm font-bold text-indigo-900">Finished the on-site repair?</h3>
            <p className="text-xs text-indigo-700 max-w-md mx-auto">
              Acquire current GPS lock, take a clear photo of the restored area, and submit completion evidence for departmental sign-off.
            </p>
            <Link href={`/worker/jobs/${grievance.id}/submit`}>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-bold shadow-xs">
                Submit Resolution Evidence Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
