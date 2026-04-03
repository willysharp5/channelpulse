"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TremorAreaChart } from "@/components/tremor/area-chart";
import { formatCompactCurrency } from "@/lib/formatters";
import type { AvailableChartColorsKeys } from "@/lib/chartUtils";

const PLATFORM_CHART_COLORS: Record<string, AvailableChartColorsKeys> = {
  shopify: "lime",
  amazon: "amber",
  etsy: "violet",
  tiktok: "pink",
};

interface RevenueTrendChartProps {
  data: Array<{ dateLabel: string; [key: string]: string | number }>;
  platforms: string[];
}

export function RevenueTrendChart({ data, platforms }: RevenueTrendChartProps) {
  const colors = platforms.map(
    (p) => PLATFORM_CHART_COLORS[p] ?? "blue"
  ) as AvailableChartColorsKeys[];

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
          type="stacked"
          valueFormatter={(v) => formatCompactCurrency(v)}
          className="h-[350px]"
          showLegend={true}
        />
      </CardContent>
    </Card>
  );
}
