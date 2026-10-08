import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationsView } from "./notifications-view";
import { Bell, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const adminClient = createAdminClient();

  const { data: notifications } = await adminClient
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-6">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Notifications</span>
          </div>

          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 break-words">
                Notification Feed & Alerts
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking notifications for all your reported issues and assignments.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-6">
        <NotificationsView initialNotifications={notifications || []} />
      </div>
    </div>
  );
}
