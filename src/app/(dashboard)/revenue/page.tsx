"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { mockRevenueSeries, mockKPIs, mockChannelRevenue } from "@/lib/mock-data";
import { CHANNEL_CONFIG } from "@/lib/constants";
import { formatCurrency, formatShortDate } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const chartConfig = {
  shopify: { label: "Shopify", color: CHANNEL_CONFIG.shopify.color },
  amazon: { label: "Amazon", color: CHANNEL_CONFIG.amazon.color },
  total: { label: "Total", color: "#F59E0B" },
};

export default function RevenuePage() {
  const data = mockRevenueSeries.map((point) => ({
    ...point,
    dateLabel: formatShortDate(point.date),
  }));

  const revenueKPI = mockKPIs[0];

  return (
    <>
      <Header title="Revenue" />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard data={revenueKPI} />
          <KPICard
            data={{
              title: "MoM Growth",
              value: 12.3,
              formattedValue: "+12.3%",
              change: 3.2,
              changeLabel: "vs prev. month",
              sparklineData: [8, 9, 7, 11, 10, 12, 12],
            }}
          />
          <KPICard
            data={{
              title: "Best Day",
              value: 3200,
              formattedValue: "$3,200",
              change: 0,
              changeLabel: "Mar 15, 2026",
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Avg Daily Revenue",
              value: revenueKPI.value / 30,
              formattedValue: formatCurrency(revenueKPI.value / 30),
              change: 8.1,
              changeLabel: "vs last 30 days",
              sparklineData: data.slice(-14).map((d) => d.total),
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revenue Trend — Multi-line
            </CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revenue Breakdown by Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">AOV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockChannelRevenue.map((ch) => (
                  <TableRow key={ch.channel}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ch.color }}
                        />
                        {ch.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(ch.revenue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ch.percentage}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ch.channel === "shopify" ? "1,247" : "834"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(ch.revenue / (ch.channel === "shopify" ? 1247 : 834))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
