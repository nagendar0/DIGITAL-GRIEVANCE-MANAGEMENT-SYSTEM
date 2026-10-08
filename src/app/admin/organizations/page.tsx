import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrgActions } from "./org-actions";
import { 
  Building2, 
  ShieldAlert, 
  ArrowLeft, 
  MapPin, 
  Mail, 
  Globe, 
  Clock, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminOrganizationsPage({ searchParams }: PageProps) {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/admin/organizations");
  }

  if (user.role !== "PLATFORM_ADMIN") {
    redirect("/admin");
  }

  const { status: statusFilter } = await searchParams;
  const adminClient = createAdminClient();

  let query = adminClient
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "ALL") {
    query = query.eq("status", statusFilter);
  }

  const { data: organizations, error } = await query;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex items-center gap-2 mb-2 sm:mb-3 text-xs text-slate-500">
            <Link href="/admin" className="hover:text-slate-800 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin Command Center
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Organizations</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600 shrink-0" />
                Organization Accreditation & Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Review official credentials and manage operational permissions for municipal authorities and departments.
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mt-5 sm:mt-6 overflow-x-auto touch-scroll scrollbar-none pb-1.5 text-xs">
            <Link href="/admin/organizations" className="shrink-0">
              <Button
                variant={!statusFilter || statusFilter === "ALL" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
              >
                All Organizations
              </Button>
            </Link>
            <Link href="/admin/organizations?status=PENDING_VERIFICATION" className="shrink-0">
              <Button
                variant={statusFilter === "PENDING_VERIFICATION" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
              >
                Pending Verification
              </Button>
            </Link>
            <Link href="/admin/organizations?status=VERIFIED" className="shrink-0">
              <Button
                variant={statusFilter === "VERIFIED" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
              >
                Verified & Active
              </Button>
            </Link>
            <Link href="/admin/organizations?status=REJECTED" className="shrink-0">
              <Button
                variant={statusFilter === "REJECTED" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
              >
                Rejected
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-0">
            {(!organizations || organizations.length === 0) ? (
              <div className="p-8 sm:p-12 text-center">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">No organizations matching this status</p>
                <p className="text-xs text-slate-500 mt-1">Adjust your filter to view registered authorities.</p>
              </div>
            ) : (
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Organization Details</th>
                      <th className="px-6 py-3.5">Type & Jurisdiction</th>
                      <th className="px-6 py-3.5">Contact Details</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Accreditation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{org.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{org.slug}</p>
                          {org.description && (
                            <p className="text-xs text-slate-600 line-clamp-1 mt-1 max-w-sm">
                              {org.description}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs capitalize mb-1">
                            {org.type.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{org.jurisdiction_city}, {org.jurisdiction_state}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{org.official_email}</span>
                          </div>
                          {org.website && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <a 
                                href={org.website.startsWith("http") ? org.website : `https://${org.website}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-blue-600 hover:underline truncate max-w-[180px]"
                              >
                                {org.website}
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {org.status === "VERIFIED" && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {org.status === "PENDING_VERIFICATION" && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Review
                            </Badge>
                          )}
                          {org.status === "REJECTED" && (
                            <div>
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                              {org.rejection_reason && (
                                <p className="text-[11px] text-red-600 mt-1 max-w-[200px] italic">
                                  &ldquo;{org.rejection_reason}&rdquo;
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <OrgActions
                            orgId={org.id}
                            orgName={org.name}
                            currentStatus={org.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
