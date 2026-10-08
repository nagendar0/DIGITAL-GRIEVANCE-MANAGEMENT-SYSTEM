import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Share2,
  Lock
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PublicGrievancePageProps {
  params: Promise<{ publicId: string }>;
}

export default async function PublicGrievanceDetailPage({ params }: PublicGrievancePageProps) {
  const { publicId } = await params;
  const adminClient = createAdminClient();

  // 1. Fetch from public_grievances_view
  const { data: record, error } = await adminClient
    .from("public_grievances_view")
    .select("*")
    .eq("public_id", publicId)
    .single();

  if (error || !record || !record.id) {
    notFound();
  }

  // 2. Fetch signed URLs for before/after images
  let beforeImageUrl: string | null = null;
  let afterImageUrl: string | null = null;

  if (record.before_image_path) {
    const { data } = await adminClient.storage
      .from("grievance-images")
      .createSignedUrl(record.before_image_path, 3600);
    beforeImageUrl = data?.signedUrl || null;
  }

  if (record.after_image_url) {
    const { data } = await adminClient.storage
      .from("completion-evidence")
      .createSignedUrl(record.after_image_url, 3600);
    afterImageUrl = data?.signedUrl || null;
  }

  // 3. Fetch anonymized status history
  const { data: history } = await adminClient
    .from("grievance_status_history")
    .select("to_status, created_at, notes")
    .eq("grievance_id", record.id)
    .order("created_at", { ascending: true });

  const isClosed = record.status === "CLOSED" || record.status === "VERIFIED";

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-500">
            <Link href="/public" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Public Ledger
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-900 font-semibold break-all">{record.public_id}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
                  {record.title}
                </h1>
                {record.status && <StatusBadge status={record.status} />}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Public Case ID: <strong className="font-mono text-slate-800">{record.public_id}</strong></span>
                <span>•</span>
                <span>Logged on {record.created_at ? new Date(record.created_at).toLocaleDateString() : ""}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Zero-PII Public Record</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Side by side Before/After Showcase */}
        {isClosed && afterImageUrl ? (
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Verified Physical Restoration Proof
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs w-fit">
                  Resolution Formally Audited
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Reported Condition (Before)
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video sm:aspect-auto sm:h-64 flex items-center justify-center">
                    {beforeImageUrl ? (
                      <img
                        src={beforeImageUrl}
                        alt="Initial problem condition"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-xs text-slate-400">Baseline photo on file</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    2. Restored Condition (After)
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video sm:aspect-auto sm:h-64 flex items-center justify-center">
                    <img
                      src={afterImageUrl}
                      alt="Verified repaired condition"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* GPS verification callout */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Geographic Haversine Verification Passed
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Physical on-site repair was submitted within {record.gps_distance_meters ?? 24} meters of the reported coordinates (strict ≤100m threshold).
                  </p>
                  <p className="text-[10px] text-emerald-700 italic pt-1">
                    * GPS coordinates serve as verification evidence and do not constitute absolute proof against device spoofing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Initial Photographic Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {beforeImageUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-96 flex items-center justify-center">
                  <img
                    src={beforeImageUrl}
                    alt="Reported problem"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">Image processing.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details & Location */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Public Case Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
              {record.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  General Neighborhood
                </p>
                <p>{record.coarse_address}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Responsible Department
                </p>
                <p>{record.organization_name || "Assigned Municipal Authority"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public Timeline */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Audit Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history?.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 font-mono">
                      {h.to_status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{h.notes || "Status updated."}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
