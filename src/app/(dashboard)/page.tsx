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
  getComparisonStats,
  getComparisonRevenueSeries,
} from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { REPORT_CHANNEL_PALETTE, rangeToDays, DATE_RANGE_PRESETS } from "@/lib/constants";
import { NoChannelsEmpty } from "@/components/dashboard/empty-state";
import { getChannels } from "@/lib/queries";
import { getComparisonDateRange, getCompareLabel, type CompareMode } from "@/lib/comparison";
import { getDateRange } from "@/lib/date-range-bounds";
import type { Platform } from "@/types";

function formatRangeLabel(from: string, to: string): string {
  const f = new Date(from + "T00:00:00");
  const t = new Date(to + "T00:00:00");
  const sameYear = f.getFullYear() === t.getFullYear();
  const fmtFrom = f.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  const fmtTo = t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmtFrom} – ${fmtTo}`;
}

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; compare?: string }>;
}) {
  const params = await searchParams;
  const dateParams = params.from && params.to
    ? { from: params.from, to: params.to }
    : { days: rangeToDays(params.range ?? null) };
  const rangeLabel = params.from && params.to
    ? `${params.from} to ${params.to}`
    : DATE_RANGE_PRESETS.find((p) => p.value === (params.range ?? "30d"))?.label ?? "Last 30 days";

  const compareMode = (params.compare as CompareMode) ?? "previous";

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

  const compRange = getComparisonDateRange(dateParams, compareMode);
  let compStats = null;
  let compSeries: { date: string; total: number }[] = [];

  if (compRange) {
    [compStats, compSeries] = await Promise.all([
      getComparisonStats(compRange.fromStr, compRange.toStr),
      getComparisonRevenueSeries(compRange.fromStr, compRange.toStr),
    ]);
  }

  const revenueSeries = revenueResult.series;
  const activePlatforms = revenueResult.platforms;

  const currentRange = getDateRange(dateParams);
  const currentRangeLabel = formatRangeLabel(currentRange.fromStr, currentRange.toStr);
  const compRangeLabel = compRange ? formatRangeLabel(compRange.fromStr, compRange.toStr) : undefined;

  const { limits } = await getUserPlan();

  const compareLabel = getCompareLabel(compareMode);

  function fmtVal(v: number, isCurrency: boolean) {
    if (isCurrency) return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
    return v.toLocaleString();
  }

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  const kpiPeriods = {
    currentPeriodRange: currentRangeLabel,
    comparisonPeriodRange:
      compareMode !== "none" && compRangeLabel ? compRangeLabel : undefined,
  };

  const kpis = [
    {
      ...kpiPeriods,
      title: "Total Revenue",
      value: stats.revenue.value,
      formattedValue: fmtVal(stats.revenue.value, true),
      change: compStats ? pctChange(stats.revenue.value, compStats.revenue) : stats.revenue.change,
      changeLabel: `vs ${compareLabel.toLowerCase()}`,
      sparklineData: revenueSeries.slice(-14).map((p) => p.total),
      comparisonValue: compStats?.revenue,
      comparisonFormatted: compStats ? fmtVal(compStats.revenue, true) : undefined,
      comparisonLabel: compareLabel,
    },
    {
      ...kpiPeriods,
      title: "Total Orders",
      value: stats.orders.value,
      formattedValue: stats.orders.value.toLocaleString(),
      change: compStats ? pctChange(stats.orders.value, compStats.orders) : stats.orders.change,
      changeLabel: `vs ${compareLabel.toLowerCase()}`,
      sparklineData: revenueSeries.slice(-14).map((p) =>
        stats.aov.value > 0 ? Math.round(p.total / stats.aov.value) : 0
      ),
      progress: {
        value: stats.orders.value,
        max: limits.ordersPerMonth,
        label: `${stats.orders.value.toLocaleString()} / ${limits.ordersPerMonth.toLocaleString()} orders`,
        color: stats.orders.value > limits.ordersPerMonth * 0.9 ? "#ef4444" : "#f59e0b",
      },
      comparisonValue: compStats?.orders,
      comparisonFormatted: compStats ? compStats.orders.toLocaleString() : undefined,
      comparisonLabel: compareLabel,
    },
    {
      ...kpiPeriods,
      title: "Units Sold",
      value: stats.units.value,
      formattedValue: stats.units.value.toLocaleString(),
      change: compStats ? pctChange(stats.units.value, compStats.units) : stats.units.change,
      changeLabel: `vs ${compareLabel.toLowerCase()}`,
      sparklineData: [],
      comparisonValue: compStats?.units,
      comparisonFormatted: compStats ? compStats.units.toLocaleString() : undefined,
      comparisonLabel: compareLabel,
    },
    {
      ...kpiPeriods,
      title: "Net Profit",
      value: stats.profit.value,
      formattedValue: fmtVal(stats.profit.value, true),
      change: compStats ? pctChange(stats.profit.value, compStats.profit) : stats.profit.change,
      changeLabel: `vs ${compareLabel.toLowerCase()}`,
      sparklineData: revenueSeries.slice(-14).map((p) => p.total * 0.5),
      comparisonValue: compStats?.profit,
      comparisonFormatted: compStats ? fmtVal(compStats.profit, true) : undefined,
      comparisonLabel: compareLabel,
    },
    {
      ...kpiPeriods,
      title: "Avg Order Value",
      value: stats.aov.value,
      formattedValue: `$${stats.aov.value.toFixed(2)}`,
      change: compStats ? pctChange(stats.aov.value, compStats.aov) : stats.aov.change,
      changeLabel: `vs ${compareLabel.toLowerCase()}`,
      sparklineData: [],
      comparisonValue: compStats?.aov,
      comparisonFormatted: compStats ? `$${compStats.aov.toFixed(2)}` : undefined,
      comparisonLabel: compareLabel,
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

  // Build comparison overlay for chart
  let comparisonChartData: { date: string; total: number; compTotal: number }[] | undefined;
  if (compSeries.length > 0 && revenueSeries.length > 0) {
    const compMap = new Map(compSeries.map((p) => [p.date, p.total]));
    const compDates = compSeries.map((p) => p.date).sort();
    comparisonChartData = revenueSeries.map((point, i) => {
      const compDate = compDates[i];
      return {
        date: point.date,
        total: point.total,
        compTotal: compDate ? (compMap.get(compDate) ?? 0) : 0,
      };
    });
  }

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
          comparisonChartData={comparisonChartData}
          comparisonLabel={compareLabel}
          compareMode={compareMode}
          currentRangeLabel={currentRangeLabel}
          compRangeLabel={compRangeLabel}
        />
      </div>
    </>
  );
}
