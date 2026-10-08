"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/server/actions/notifications";
import { Bell, CheckCheck, CheckCircle2, Clock, ArrowRight, Loader2 } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  grievance_id?: string | null;
}

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
}

export function NotificationsView({ initialNotifications }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsRead();
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          You have <strong className="text-slate-800">{unreadCount}</strong> unread updates.
        </p>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-xs h-8 flex items-center gap-1.5 text-slate-600 w-fit"
          >
            {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center shadow-xs">
          <Bell className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No Notifications</p>
          <p className="text-xs text-slate-500 mt-1">
            Status changes, dispatch updates, and resolution alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                item.is_read
                  ? "bg-white border-slate-200/80 text-slate-700"
                  : "bg-blue-50/50 border-blue-200 text-slate-900 shadow-xs"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold break-words">{item.title}</span>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed break-words">
                    {item.message}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
                  {!item.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(item.id)}
                      className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800"
                    >
                      Dismiss
                    </Button>
                  )}
                  {item.grievance_id && (
                    <Link href={`/citizen/grievances/${item.grievance_id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5 flex items-center gap-1"
                      >
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
