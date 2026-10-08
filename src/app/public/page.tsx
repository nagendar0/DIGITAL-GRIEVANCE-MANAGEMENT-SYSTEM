import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Building2, 
  MapPin, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Calendar,
  Layers
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PublicPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function PublicTransparencyLedgerPage({ searchParams }: PublicPageProps) {
  const { q, status } = await searchParams;
  const adminClient = createAdminClient();

  let query = adminClient
    .from("public_grievances_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "ALL") {
    query = query.eq("status", status);
  }

  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`public_id.ilike.%${term}%,title.ilike.%${term}%,coarse_address.ilike.%${term}%`);
  }

  const { data: records } = await query.limit(30);

  // Sign before images for display if needed
  const grievancesWithImages = await Promise.all(
    (records || []).map(async (item) => {
      let beforeSignedUrl: string | null = null;
      let afterSignedUrl: string | null = null;

      if (item.before_image_path) {
        const { data } = await adminClient.storage
          .from("grievance-images")
          .createSignedUrl(item.before_image_path, 3600);
        beforeSignedUrl = data?.signedUrl || null;
      }

      if (item.after_image_url) {
        const { data } = await adminClient.storage
          .from("completion-evidence")
          .createSignedUrl(item.after_image_url, 3600);
        afterSignedUrl = data?.signedUrl || null;
      }

      return {
        ...item,
        beforeSignedUrl,
        afterSignedUrl,
      };
    })
  );

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Hero Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Public Civic Accountability Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Civic Transparency Portal
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed">
              Every reported issue, department assignment, and completed physical restoration is permanently 
              logged on the public record with photographic and mathematical GPS verification.
            </p>
          </div>

          {/* Search bar */}
          <form className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-2 max-w-2xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={q || ""}
                placeholder="Search by Case ID (e.g. RV-1001), keyword, or neighborhood..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white text-xs rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-5 w-full sm:w-auto">
              Search Ledger
            </Button>
          </form>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-4 text-xs overflow-x-auto touch-scroll scrollbar-none pb-1.5">
            <Link href="/public" className="shrink-0">
              <Button
                variant={!status || status === "ALL" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-7 ${!status || status === "ALL" ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-800 border-slate-700 text-slate-300"}`}
              >
                All Grievances
              </Button>
            </Link>
            <Link href="/public?status=CLOSED" className="shrink-0">
              <Button
                variant={status === "CLOSED" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-7 ${status === "CLOSED" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-800 border-slate-700 text-slate-300"}`}
              >
                Verified & Closed
              </Button>
            </Link>
            <Link href="/public?status=IN_PROGRESS" className="shrink-0">
              <Button
                variant={status === "IN_PROGRESS" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-7 ${status === "IN_PROGRESS" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-800 border-slate-700 text-slate-300"}`}
              >
                In Progress
              </Button>
            </Link>
            <Link href="/public?status=PENDING" className="shrink-0">
              <Button
                variant={status === "PENDING" ? "default" : "outline"}
                size="sm"
                className={`text-xs h-7 ${status === "PENDING" ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-slate-800 border-slate-700 text-slate-300"}`}
              >
                Awaiting Assignment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Public Grievance Records */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {grievancesWithImages.length === 0 ? (
          <div className="p-8 sm:p-16 text-center bg-white rounded-xl border border-slate-200">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No Public Records Found</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {grievancesWithImages.map((item) => {
              const isClosed = item.status === "CLOSED" || item.status === "VERIFIED";

              return (
                <Card key={item.id} className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden">
                  <div>
                    {/* Visual Photo Card Header */}
                    {isClosed && item.afterSignedUrl ? (
                      <div className="grid grid-cols-2 h-40 bg-slate-100 border-b border-slate-100">
                        <div className="relative h-full overflow-hidden border-r border-white/40">
                          {item.beforeSignedUrl ? (
                            <img
                              src={item.beforeSignedUrl}
                              alt="Before"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-[10px] text-slate-400">Before</div>
                          )}
                          <span className="absolute bottom-1 left-1 bg-slate-900/80 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Before
                          </span>
                        </div>

                        <div className="relative h-full overflow-hidden">
                          <img
                            src={item.afterSignedUrl}
                            alt="After"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-emerald-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Restored
                          </span>
                        </div>
                      </div>
                    ) : item.beforeSignedUrl ? (
                      <div className="relative h-40 bg-slate-100 border-b border-slate-100 overflow-hidden">
                        <img
                          src={item.beforeSignedUrl}
                          alt="Reported problem"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                          Reported Evidence
                        </span>
                      </div>
                    ) : null}

                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {item.public_id}
                        </span>
                        {item.status && <StatusBadge status={item.status} />}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                        <p className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{item.coarse_address}</span>
                        </p>
                        {item.organization_name && (
                          <p className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.organization_name}</span>
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </div>

                  <div className="px-5 pb-5">
                    <Link href={`/public/${item.public_id}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 flex items-center justify-center gap-1">
                        Inspect Public Record
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
