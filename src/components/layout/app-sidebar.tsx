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
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, CHANNEL_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

interface SidebarChannel {
  id: string;
  platform: string;
  name: string;
  status: string | null;
}

function demoNavHref(href: string) {
  if (href === "/") return "/demo";
  return `/demo${href}`;
}

export function AppSidebar({
  demo,
}: {
  /** Public read-only demo: fixed nav under /demo, no API calls. */
  demo?: { channels: SidebarChannel[] };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [channels, setChannels] = useState<SidebarChannel[]>(demo?.channels ?? []);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (demo) {
      setChannels(demo.channels);
      setExcludedIds(new Set());
      return;
    }
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
  }, [demo]);

  const persistExcluded = useCallback(
    async (next: Set<string>) => {
      if (demo) return false;
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
    [demo, excludedIds, persistExcluded, router]
  );

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={demo ? "/demo" : "/"} />}>
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
                const href = demo ? demoNavHref(item.href) : item.href;
                const isActive = demo
                  ? pathname === href || (item.href !== "/" && pathname.startsWith(href))
                  : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={href} />} isActive={isActive}>
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
            <p
              className={cn(
                "mx-1 mb-1.5 rounded-md border border-sidebar-border/60 bg-sidebar-accent/25 px-2.5 py-2 text-xs leading-relaxed text-sidebar-foreground/80",
                "group-data-[collapsible=icon]:hidden"
              )}
            >
              {demo
                ? "Sample stores for this demo. Sign up to connect your own channels."
                : "Turn a channel off to exclude it from charts, KPIs, orders, products, and P&L."}
            </p>
            <SidebarGroupContent>
              <SidebarMenu>
                {channels.map((ch) => {
                  const config = CHANNEL_CONFIG[ch.platform as Platform];
                  const inReports = !excludedIds.has(ch.id);
                  const tooltipLines = [
                    ch.name,
                    !demo
                      ? inReports
                        ? "Included in reports — expand sidebar to change."
                        : "Hidden from reports — expand sidebar to include again."
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n");
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <div
                        className={cn(
                          "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                          "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-1"
                        )}
                      >
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="flex min-w-0 flex-1 cursor-default items-center gap-2 text-left group-data-[collapsible=icon]:flex-none">
                                <span
                                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: config?.color ?? "#6B7280" }}
                                />
                                <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
                                  {ch.name}
                                </span>
                              </span>
                            }
                          />
                          <TooltipContent side="right" className="max-w-xs whitespace-pre-line">
                            <p className="text-xs">{tooltipLines}</p>
                          </TooltipContent>
                        </Tooltip>
                        {!demo ? (
                          <Switch
                            size="sm"
                            className="shrink-0 group-data-[collapsible=icon]:hidden"
                            checked={inReports}
                            disabled={savingId === ch.id}
                            onCheckedChange={(on) => {
                              void toggleReporting(ch.id, Boolean(on));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={
                              inReports ? `Exclude ${ch.name} from reports` : `Include ${ch.name} in reports`
                            }
                          />
                        ) : null}
                        <Badge
                          variant="outline"
                          className={cn(
                            "hidden shrink-0 px-1.5 py-0 text-[10px] sm:inline-flex",
                            ch.status === "active" ? "border-emerald-200 text-emerald-700" : "",
                            "group-data-[collapsible=icon]:hidden"
                          )}
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
            {/* Div instead of SidebarMenuButton (useRender) — fixes SSR/client hydration on this row. */}
            <div
              role="status"
              data-slot="sidebar-menu-button"
              data-sidebar="menu-button"
              data-size="default"
              className={cn(
                sidebarMenuButtonVariants({ variant: "default", size: "default" }),
                "group-data-[collapsible=icon]:justify-center cursor-default"
              )}
              title="All systems operational"
              aria-label="All systems operational"
            >
              <Activity className="size-4 text-green-500" />
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                All systems operational
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
