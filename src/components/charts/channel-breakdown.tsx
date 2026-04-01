"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { ChannelRevenue } from "@/types";

interface ChannelBreakdownProps {
  data: ChannelRevenue[];
}

export function ChannelBreakdown({ data }: ChannelBreakdownProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const totalRevenue = data.reduce((s, c) => s + c.revenue, 0);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue by Channel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut chart */}
          <div className="relative h-[180px] w-[180px] flex-shrink-0">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="revenue"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={data.length > 1 ? 3 : 0}
                    strokeWidth={0}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.channel} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const item = payload[0].payload as ChannelRevenue;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
                          <p className="font-medium">{CHANNEL_CONFIG[item.channel]?.label ?? item.label}</p>
                          <p className="tabular-nums">{formatCurrency(item.revenue)}</p>
                          <p className="text-muted-foreground">{item.percentage}% of total</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums">
                {formatCompactCurrency(totalRevenue)}
              </span>
            </div>
          </div>

          {/* Legend */}
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
                      {CHANNEL_CONFIG[entry.channel]?.icon}{" "}
                      {CHANNEL_CONFIG[entry.channel]?.label ?? entry.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums ml-2">
                      {formatCompactCurrency(entry.revenue)}
                    </span>
                  </div>
                  {/* Progress bar */}
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
