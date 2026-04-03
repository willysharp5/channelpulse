import { Header } from "@/components/layout/header";
import { RevenueDashboard } from "@/components/charts/revenue-dashboard";
import { getDashboardStats, getRevenueSeries, getChannelRevenue } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { REPORT_CHANNEL_PALETTE, rangeToDays } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
export const dynamic = "force-dynamic";

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const dateParams = params.from && params.to
    ? { from: params.from, to: params.to }
    : { days: rangeToDays(params.range ?? null) };

  const [user, stats, revenueResult, channelData] = await Promise.all([
    getSession(),
    getDashboardStats(dateParams),
    getRevenueSeries(dateParams),
    getChannelRevenue(dateParams),
  ]);

  const revenueSeries = revenueResult.series;
  const activePlatforms = revenueResult.platforms;

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

  const totalRevenue = stats.revenue.value;
  const growthPct = stats.revenue.change;

  const kpis = [
    {
      title: "Total Revenue",
      value: totalRevenue,
      formattedValue: formatCurrency(totalRevenue),
      change: growthPct,
      changeLabel: "vs last 30 days",
      sparklineData: revenueSeries.slice(-14).map((p) => p.total),
    },
    {
      title: "MoM Growth",
      value: growthPct,
      formattedValue: `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%`,
      change: 0,
      changeLabel: "vs previous period",
      sparklineData: [],
      progress: {
        value: Math.abs(growthPct),
        max: 100,
        label: growthPct >= 0 ? "Growth rate" : "Decline rate",
        color: growthPct >= 0 ? "#10b981" : "#ef4444",
      },
    },
    {
      title: "Best Day",
      value: bestDay.total,
      formattedValue: formatCurrency(bestDay.total),
      change: 0,
      changeLabel: formatDateLabel(bestDay.date),
      sparklineData: [],
    },
    {
      title: "Avg Daily Revenue",
      value: avgDailyRevenue,
      formattedValue: formatCurrency(avgDailyRevenue),
      change: growthPct,
      changeLabel: "vs last 30 days",
      sparklineData: chartData.slice(-14).map((d) => d.total as number),
    },
  ];

  const barChartData = channelData.map((ch) => ({
    channel: ch.label,
    Revenue: ch.revenue,
  }));

  const barColors = channelData.map((_, i) => REPORT_CHANNEL_PALETTE[i % REPORT_CHANNEL_PALETTE.length]!);

  return (
    <>
      <Header title="Revenue" userEmail={user?.email ?? undefined} />
      <div className="flex-1 p-6">
        <RevenueDashboard
          kpis={kpis}
          chartData={chartData}
          platforms={activePlatforms}
          barChartData={barChartData}
          barColors={barColors}
        />
      </div>
    </>
  );
}
