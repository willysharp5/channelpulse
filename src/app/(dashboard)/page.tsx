import { Header } from "@/components/layout/header";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import {
  getDashboardStats,
  getRevenueSeries,
  getChannelRevenue,
  getRecentOrders,
  getTopProductsBySales,
  getUserPlan,
  getHasSeenDashboardTour,
} from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { REPORT_CHANNEL_PALETTE, rangeToDays, DATE_RANGE_PRESETS } from "@/lib/constants";
import { NoChannelsEmpty } from "@/components/dashboard/empty-state";
import { getChannels } from "@/lib/queries";
import type { Platform } from "@/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const dateParams = params.from && params.to
    ? { from: params.from, to: params.to }
    : { days: rangeToDays(params.range ?? null) };
  const rangeLabel = params.from && params.to
    ? `${params.from} to ${params.to}`
    : DATE_RANGE_PRESETS.find((p) => p.value === (params.range ?? "30d"))?.label ?? "Last 30 days";

  const user = await getSession();
  const channels = await getChannels();

  if (channels.length === 0) {
    return (
      <>
        <Header title="Overview" userEmail={user?.email ?? undefined} />
        <div className="flex-1 p-6">
          <NoChannelsEmpty />
        </div>
      </>
    );
  }

  const [stats, revenueResult, channelData, recentOrders, topProducts, hasSeenTour] = await Promise.all([
    getDashboardStats(dateParams),
    getRevenueSeries(dateParams),
    getChannelRevenue(dateParams),
    getRecentOrders(10),
    getTopProductsBySales(dateParams, 10),
    getHasSeenDashboardTour(),
  ]);

  const revenueSeries = revenueResult.series;
  const activePlatforms = revenueResult.platforms;

  const { limits } = await getUserPlan();

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
      progress: {
        value: stats.orders.value,
        max: limits.ordersPerMonth,
        label: `${stats.orders.value.toLocaleString()} / ${limits.ordersPerMonth.toLocaleString()} orders`,
        color: stats.orders.value > limits.ordersPerMonth * 0.9 ? "#ef4444" : "#f59e0b",
      },
    },
    {
      title: "Units Sold",
      value: stats.units.value,
      formattedValue: stats.units.value.toLocaleString(),
      change: stats.units.change,
      changeLabel: `vs previous ${rangeLabel.toLowerCase()}`,
      sparklineData: [],
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

  const channelRevenue = channelData.map((ch, i) => ({
    channelId: ch.channelId,
    channel: ch.channel as Platform,
    label: ch.label,
    revenue: ch.revenue,
    percentage: ch.percentage,
    color: REPORT_CHANNEL_PALETTE[i % REPORT_CHANNEL_PALETTE.length]!,
  }));

  return (
    <>
      <Header
        title="Overview"
        userEmail={user?.email ?? undefined}
        userName={user?.user_metadata?.business_name}
      />
      <div className="flex-1 p-6">
        <OverviewDashboard
          kpis={kpis}
          revenueSeries={revenueSeries}
          platforms={activePlatforms}
          channelRevenue={channelRevenue}
          topProducts={topProducts}
          recentOrders={recentOrders}
          showTour={!hasSeenTour}
        />
      </div>
    </>
  );
}
