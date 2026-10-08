import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldAlert, 
  ArrowLeft, 
  ScrollText, 
  User, 
  Calendar, 
  Clock, 
  Database,
  Filter
} from "lucide-react";

export const dynamic = "force-dynamic";

interface AuditLogsPageProps {
  searchParams: Promise<{ action?: string; role?: string }>;
}

export default async function AdminAuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/admin/audit-logs");
  }

  if (user.role !== "PLATFORM_ADMIN") {
    redirect("/admin");
  }

  const { action: actionFilter, role: roleFilter } = await searchParams;
  const adminClient = createAdminClient();

  let query = adminClient
    .from("audit_logs")
    .select(`
      id,
      actor_id,
      actor_role,
      action,
      resource_type,
      resource_id,
      details,
      created_at,
      profiles (
        full_name,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (actionFilter && actionFilter !== "ALL") {
    query = query.eq("action", actionFilter);
  }

  if (roleFilter && roleFilter !== "ALL") {
    query = query.eq("actor_role", roleFilter);
  }

  const { data: logs } = await query.limit(50);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            <Link href="/admin" className="hover:text-white flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin Command Center
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Audit Logs</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <ScrollText className="w-6 h-6 text-blue-400 shrink-0" />
                Immutable System Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Forensic record of all state mutations, actor permissions, GPS submissions, and review decisions.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-5 sm:mt-6 overflow-x-auto touch-scroll scrollbar-none pb-1.5 text-xs">
            <Link href="/admin/audit-logs" className="shrink-0">
              <Button
                variant={!roleFilter && !actionFilter ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-200"
              >
                All Events
              </Button>
            </Link>
            <Link href="/admin/audit-logs?action=RESOLUTION_APPROVED" className="shrink-0">
              <Button
                variant={actionFilter === "RESOLUTION_APPROVED" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-200"
              >
                Approvals
              </Button>
            </Link>
            <Link href="/admin/audit-logs?action=EVIDENCE_SUBMITTED" className="shrink-0">
              <Button
                variant={actionFilter === "EVIDENCE_SUBMITTED" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-200"
              >
                Evidence Submissions
              </Button>
            </Link>
            <Link href="/admin/audit-logs?action=ORGANIZATION_VERIFIED" className="shrink-0">
              <Button
                variant={actionFilter === "ORGANIZATION_VERIFIED" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-200"
              >
                Org Accreditations
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-0">
            {(!logs || logs.length === 0) ? (
              <div className="p-8 sm:p-12 text-center">
                <Database className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">No matching audit events</p>
                <p className="text-xs text-slate-500 mt-1">Adjust your filters to inspect recorded events.</p>
              </div>
            ) : (
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Actor & Role</th>
                      <th className="px-6 py-3.5">Action Event</th>
                      <th className="px-6 py-3.5">Resource Target</th>
                      <th className="px-6 py-3.5">Event Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {logs.map((log) => {
                      const profile = log.profiles as { full_name?: string } | null;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900 font-sans">
                              {profile?.full_name || "System Automated"}
                            </p>
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                              {log.actor_role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            <span className="text-slate-500 uppercase text-[10px] block font-sans">
                              {log.resource_type}
                            </span>
                            <span className="text-[11px] truncate max-w-[120px] block">
                              {log.resource_id ? log.resource_id.slice(0, 8) + "..." : "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <pre className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200/60 overflow-x-auto text-slate-800 max-h-24">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      );
                    })}
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
