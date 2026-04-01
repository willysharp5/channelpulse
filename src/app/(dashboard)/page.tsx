import { Header } from "@/components/layout/header";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelBreakdown } from "@/components/charts/channel-breakdown";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { getDashboardStats, getRevenueSeries, getChannelRevenue, getRecentOrders, getProducts } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { CHANNEL_CONFIG, rangeToDays, DATE_RANGE_PRESETS } from "@/lib/constants";
import type { Platform } from "@/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const days = rangeToDays(params.range ?? null);
  const rangeLabel = DATE_RANGE_PRESETS.find((p) => p.value === (params.range ?? "30d"))?.label ?? "Last 30 days";

  const [user, stats, revenueSeries, channelData, recentOrders, products] = await Promise.all([
    getSession(),
    getDashboardStats(days),
    getRevenueSeries(days),
    getChannelRevenue(days),
    getRecentOrders(10),
    getProducts(),
  ]);

  const kpis = [
    {
      title: "Total Revenue",
      value: stats.revenue.value,
      formattedValue: stats.revenue.value >= 1000 ? `$${(stats.revenue.value / 1000).toFixed(1)}k` : `$${stats.revenue.value.toFixed(2)}`,
      change: stats.revenue.change,
      changeLabel: `vs previous ${rangeLabel.toLowerCase()}`,
      sparklineData: revenueSeries.slice(-14).map((p) => p.total),
    },
    {
      title: "Total Orders",
      value: stats.orders.value,
      formattedValue: stats.orders.value.toLocaleString(),
      change: stats.orders.change,
      changeLabel: `vs previous ${rangeLabel.toLowerCase()}`,
      sparklineData: revenueSeries.slice(-14).map((p) =>
        stats.aov.value > 0 ? Math.round(p.total / stats.aov.value) : 0
      ),
    },
    {
      title: "Net Profit",
      value: stats.profit.value,
      formattedValue: stats.profit.value >= 1000 ? `$${(stats.profit.value / 1000).toFixed(1)}k` : `$${stats.profit.value.toFixed(2)}`,
      change: stats.profit.change,
      changeLabel: `vs previous ${rangeLabel.toLowerCase()}`,
      sparklineData: revenueSeries.slice(-14).map((p) => p.total * 0.5),
    },
    {
      title: "Avg Order Value",
      value: stats.aov.value,
      formattedValue: `$${stats.aov.value.toFixed(2)}`,
      change: stats.aov.change,
      changeLabel: `vs previous ${rangeLabel.toLowerCase()}`,
      sparklineData: [],
    },
  ];

  const channelRevenue = channelData.map((ch) => ({
    channel: ch.channel as Platform,
    label: CHANNEL_CONFIG[ch.channel as Platform]?.label ?? ch.label,
    revenue: ch.revenue,
    percentage: ch.percentage,
    color: CHANNEL_CONFIG[ch.channel as Platform]?.color ?? "#6B7280",
  }));

  return (
    <>
      <Header
        title="Overview"
        userEmail={user?.email ?? undefined}
        userName={user?.user_metadata?.business_name}
      />
      <div className="flex-1 space-y-6 p-6">
        <OverviewCards kpis={kpis} />
        <RevenueChart data={revenueSeries} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChannelBreakdown data={channelRevenue} />
          <TopProducts products={products} />
        </div>
        <RecentOrders orders={recentOrders} />
      </div>
    </>
  );
}
