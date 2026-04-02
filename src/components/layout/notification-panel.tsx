"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  title: string;
  date: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Your Shopify store synced 47 new orders successfully.",
    date: "2 Apr 2026",
    read: false,
  },
  {
    id: "2",
    title: "Revenue dropped 22% on Amazon compared to yesterday. Check your listings for issues.",
    date: "1 Apr 2026",
    read: false,
  },
  {
    id: "3",
    title: "Your Growth plan is now active. You can connect up to 5 channels.",
    date: "31 Mar 2026",
    read: false,
  },
  {
    id: "4",
    title: "Weekly digest: $12,430 revenue across 3 channels. Orders up 8% week-over-week.",
    date: "28 Mar 2026",
    read: true,
  },
  {
    id: "5",
    title: "3 products are running low on stock. Review inventory on the Products page.",
    date: "25 Mar 2026",
    read: true,
  },
];

export function NotificationPanel() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<"unread" | "all">("unread");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-8 w-8" />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] rounded-xl border bg-background p-0 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Mark {unreadCount} as read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(["unread", "all"] as const).map((tab) => (
            <button
              key={tab}
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

        {/* Notification list */}
        <div className="max-h-[360px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No unread notifications</p>
            </div>
          ) : (
            filtered.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markRead(notification.id)}
                className="flex w-full gap-3 border-b border-border/50 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-muted/50"
              >
                <div className="mt-1.5 shrink-0">
                  {!notification.read ? (
                    <span className="block h-2 w-2 rounded-full bg-blue-600" />
                  ) : (
                    <span className="block h-2 w-2" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${notification.read ? "text-muted-foreground" : "text-foreground"}`}>
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{notification.date}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <button className="w-full rounded-md py-1.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            View all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
