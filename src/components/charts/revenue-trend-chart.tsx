"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TremorAreaChart } from "@/components/tremor/area-chart";
import { CHANNEL_CONFIG, REPORT_CHANNEL_PALETTE } from "@/lib/constants";
import { formatCompactCurrency } from "@/lib/formatters";
import type { Platform } from "@/types";

interface RevenueTrendChartProps {
  data: Array<{ dateLabel: string; [key: string]: string | number }>;
  platforms: string[];
}

export function RevenueTrendChart({ data, platforms }: RevenueTrendChartProps) {
  const colors = platforms.map(
    (p, i) => CHANNEL_CONFIG[p as Platform]?.color ?? REPORT_CHANNEL_PALETTE[i % REPORT_CHANNEL_PALETTE.length]!,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <TremorAreaChart
          data={data}
          index="dateLabel"
          categories={platforms}
          colors={colors}
          stack={true}
          valueFormatter={(v) => formatCompactCurrency(v)}
          className="h-[350px]"
        />
      </CardContent>
    </Card>
  );
}
