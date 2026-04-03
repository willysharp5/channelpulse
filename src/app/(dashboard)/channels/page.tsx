import Link from "next/link";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelSyncButton } from "@/components/channels/channel-sync-button";
import { ChannelAovMetricLabel } from "@/components/channels/channel-aov-label";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { CHANNEL_CONFIG, PLATFORM_DISPLAY_ORDER, rangeToDays } from "@/lib/constants";
import { formatCurrency, formatNumber, formatDate } from "@/lib/formatters";
import { getChannelsWithStats, getUserPlan } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import type { Platform } from "@/types";
import type { KPIData } from "@/types";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const dateParams =
    params.from && params.to
      ? { from: params.from, to: params.to }
      : { days: rangeToDays(params.range ?? null) };

  const [user, channels] = await Promise.all([
    getSession(),
    getChannelsWithStats(dateParams),
  ]);

  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const totalOrders = channels.reduce((s, c) => s + c.ordersCount, 0);
  const activeChannels = channels.filter((c) => c.status === "active").length;
  const avgAov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const { limits } = await getUserPlan();

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
      <Header title="Channels" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Connected Channels</h2>
            <p className="text-sm text-muted-foreground">
              Manage your marketplace connections and sync status.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-amber-500 px-3 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            Connect Channel
          </Link>
        </div>

        {channels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No channels connected yet.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your first store to start tracking sales.
              </p>
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
                <CardContent className="pt-5 pb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Revenue by Channel
                  </p>
                  <CategoryBar data={revenueByChannel} />
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {channels.map((channel) => {
                const config = CHANNEL_CONFIG[channel.platform as Platform];
                const aov =
                  channel.ordersCount > 0
                    ? channel.revenue / channel.ordersCount
                    : 0;

                return (
                  <Card key={channel.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                            style={{ backgroundColor: config?.color }}
                          >
                            {config?.abbr}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: config?.color }}
                              />
                              <span className="text-sm font-semibold">
                                {channel.name}
                              </span>
                            </div>
                            <ChannelBadge
                              platform={channel.platform as Platform}
                              className="mt-1 text-[10px] px-1.5 py-0"
                            />
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
                          <p className="text-lg font-bold tabular-nums">
                            {formatCurrency(channel.revenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Revenue
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-bold tabular-nums">
                            {formatNumber(channel.ordersCount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Orders
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-bold tabular-nums">
                            {formatCurrency(aov)}
                          </p>
                          <ChannelAovMetricLabel />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <RefreshCw className="h-3 w-3" />
                          Last synced{" "}
                          {channel.last_sync_at
                            ? formatDate(channel.last_sync_at, "MMM d, h:mm a")
                            : "never"}
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
            <CardDescription>
              Click any channel to connect it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_DISPLAY_ORDER.map((p) => {
                const config = CHANNEL_CONFIG[p];
                return (
                  <Link key={p} href="/settings">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted cursor-pointer"
                      style={{
                        borderColor: config.color,
                        color: config.color,
                        backgroundColor: `${config.color}10`,
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
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
