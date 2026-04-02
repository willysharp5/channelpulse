"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TremorDonutChart } from "@/components/tremor/donut-chart";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { ChannelRevenue } from "@/types";

interface ChannelBreakdownProps {
  data: ChannelRevenue[];
}

export function ChannelBreakdown({ data }: ChannelBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No channel data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const donutData = data.map((entry) => ({
    name: CHANNEL_CONFIG[entry.channel]?.label ?? entry.label,
    value: entry.revenue,
    color: entry.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <TremorDonutChart
            data={donutData}
            label="Total"
            valueFormatter={formatCompactCurrency}
            className="flex-shrink-0"
          />

          <div className="flex-1 w-full space-y-2">
            {data.map((entry) => (
              <div key={entry.channel} className="flex items-center gap-3 py-1">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {CHANNEL_CONFIG[entry.channel]?.label ?? entry.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums ml-2">
                      {formatCompactCurrency(entry.revenue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${entry.percentage}%`,
                          backgroundColor: entry.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {entry.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
