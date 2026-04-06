import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { DemoHeader } from "@/components/layout/demo-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelSyncButton } from "@/components/channels/channel-sync-button";
import { ChannelAovMetricLabel } from "@/components/channels/channel-aov-label";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { CHANNEL_CONFIG, PLATFORM_DISPLAY_ORDER, rangeToDays, REPORT_CHANNEL_PALETTE, DATE_RANGE_PRESETS } from "@/lib/constants";
import { formatCurrency, formatNumber, formatDate } from "@/lib/formatters";
import { getChannelsWithStats, getDemoUserPlan, getPnLData, getDashboardStats, getRevenueSeries, getChannelRevenue } from "@/lib/queries";
import { RevenueDashboard } from "@/components/charts/revenue-dashboard";
import { ExportButton } from "@/components/export-button";
import { PnLContent } from "@/components/pnl/pnl-content";
import { SalesByChannelCard } from "@/components/pnl/sales-by-channel-card";
import {
  getProductsCatalogSummary,
  getProductsPage,
  parseProductsListParams,
} from "@/lib/products-list";
import { ProductsPageContent } from "@/components/products/products-page-content";
import { getInventoryPage, parseInventoryListParams } from "@/lib/inventory-list";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersTable } from "@/components/orders/orders-table";
import {
  getOrdersOrgFinancialTotals,
  getOrdersPage,
  getOrdersOrgTotalCount,
  parseOrdersListParams,
} from "@/lib/orders-list";
import { ChatPage } from "@/components/chat/chat-page";
import type { Platform } from "@/types";
import type { KPIData } from "@/types";
import { DEMO_ORG_ID } from "@/lib/demo-data";
import { DemoSignupPlaceholder } from "@/components/demo/demo-signup-placeholder";

export const dynamic = "force-dynamic";

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function DemoCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!slug?.length) notFound();
  if (slug.length > 1) notFound();
  const key = slug[0];

  if (key === "orders") {
    const paramsParsed = parseOrdersListParams(sp);
    const [orderData, orgOrderCount, orgFin, { limits }] = await Promise.all([
      getOrdersPage(paramsParsed, DEMO_ORG_ID),
      getOrdersOrgTotalCount(DEMO_ORG_ID),
      getOrdersOrgFinancialTotals(DEMO_ORG_ID),
      Promise.resolve(getDemoUserPlan()),
    ]);

    const totalRevenue = orgFin.totalRevenue;
    const totalProfit = orgFin.totalProfit;
    const totalFees = orgFin.totalFees;
    const orgOrderFinCount = orgFin.totalCount;
    const avgOrderValue = orgOrderFinCount > 0 ? totalRevenue / orgOrderFinCount : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const netRevenue = totalRevenue - totalFees;
    const categoryData = [
      { label: "Net Revenue", value: Math.max(netRevenue - totalProfit, 0), color: "#10b981" },
      { label: "Platform Fees", value: totalFees, color: "#f97316" },
      { label: "Net Profit", value: Math.max(totalProfit, 0), color: "#6366f1" },
    ].filter((d) => d.value > 0);

    return (
      <>
        <DemoHeader title="Orders" />
        <div className="flex-1 space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              data={{
                title: "Total Orders",
                value: orgOrderCount,
                formattedValue: orgOrderCount.toLocaleString(),
                change: 0,
                changeLabel: "",
                sparklineData: [],
                progress: {
                  value: orgOrderCount,
                  max: limits.ordersPerMonth,
                  label: `${orgOrderCount.toLocaleString()} / ${limits.ordersPerMonth.toLocaleString()} plan limit`,
                  color: orgOrderCount > limits.ordersPerMonth * 0.9 ? "#ef4444" : "#f59e0b",
                },
              }}
            />
            <KPICard
              data={{
                title: "Revenue",
                value: totalRevenue,
                formattedValue: formatCurrency(totalRevenue),
                change: 0,
                changeLabel: "",
                sparklineData: [],
              }}
            />
            <KPICard
              data={{
                title: "Avg order",
                value: avgOrderValue,
                formattedValue: formatCurrency(avgOrderValue),
                change: 0,
                changeLabel: "",
                sparklineData: [],
              }}
            />
            <KPICard
              data={{
                title: "Net profit",
                value: totalProfit,
                formattedValue: formatCurrency(totalProfit),
                change: 0,
                changeLabel: "",
                sparklineData: [],
                progress: {
                  value: Math.abs(profitMargin),
                  max: 100,
                  label: `${profitMargin.toFixed(1)}% profit margin`,
                  color: profitMargin >= 20 ? "#10b981" : profitMargin >= 0 ? "#f59e0b" : "#ef4444",
                },
              }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Revenue breakdown</CardTitle>
              <CardDescription>Totals for all reporting-channel orders—not the filtered table below.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium tabular-nums">{formatCurrency(totalRevenue)}</span>
                </div>
                <CategoryBar data={categoryData} amountLabel="Amount" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full max-w-sm" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                }
              >
                <OrdersTable
                  rows={orderData.rows}
                  totalCount={orderData.totalCount}
                  totalRevenue={orderData.totalRevenue}
                  effectivePage={orderData.effectivePage}
                  requestedPage={paramsParsed.page}
                  platformOptions={orderData.platformOptions}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (key === "revenue") {
    const range = sp.range as string | undefined;
    const from = sp.from as string | undefined;
    const to = sp.to as string | undefined;
    const dateParams = from && to ? { from, to } : { days: rangeToDays(range ?? null) };

    const [stats, revenueResult, channelData] = await Promise.all([
      getDashboardStats(dateParams, DEMO_ORG_ID),
      getRevenueSeries(dateParams, DEMO_ORG_ID),
      getChannelRevenue(dateParams, DEMO_ORG_ID),
    ]);

    const revenueSeries = revenueResult.series;
    const activePlatforms = revenueResult.platforms;
    const chartData = revenueSeries.map((point) => ({
      ...point,
      dateLabel: formatDateLabel(point.date),
    }));
    const avgDailyRevenue = revenueSeries.length > 0 ? stats.revenue.value / revenueSeries.length : 0;
    const bestDay =
      revenueSeries.length > 0
        ? revenueSeries.reduce((best, p) => (p.total > best.total ? p : best), revenueSeries[0]!)
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
        <DemoHeader title="Revenue" />
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

  if (key === "products") {
    const listParams = parseProductsListParams(sp);
    const [catalogSummary, pageData] = await Promise.all([
      getProductsCatalogSummary(DEMO_ORG_ID),
      getProductsPage(listParams, DEMO_ORG_ID),
    ]);

    return (
      <>
        <DemoHeader title="Products" />
        <ProductsPageContent
          catalogSummary={catalogSummary}
          pageData={pageData}
          requestedPage={listParams.page}
        />
      </>
    );
  }

  if (key === "inventory") {
    const paramsParsed = parseInventoryListParams(sp);
    const lastRefreshAt = new Date().toISOString();
    const data = await getInventoryPage(paramsParsed, DEMO_ORG_ID);

    return (
      <>
        <DemoHeader title="Inventory" />
        <div className="flex-1 space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold">Stock levels</h2>
            <p className="text-sm text-muted-foreground">
              Read-only sample catalog. Sign up to sync your own inventory.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Catalog inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryTable
                rows={data.rows}
                totalCount={data.totalCount}
                histogram={data.histogram}
                platformOptions={data.platformOptions}
                effectivePage={data.effectivePage}
                requestedPage={paramsParsed.page}
                lastRefreshAt={lastRefreshAt}
                criticalThreshold={data.criticalThreshold}
                lowThreshold={data.lowThreshold}
              />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (key === "channels") {
    const range = sp.range as string | undefined;
    const from = sp.from as string | undefined;
    const to = sp.to as string | undefined;
    const dateParams = from && to ? { from, to } : { days: rangeToDays(range ?? null) };

    const channels = await getChannelsWithStats(dateParams, DEMO_ORG_ID);
    const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
    const totalOrders = channels.reduce((s, c) => s + c.ordersCount, 0);
    const activeChannels = channels.filter((c) => c.status === "active").length;
    const avgAov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const { limits } = getDemoUserPlan();

    const kpis: KPIData[] = [
      {
        title: "Total Revenue",
        value: totalRevenue,
        formattedValue: formatCurrency(totalRevenue),
        change: 0,
        changeLabel: "",
        sparklineData: [],
      },
      {
        title: "Total Orders",
        value: totalOrders,
        formattedValue: formatNumber(totalOrders),
        change: 0,
        changeLabel: "",
        sparklineData: [],
        progress: {
          value: totalOrders,
          max: limits.ordersPerMonth,
          label: `${totalOrders.toLocaleString()} / ${limits.ordersPerMonth.toLocaleString()} plan limit`,
          color: totalOrders > limits.ordersPerMonth * 0.9 ? "#ef4444" : "#f59e0b",
        },
      },
      {
        title: "Active Channels",
        value: activeChannels,
        formattedValue: String(activeChannels),
        change: 0,
        changeLabel: "",
        sparklineData: [],
        progress: {
          value: activeChannels,
          max: limits.channels,
          label: `${activeChannels} / ${limits.channels >= 999 ? "∞" : limits.channels} channels`,
          color: limits.channels < 999 && activeChannels >= limits.channels ? "#ef4444" : "#10b981",
        },
      },
      {
        title: "Avg Order Value",
        value: avgAov,
        formattedValue: formatCurrency(avgAov),
        change: 0,
        changeLabel: "",
        sparklineData: [],
      },
    ];

    const revenueByChannel = channels
      .filter((c) => c.revenue > 0)
      .map((c) => {
        const config = CHANNEL_CONFIG[c.platform as Platform];
        return {
          id: c.id,
          label: c.name ?? config?.label ?? c.platform,
          sublabel: config?.label,
          value: c.revenue,
          color: config?.color ?? "#94a3b8",
        };
      });

    return (
      <>
        <DemoHeader title="Channels" />
        <div className="flex-1 space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Connected Channels</h2>
              <p className="text-sm text-muted-foreground">Sample marketplace connections for this demo.</p>
            </div>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-amber-500 px-3 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              Connect Channel
            </Link>
          </div>

          {channels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No demo channels. Run seed:public-demo.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => (
                  <KPICard key={kpi.title} data={kpi} />
                ))}
              </div>

              {revenueByChannel.length > 0 && (
                <Card>
                  <CardContent className="pb-4 pt-5">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">Revenue by Channel</p>
                    <CategoryBar data={revenueByChannel} />
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {channels.map((channel) => {
                  const config = CHANNEL_CONFIG[channel.platform as Platform];
                  const aov = channel.ordersCount > 0 ? channel.revenue / channel.ordersCount : 0;

                  return (
                    <Card key={channel.id}>
                      <CardContent className="pt-5">
                        <div className="mb-4 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                              style={{ backgroundColor: config?.color }}
                            >
                              {config?.abbr}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: config?.color }} />
                                <span className="text-sm font-semibold">{channel.name}</span>
                              </div>
                              <ChannelBadge platform={channel.platform as Platform} className="mt-1 px-1.5 py-0 text-[10px]" />
                            </div>
                          </div>
                          {channel.status === "active" ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {channel.status}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-lg font-bold tabular-nums">{formatCurrency(channel.revenue)}</p>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold tabular-nums">{formatNumber(channel.ordersCount)}</p>
                            <p className="text-xs text-muted-foreground">Orders</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold tabular-nums">{formatCurrency(aov)}</p>
                            <ChannelAovMetricLabel />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <RefreshCw className="h-3 w-3" />
                            Last synced{" "}
                            {channel.last_sync_at ? formatDate(channel.last_sync_at, "MMM d, h:mm a") : "never"}
                          </span>
                          <ChannelSyncButton
                            channelId={channel.id}
                            platform={channel.platform}
                            disabled={channel.status !== "active"}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Supported Channels</CardTitle>
              <CardDescription>Sign up to connect Shopify, Amazon, Etsy, or TikTok Shop.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_DISPLAY_ORDER.map((p) => {
                  const config = CHANNEL_CONFIG[p];
                  return (
                    <Link key={p} href="/signup">
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        style={{
                          borderColor: config.color,
                          color: config.color,
                          backgroundColor: `${config.color}10`,
                        }}
                      >
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                        {config.label}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (key === "pnl") {
    const range = sp.range as string | undefined;
    const from = sp.from as string | undefined;
    const to = sp.to as string | undefined;
    const dateParams = from && to ? { from, to } : { days: rangeToDays(range ?? null) };
    const rangeLabel =
      from && to
        ? `${from} to ${to}`
        : DATE_RANGE_PRESETS.find((p) => p.value === (range ?? "30d"))?.label ?? "Last 30 days";

    const pnl = await getPnLData(dateParams, DEMO_ORG_ID);

    return (
      <>
        <DemoHeader title="Profit & Loss" />
        <div className="flex items-center justify-end px-6 pt-4">
          <ExportButton endpoint="/api/export/pnl" label="Export P&L" />
        </div>
        <PnLContent pnl={pnl} rangeLabel={rangeLabel}>
          <SalesByChannelCard breakdown={pnl.channelBreakdown} />
        </PnLContent>
      </>
    );
  }

  if (key === "chat") {
    return (
      <>
        <DemoHeader title="AI Insights" />
        <div className="h-[calc(100vh-2rem)]">
          <ChatPage isDemo />
        </div>
      </>
    );
  }

  if (key === "billing" || key === "settings") {
    const signupCopy =
      key === "billing"
        ? {
            title: "Billing",
            body: "Manage subscriptions and invoices after you create an account.",
          }
        : {
            title: "Settings",
            body: "Connect stores, notifications, and account preferences are available after sign up.",
          };
    return <DemoSignupPlaceholder {...signupCopy} />;
  }

  notFound();
}
