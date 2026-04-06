"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Bell, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface AlertRow {
  id: string;
  type?: string;
  severity?: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  link_label?: string;
}

function isErrorLevel(type?: string, severity?: string) {
  return (
    type === "import_failed" ||
    type === "sync_error" ||
    severity === "high" ||
    severity === "critical" ||
    severity === "error"
  );
}

function isWarningLevel(type?: string, severity?: string) {
  return (
    type === "import_stalled" ||
    type === "revenue_drop" ||
    severity === "medium" ||
    severity === "low" ||
    severity === "warning"
  );
}

function parseAlertMetadata(raw: unknown): { action_url?: string; link_label?: string } {
  if (raw == null) return {};
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return {};
  const m = obj as Record<string, unknown>;
  const url = m.action_url;
  const label = m.link_label;
  const action_url =
    typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : undefined;
  const link_label = typeof label === "string" && label.trim() ? label.trim() : undefined;
  return { action_url, link_label };
}

const fetchAlertsInit: RequestInit = { credentials: "include" };

type AlertsPushDetail = {
  id: string;
  type?: string;
  severity?: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  metadata?: unknown;
};

function mapApiAlert(a: {
  id: string;
  type?: string;
  severity?: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  metadata?: unknown;
}): AlertRow {
  const meta = parseAlertMetadata(a.metadata);
  return {
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    created_at: a.created_at,
    is_read: a.is_read,
    action_url: meta.action_url,
    link_label: meta.link_label,
  };
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"unread" | "all">("all");

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/alerts?limit=50", fetchAlertsInit);
      const data = await res.json();
      const list = (data.alerts ?? []) as Array<{
        id: string;
        type?: string;
        severity?: string;
        title: string;
        message: string;
        created_at: string;
        is_read: boolean;
        metadata?: unknown;
      }>;
      setNotifications(list.map((a) => mapApiAlert(a)));
    } catch {
      if (!silent) setNotifications([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onPush = (e: Event) => {
      const ce = e as CustomEvent<AlertsPushDetail>;
      const d = ce.detail;
      if (!d?.id) return;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === d.id)) return prev;
        const row = mapApiAlert(d);
        return [row, ...prev].slice(0, 50);
      });
    };
    window.addEventListener("channelpulse:alerts-push", onPush as EventListener);
    return () => window.removeEventListener("channelpulse:alerts-push", onPush as EventListener);
  }, []);

  useEffect(() => {
    const onRefresh = () => void load({ silent: true });
    window.addEventListener("channelpulse:alerts-refresh", onRefresh);
    return () => window.removeEventListener("channelpulse:alerts-refresh", onRefresh);
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadErrorCount = notifications.filter(
    (n) => !n.is_read && isErrorLevel(n.type, n.severity)
  ).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  async function markAllRead() {
    try {
      await fetch("/api/alerts/mark-all-read", { method: "POST", credentials: "include" });
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
        credentials: "include",
        body: JSON.stringify({ is_read: true }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* ignore */
    }
  }

  async function dismiss(id: string) {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_dismissed: true }),
      });
      if (!res.ok) {
        setNotifications(previous);
        const errBody = await res.json().catch(() => ({}));
        toast.error("Couldn’t dismiss notification", {
          description:
            typeof errBody.error === "string" ? errBody.error : `Something went wrong (${res.status}).`,
        });
        return;
      }
    } catch {
      setNotifications(previous);
      toast.error("Couldn’t dismiss notification", {
        description: "Check your connection and try again.",
      });
    }
  }

  return (
    <Popover onOpenChange={(next) => { if (next) void load({ silent: true }); }}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-8 w-8" />
        }
      >
        <Bell
          className={`h-4 w-4 ${unreadErrorCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}
        />
        {unreadCount > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white ${
              unreadErrorCount > 0 ? "bg-red-600" : "bg-blue-600"
            }`}
          >
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
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                  title={notification.is_read ? undefined : "Mark as read"}
                  onClick={() => void markRead(notification.id)}
                >
                  {isErrorLevel(notification.type, notification.severity) ? (
                    <AlertCircle
                      className={`h-4 w-4 ${notification.is_read ? "opacity-40" : "text-red-600 dark:text-red-400"}`}
                    />
                  ) : isWarningLevel(notification.type, notification.severity) ? (
                    <AlertTriangle
                      className={`h-4 w-4 ${notification.is_read ? "opacity-40" : "text-amber-600 dark:text-amber-400"}`}
                    />
                  ) : !notification.is_read ? (
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <span className="block h-4 w-4" />
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
                  {notification.action_url ? (
                    <Link
                      href={notification.action_url}
                      onClick={() => void markRead(notification.id)}
                      className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {notification.link_label ?? "View details"}
                    </Link>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="relative z-10 shrink-0 cursor-pointer rounded px-1 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void dismiss(notification.id);
                  }}
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
