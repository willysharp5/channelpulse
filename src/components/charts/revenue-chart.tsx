"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type Granularity = "day" | "week" | "month";

interface RevenueChartProps {
  data: Array<{
    date: string;
    shopify: number;
    amazon: number;
    total: number;
    [key: string]: string | number;
  }>;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatDateLabel(point.date),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Revenue Over Time
        </CardTitle>
        <Tabs
          value={granularity}
          onValueChange={(v) => setGranularity(v as Granularity)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="day" className="text-xs px-2.5">
              Day
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-2.5">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-2.5">
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="fillShopify" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHANNEL_CONFIG.shopify.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHANNEL_CONFIG.shopify.color} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillAmazon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHANNEL_CONFIG.amazon.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CHANNEL_CONFIG.amazon.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} className="text-xs" interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="shopify" stackId="1" stroke={CHANNEL_CONFIG.shopify.color} fill="url(#fillShopify)" strokeWidth={2} />
            <Area type="monotone" dataKey="amazon" stackId="1" stroke={CHANNEL_CONFIG.amazon.color} fill="url(#fillAmazon)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
