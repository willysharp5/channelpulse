"use client";

import { useState } from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelBreakdown } from "@/components/charts/channel-breakdown";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import type { KPIData, ChannelRevenue } from "@/types";
import type { RevenuePoint } from "@/lib/queries";

interface OverviewDashboardProps {
  kpis: KPIData[];
  revenueSeries: RevenuePoint[];
  platforms: string[];
  channelRevenue: ChannelRevenue[];
  products: Array<{ id: string; title: string; sku: string | null; cogs: number | null; status: string | null }>;
  recentOrders: Array<{
    id: string;
    platform: string;
    order_number: string | null;
    status: string | null;
    customer_name: string | null;
    total_amount: number | null;
    ordered_at: string;
  }>;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "channels", label: "Channels" },
  { id: "activity", label: "Activity" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function OverviewDashboard({
  kpis,
  revenueSeries,
  platforms,
  channelRevenue,
  products,
  recentOrders,
}: OverviewDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* KPIs — always visible */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} data={kpi} />
        ))}
      </div>

      {tab === "overview" && (
        <>
          <RevenueChart data={revenueSeries} platforms={platforms} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChannelBreakdown data={channelRevenue} />
            <TopProducts products={products} />
          </div>
        </>
      )}

      {tab === "channels" && (
        <ChannelBreakdown data={channelRevenue} />
      )}

      {tab === "activity" && (
        <RecentOrders orders={recentOrders} />
      )}
    </div>
  );
}
