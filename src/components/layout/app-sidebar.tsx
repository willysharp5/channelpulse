"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [channels, setChannels] = useState<SidebarChannel[]>([]);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.ok ? r.json() : [])
      .then(setChannels)
      .catch(() => {});
  }, []);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Zap className="size-4" />
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
            <SidebarGroupContent>
              <SidebarMenu>
                {channels.map((ch) => {
                  const config = CHANNEL_CONFIG[ch.platform as Platform];
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <SidebarMenuButton>
                        <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: config?.color ?? "#6B7280" }} />
                        <span className="truncate">{ch.name}</span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-[10px] px-1.5 py-0 ${
                            ch.status === "active"
                              ? "border-emerald-200 text-emerald-700"
                              : ""
                          }`}
                        >
                          {ch.status === "active" ? "Active" : ch.status}
                        </Badge>
                      </SidebarMenuButton>
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
