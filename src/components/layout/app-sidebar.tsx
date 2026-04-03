"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, CHANNEL_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { Platform } from "@/types";

interface SidebarChannel {
  id: string;
  platform: string;
  name: string;
  status: string | null;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [channels, setChannels] = useState<SidebarChannel[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (Array.isArray(d)) {
          setChannels(d as SidebarChannel[]);
          setExcludedIds(new Set());
          return;
        }
        const o = d as { channels?: SidebarChannel[]; excluded_channel_ids?: string[] } | null;
        setChannels(o?.channels ?? []);
        setExcludedIds(new Set(o?.excluded_channel_ids ?? []));
      })
      .catch(() => {});
  }, []);

  const persistExcluded = useCallback(
    async (next: Set<string>) => {
      const res = await fetch("/api/settings/reporting-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excluded_channel_ids: [...next] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("reporting-channels save failed:", err);
        return false;
      }
      return true;
    },
    []
  );

  const toggleReporting = useCallback(
    async (channelId: string, includeInReports: boolean) => {
      setSavingId(channelId);
      const prev = new Set(excludedIds);
      const next = new Set(excludedIds);
      if (includeInReports) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      setExcludedIds(next);
      const ok = await persistExcluded(next);
      if (!ok) {
        setExcludedIds(prev);
      } else {
        router.refresh();
      }
      setSavingId(null);
    },
    [excludedIds, persistExcluded, router]
  );

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Zap className="size-4 text-amber-500" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">ChannelPulse</span>
                <span className="truncate text-xs text-muted-foreground">
                  Sales Analytics
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="outline"
                          className="ml-auto border-amber-500/30 px-1.5 py-0 text-[9px] text-amber-500"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {channels.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Channels</SidebarGroupLabel>
            <p className="px-2 pb-1 text-[11px] leading-snug text-muted-foreground">
              Toggle off to hide a store from charts, KPIs, orders, products, and P&amp;L.
            </p>
            <SidebarGroupContent>
              <SidebarMenu>
                {channels.map((ch) => {
                  const config = CHANNEL_CONFIG[ch.platform as Platform];
                  const inReports = !excludedIds.has(ch.id);
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <div className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: config?.color ?? "#6B7280" }}
                        />
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="min-w-0 flex-1 cursor-default truncate text-left">
                                {ch.name}
                              </span>
                            }
                          />
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs font-medium">{ch.name}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Switch
                          size="sm"
                          checked={inReports}
                          disabled={savingId === ch.id}
                          onCheckedChange={(on) => {
                            void toggleReporting(ch.id, Boolean(on));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={inReports ? `Exclude ${ch.name} from reports` : `Include ${ch.name} in reports`}
                        />
                        <Badge
                          variant="outline"
                          className={`hidden shrink-0 text-[10px] px-1.5 py-0 sm:inline-flex ${
                            ch.status === "active"
                              ? "border-emerald-200 text-emerald-700"
                              : ""
                          }`}
                        >
                          {ch.status === "active" ? "Active" : ch.status}
                        </Badge>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Activity className="size-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                All systems operational
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
