"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { ChannelRevenueBar } from "@/components/charts/channel-revenue-bar";
import type { KPIData } from "@/types";

interface RevenueDashboardProps {
  kpis: KPIData[];
  chartData: Array<{ dateLabel: string; [key: string]: string | number }>;
  platforms: string[];
  barChartData: Record<string, unknown>[];
  barColors: string[];
}

const TABS = [
  { id: "trend", label: "Trend" },
  { id: "channels", label: "By Channel" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function RevenueDashboard({
  kpis,
  chartData,
  platforms,
  barChartData,
  barColors,
}: RevenueDashboardProps) {
  const [tab, setTab] = useState<Tab>("trend");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} data={kpi} />
        ))}
      </div>

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

      {tab === "trend" && (
        <RevenueTrendChart data={chartData} platforms={platforms} />
      )}

      {tab === "channels" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelRevenueBar data={barChartData} colors={barColors} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
