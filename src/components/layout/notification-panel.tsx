"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/formatters";

interface AlertRow {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"unread" | "all">("unread");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts?limit=50");
      const data = await res.json();
      const list = (data.alerts ?? []) as Array<{
        id: string;
        title: string;
        message: string;
        created_at: string;
        is_read: boolean;
      }>;
      setNotifications(
        list.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          created_at: a.created_at,
          is_read: a.is_read,
        }))
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  async function markAllRead() {
    try {
      await fetch("/api/alerts/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* ignore */
    }
  }

  async function dismiss(id: string) {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_dismissed: true }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  }

  return (
    <Popover onOpenChange={(next) => { if (next) void load(); }}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-8 w-8" />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] rounded-xl border bg-background p-0 shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex border-b">
          {(["unread", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                filter === tab
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "unread" ? "Unread" : "All"}
            </button>
          ))}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
            </div>
          ) : (
            filtered.map((notification) => (
              <div
                key={notification.id}
                className="flex gap-2 border-b border-border/50 px-4 py-3.5 last:border-0"
              >
                <button
                  type="button"
                  className="mt-1.5 shrink-0"
                  onClick={() => void markRead(notification.id)}
                >
                  {!notification.is_read ? (
                    <span className="block h-2 w-2 rounded-full bg-blue-600" />
                  ) : (
                    <span className="block h-2 w-2" />
                  )}
                </button>
                <div className="min-w-0 flex-1 text-left">
                  <p
                    className={`text-sm leading-snug ${
                      notification.is_read ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    <span className="font-medium">{notification.title}</span>
                    <span className="block text-muted-foreground font-normal mt-0.5">
                      {notification.message}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(notification.created_at, "d MMM yyyy")}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => void dismiss(notification.id)}
                >
                  Dismiss
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t px-4 py-2.5">
          <Link
            href="/settings?tab=notifications"
            className="block w-full rounded-md py-1.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Notification settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
