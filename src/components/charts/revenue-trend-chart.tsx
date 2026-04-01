"use client";

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

const chartConfig = {
  shopify: { label: "Shopify", color: CHANNEL_CONFIG.shopify.color },
  amazon: { label: "Amazon", color: CHANNEL_CONFIG.amazon.color },
};

interface RevenueTrendChartProps {
  data: Array<{
    dateLabel: string;
    shopify: number;
    amazon: number;
    total: number;
    [key: string]: string | number;
  }>;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
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
            <Area type="monotone" dataKey="shopify" stroke={CHANNEL_CONFIG.shopify.color} fill="transparent" strokeWidth={2} />
            <Area type="monotone" dataKey="amazon" stroke={CHANNEL_CONFIG.amazon.color} fill="transparent" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
