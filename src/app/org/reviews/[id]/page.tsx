import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReviewActionControls } from "./review-action-controls";
import { 
  ArrowLeft, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Check, 
  X,
  FileCheck2,
  Calendar
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrgReviewEvidencePage({ params }: ReviewPageProps) {
  const { id } = await params;
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect(`/login?next=/org/reviews/${id}`);
  }

  if (user.role !== "ORG_MEMBER" && user.role !== "PLATFORM_ADMIN") {
    redirect("/citizen");
  }

  const adminClient = createAdminClient();

  // 1. Fetch Grievance with relations
  const { data: grievance, error: gError } = await adminClient
    .from("grievances")
    .select(`
      *,
      profiles!grievances_citizen_id_fkey (
        full_name,
        phone
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

  // 2. Fetch Completion Evidence
  const { data: evidence } = await adminClient
    .from("completion_evidence")
    .select("*")
    .eq("grievance_id", id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch GPS Verification
  const { data: gpsVerification } = await adminClient
    .from("gps_verifications")
    .select("*")
    .eq("grievance_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Fetch AI Evidence Verification
  const { data: aiVerification } = await adminClient
    .from("ai_evidence_verifications")
    .select("*")
    .eq("grievance_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Fetch Before Image and Sign URL
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

  // 6. Sign After Image URL
  let afterImageUrl: string | null = null;
  if (evidence?.after_image_url) {
    const { data: signedAfter } = await adminClient.storage
      .from("completion-evidence")
      .createSignedUrl(evidence.after_image_url, 3600);
    afterImageUrl = signedAfter?.signedUrl || null;
  }

  const citizen = grievance.profiles as { full_name?: string; phone?: string } | null;
  const worker = grievance.workers as { 
    id: string; 
    skills?: string[]; 
    profiles?: { full_name?: string; phone?: string } 
  } | null;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Link href="/org" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Command Center
            </Link>
            <span>/</span>
            <Link href={`/org/grievances/${grievance.id}`} className="hover:text-slate-800">
              {grievance.public_id}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Verification Inspection</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Resolution Evidence Inspection
                </h1>
                <StatusBadge status={grievance.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Case ID: <span className="font-mono font-semibold text-blue-600">{grievance.public_id}</span> • {grievance.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Visual Before & After Photographic Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Column */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="font-bold tracking-wide uppercase text-amber-400">1. Reported Problem (Before)</span>
              <span className="text-slate-400">{new Date(grievance.created_at).toLocaleDateString()}</span>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-72 flex items-center justify-center">
                {beforeImageUrl ? (
                  <img
                    src={beforeImageUrl}
                    alt="Before Repair Evidence"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-xs text-slate-400">No initial photograph available</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Citizen Issue Description:</p>
                <p className="text-xs text-slate-800 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {grievance.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* After Column */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="font-bold tracking-wide uppercase text-emerald-400">2. Restored Asset (After)</span>
              <span className="text-slate-400">
                {evidence?.submitted_at ? new Date(evidence.submitted_at).toLocaleDateString() : "Just now"}
              </span>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-72 flex items-center justify-center">
                {afterImageUrl ? (
                  <img
                    src={afterImageUrl}
                    alt="After Repair Evidence"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-xs text-slate-400">Evidence image processing</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Technician Execution Notes ({worker?.profiles?.full_name || "Specialist"}):
                </p>
                <p className="text-xs text-slate-800 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                  {evidence?.description || "Repair completed on-site."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Engine Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GPS Haversine Verification Card */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  GPS Haversine Mathematical Audit
                </CardTitle>
                {gpsVerification && (
                  <Badge className={`text-xs ${
                    gpsVerification.result === "MATCH" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {gpsVerification.result === "MATCH" ? "TOLERANCE MET" : "TOLERANCE EXCEEDED"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {gpsVerification ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
                    <div>
                      <p className="text-slate-500">Separation Distance</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">
                        {gpsVerification.distance_meters} meters
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">Allowed Threshold</p>
                      <p className="text-base font-bold text-slate-700 mt-0.5">
                        ≤ {gpsVerification.allowed_radius_meters}m
                      </p>
                    </div>
                  </div>

                  {/* Mandatory GPS Disclaimer */}
                  <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2.5 rounded border border-amber-100 text-amber-900">
                    * {gpsVerification.disclaimer}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">GPS telemetry record pending.</p>
              )}
            </CardContent>
          </Card>

          {/* Gemini AI Advisory Review Card */}
          <Card className="border-blue-100 bg-blue-50/20 shadow-xs">
            <CardHeader className="pb-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Gemini Advisory Multi-Modal Analysis
                  </CardTitle>
                </div>
                {aiVerification && (
                  <Badge variant="outline" className="text-xs bg-white text-blue-700 border-blue-200">
                    Confidence: {Math.round(aiVerification.confidence * 100)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {aiVerification ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <p className="text-slate-500 text-[11px]">Visual Improvement</p>
                      <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                        {aiVerification.visual_improvement ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Confirmed Restored
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5 text-red-600" />
                            Inconclusive
                          </>
                        )}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <p className="text-slate-500 text-[11px]">Issue Relevance</p>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {Math.round(aiVerification.relevance_score * 100)}% match
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-blue-100">
                    {aiVerification.consistency_notes}
                  </p>

                  <p className="text-[11px] text-blue-700 italic">
                    * AI analysis is strictly advisory. Human operator review is legally required for closure.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">AI analysis processing...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Decision Controls (Approve / Rework) */}
        {grievance.status === "AWAITING_VERIFICATION" && (
          <ReviewActionControls
            grievanceId={grievance.id}
            publicId={grievance.public_id}
          />
        )}
      </div>
    </div>
  );
}
