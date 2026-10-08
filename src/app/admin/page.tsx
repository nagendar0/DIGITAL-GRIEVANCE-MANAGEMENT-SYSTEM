import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  ShieldAlert, 
  FileCheck2, 
  AlertCircle, 
  Users, 
  Activity, 
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformAdminDashboard() {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "PLATFORM_ADMIN") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Platform Admin Access Restricted</h1>
        <p className="text-slate-600 mb-6">
          Your current account is authenticated as <strong className="font-semibold">{user.role}</strong> ({user.email}). 
          Administrative privilege is required to access governance controls.
        </p>
        <Link href="/">
          <Button variant="outline">Return to Platform Home</Button>
        </Link>
      </div>
    );
  }

  const adminClient = createAdminClient();

  // Parallel live metric fetching
  const [
    { count: totalOrgs },
    { count: pendingOrgs },
    { count: totalGrievances },
    { count: resolvedGrievances },
    { count: totalWorkers },
    { data: pendingOrgsList }
  ] = await Promise.all([
    adminClient.from("organizations").select("*", { count: "exact", head: true }),
    adminClient.from("organizations").select("*", { count: "exact", head: true }).eq("status", "PENDING_VERIFICATION"),
    adminClient.from("grievances").select("*", { count: "exact", head: true }),
    adminClient.from("grievances").select("*", { count: "exact", head: true }).in("status", ["VERIFIED", "CLOSED"]),
    adminClient.from("workers").select("*", { count: "exact", head: true }).eq("is_active", true),
    adminClient.from("organizations")
      .select("id, name, type, jurisdiction_city, jurisdiction_state, official_email, created_at")
      .eq("status", "PENDING_VERIFICATION")
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Platform Governance Mode
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Admin Command Center
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Oversee organization accreditations, system-wide grievances, and compliance audit logs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <Link href="/admin/organizations" className="flex-1 sm:flex-none">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto text-xs h-9">
                  <Building2 className="w-4 h-4" />
                  Review Organizations ({pendingOrgs || 0})
                </Button>
              </Link>
              <Link href="/admin/audit-logs" className="flex-1 sm:flex-none">
                <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white w-full sm:w-auto text-xs h-9">
                  Audit Logs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 -mt-4 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Accreditation</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">{pendingOrgs ?? 0}</p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 sm:mt-3 flex items-center gap-1">
                Organizations awaiting document review
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Registered Orgs</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{totalOrgs ?? 0}</p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 sm:mt-3 flex items-center gap-1">
                Municipalities & public utilities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Grievances</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{totalGrievances ?? 0}</p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 sm:mt-3 flex items-center gap-1">
                Citizen reports across all departments
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/80 shadow-xs">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Verified Resolutions</p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{resolvedGrievances ?? 0}</p>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 sm:mt-3 flex items-center gap-1">
                {totalGrievances ? Math.round(((resolvedGrievances || 0) / (totalGrievances || 1)) * 100) : 0}% platform resolution rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Awaiting Approval */}
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                Organizations Awaiting Verification
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500">
                Organizations must have legal documents and authority validated before gaining operational dispatch access.
              </CardDescription>
            </div>
            <Link href="/admin/organizations" className="shrink-0 self-start sm:self-auto">
              <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                View All ({pendingOrgs || 0})
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {(!pendingOrgsList || pendingOrgsList.length === 0) ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">All Organization Applications Processed</p>
                <p className="text-xs text-slate-500 mt-1">There are no pending registrations waiting in the queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Organization</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Jurisdiction</th>
                      <th className="px-6 py-3">Official Email</th>
                      <th className="px-6 py-3">Registered On</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingOrgsList.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {org.name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs capitalize">
                            {org.type.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {org.jurisdiction_city}, {org.jurisdiction_state}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-600">
                          {org.official_email}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/admin/organizations`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              Review
                            </Button>
                          </Link>
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
