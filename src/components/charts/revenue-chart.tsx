"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CHANNEL_CONFIG } from "@/lib/constants";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatDateLabel(point.date),
  }));

  const chartConfig = Object.fromEntries(
    platforms.map((p) => [p, {
      label: CHANNEL_CONFIG[p as Platform]?.label ?? p,
      color: CHANNEL_CONFIG[p as Platform]?.color ?? "#6B7280",
    }])
  );

  if (!mounted) return <Card><CardContent className="h-[340px]" /></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              {platforms.map((p) => {
                const color = CHANNEL_CONFIG[p as Platform]?.color ?? "#6B7280";
                return (
                  <linearGradient key={p} id={`fill-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} className="text-xs" interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {platforms.map((p) => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                stackId="1"
                stroke={CHANNEL_CONFIG[p as Platform]?.color ?? "#6B7280"}
                fill={`url(#fill-${p})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
