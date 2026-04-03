"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TremorAreaChart } from "@/components/tremor/area-chart";
import { CHANNEL_CONFIG, REPORT_CHANNEL_PALETTE } from "@/lib/constants";
import { formatCompactCurrency } from "@/lib/formatters";
import type { Platform } from "@/types";
import type { RevenuePoint } from "@/lib/queries";

interface RevenueChartProps {
  data: RevenuePoint[];
  platforms: string[];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueChart({ data, platforms }: RevenueChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatDateLabel(point.date),
  }));

  const colors = platforms.map(
    (p, i) => CHANNEL_CONFIG[p as Platform]?.color ?? REPORT_CHANNEL_PALETTE[i % REPORT_CHANNEL_PALETTE.length]!,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <TremorAreaChart
          data={chartData}
          index="dateLabel"
          categories={platforms}
          colors={colors}
          stack={true}
          valueFormatter={(v) => formatCompactCurrency(v)}
          className="h-80"
        />
      </CardContent>
    </Card>
  );
}
