"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TremorAreaChart } from "@/components/tremor/area-chart";
import { formatCompactCurrency } from "@/lib/formatters";
import type { AvailableChartColorsKeys } from "@/lib/chartUtils";
import type { Platform } from "@/types";
import type { RevenuePoint } from "@/lib/queries";

interface RevenueChartProps {
  data: RevenuePoint[];
  platforms: string[];
  comparisonData?: { date: string; total: number; compTotal: number }[];
  comparisonLabel?: string;
  currentRangeLabel?: string;
  compRangeLabel?: string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PLATFORM_CHART_COLORS: Record<string, AvailableChartColorsKeys> = {
  shopify: "lime",
  amazon: "amber",
  etsy: "violet",
  tiktok: "pink",
};

export function RevenueChart({
  data,
  platforms,
  comparisonData,
  comparisonLabel,
  currentRangeLabel,
  compRangeLabel,
}: RevenueChartProps) {
  const hasComparison = comparisonData && comparisonData.length > 0;

  if (hasComparison) {
    const currentLabel = currentRangeLabel ?? "Current Period";
    const prevLabel = compRangeLabel ?? comparisonLabel ?? "Previous Period";

    const chartData = comparisonData.map((point) => ({
      dateLabel: formatDateLabel(point.date),
      [currentLabel]: point.total,
      [prevLabel]: point.compTotal,
    }));

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <span className="size-2 rounded-full bg-amber-500" />
              {currentLabel}
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <span className="size-2 rounded-full bg-cyan-500" />
              {prevLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <TremorAreaChart
            data={chartData}
            index="dateLabel"
            categories={[currentLabel, prevLabel]}
            colors={["amber", "cyan"]}
            valueFormatter={(v) => formatCompactCurrency(v)}
            className="h-80"
            showLegend={false}
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatDateLabel(point.date),
  }));

  const colors = platforms.map(
    (p) => PLATFORM_CHART_COLORS[p] ?? "blue"
  ) as AvailableChartColorsKeys[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
        {currentRangeLabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{currentRangeLabel}</p>
        )}
      </CardHeader>
      <CardContent>
        <TremorAreaChart
          data={chartData}
          index="dateLabel"
          categories={platforms}
          colors={colors}
          type="stacked"
          valueFormatter={(v) => formatCompactCurrency(v)}
          className="h-80"
          showLegend={true}
        />
      </CardContent>
    </Card>
  );
}
