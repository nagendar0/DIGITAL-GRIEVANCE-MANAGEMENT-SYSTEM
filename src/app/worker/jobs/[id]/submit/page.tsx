import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitEvidenceForm } from "./submit-evidence-form";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

interface SubmitPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkerSubmitEvidencePage({ params }: SubmitPageProps) {
  const { id } = await params;
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect(`/login?next=/worker/jobs/${id}/submit`);
  }

  if (user.role !== "WORKER" && user.role !== "PLATFORM_ADMIN") {
    redirect("/citizen");
  }

  const adminClient = createAdminClient();

  const { data: grievance, error } = await adminClient
    .from("grievances")
    .select("id, public_id, title, status, latitude, longitude, coarse_address, assigned_worker_id")
    .eq("id", id)
    .single();

  if (error || !grievance) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Link href={`/worker/jobs/${id}`} className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Job Details
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-900 font-semibold">{grievance.public_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Submit Resolution Evidence
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {grievance.title} • {grievance.coarse_address}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <SubmitEvidenceForm
          grievanceId={grievance.id}
          publicId={grievance.public_id}
          targetLat={grievance.latitude}
          targetLon={grievance.longitude}
        />
      </div>
    </div>
  );
}
