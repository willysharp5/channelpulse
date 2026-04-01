"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

interface RevenueTrendChartProps {
  data: Array<{ dateLabel: string; [key: string]: string | number }>;
  platforms: string[];
}

export function RevenueTrendChart({ data, platforms }: RevenueTrendChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const chartConfig = Object.fromEntries(
    platforms.map((p) => [p, {
      label: CHANNEL_CONFIG[p as Platform]?.label ?? p,
      color: CHANNEL_CONFIG[p as Platform]?.color ?? "#6B7280",
    }])
  );

  if (!mounted) return <Card><CardContent className="h-[390px]" /></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {platforms.map((p) => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                stroke={CHANNEL_CONFIG[p as Platform]?.color ?? "#6B7280"}
                fill="transparent"
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
