import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardStats, getRevenueSeries, getChannelRevenue } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { CHANNEL_CONFIG } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import type { Platform } from "@/types";

export const dynamic = "force-dynamic";

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function RevenuePage() {
  const [user, stats, revenueSeries, channelData] = await Promise.all([
    getSession(),
    getDashboardStats(30),
    getRevenueSeries(30),
    getChannelRevenue(30),
  ]);

  const chartData = revenueSeries.map((point) => ({
    ...point,
    dateLabel: formatDateLabel(point.date),
  }));

  const avgDailyRevenue = revenueSeries.length > 0
    ? stats.revenue.value / revenueSeries.length
    : 0;

  const bestDay = revenueSeries.length > 0
    ? revenueSeries.reduce((best, p) => (p.total > best.total ? p : best), revenueSeries[0])
    : { date: "—", total: 0 };

  return (
    <>
      <Header title="Revenue" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            data={{
              title: "Total Revenue",
              value: stats.revenue.value,
              formattedValue: formatCurrency(stats.revenue.value),
              change: stats.revenue.change,
              changeLabel: "vs last 30 days",
              sparklineData: revenueSeries.slice(-14).map((p) => p.total),
            }}
          />
          <KPICard
            data={{
              title: "MoM Growth",
              value: stats.revenue.change,
              formattedValue: `${stats.revenue.change >= 0 ? "+" : ""}${stats.revenue.change.toFixed(1)}%`,
              change: 0,
              changeLabel: "vs previous period",
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Best Day",
              value: bestDay.total,
              formattedValue: formatCurrency(bestDay.total),
              change: 0,
              changeLabel: formatDateLabel(bestDay.date),
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Avg Daily Revenue",
              value: avgDailyRevenue,
              formattedValue: formatCurrency(avgDailyRevenue),
              change: stats.revenue.change,
              changeLabel: "vs last 30 days",
              sparklineData: chartData.slice(-14).map((d) => d.total),
            }}
          />
        </div>

        <RevenueTrendChart data={chartData} />

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
                {channelData.map((ch) => {
                  const config = CHANNEL_CONFIG[ch.channel as Platform];
                  return (
                    <TableRow key={ch.channel}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config?.color }} />
                          {config?.label ?? ch.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(ch.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{ch.percentage}%</TableCell>
                      <TableCell className="text-right tabular-nums">{ch.orders.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(ch.orders > 0 ? ch.revenue / ch.orders : 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
