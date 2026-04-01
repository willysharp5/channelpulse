import { Plus, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { CHANNEL_CONFIG, rangeToDays } from "@/lib/constants";
import { formatCurrency, formatNumber, formatDate } from "@/lib/formatters";
import { getChannelsWithStats } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import type { Platform } from "@/types";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const dateParams = params.from && params.to
    ? { from: params.from, to: params.to }
    : { days: rangeToDays(params.range ?? null) };

  const [user, channels] = await Promise.all([
    getSession(),
    getChannelsWithStats(dateParams),
  ]);

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
          <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="h-4 w-4" />
            Connect Channel
          </Button>
        </div>

        {channels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No channels connected yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your first store to start tracking sales.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((channel) => {
              const config = CHANNEL_CONFIG[channel.platform as Platform];
              const aov = channel.ordersCount > 0 ? channel.revenue / channel.ordersCount : 0;

              return (
                <Card key={channel.id} className="relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ backgroundColor: config?.color }}
                  />
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `${config?.color}15` }}
                      >
                        {config?.icon}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {channel.name}
                        </CardTitle>
                        <ChannelBadge
                          platform={channel.platform as Platform}
                          className="mt-1 text-[10px] px-1.5 py-0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold tabular-nums">
                          {formatCurrency(channel.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue (30d)</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold tabular-nums">
                          {formatNumber(channel.ordersCount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Orders (30d)</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold tabular-nums">
                          {formatCurrency(aov)}
                        </p>
                        <p className="text-xs text-muted-foreground">AOV</p>
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
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Sync Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
