"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
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
          <p className="text-sm text-muted-foreground">No channel data yet.</p>
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
        <div className="flex items-center gap-6">
          <div className="relative h-[160px] w-[160px] flex-shrink-0">
            {mounted ? <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="revenue"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.channel} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer> : null}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(totalRevenue)}
              </span>
              <span className="text-[10px] text-muted-foreground">Total</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {data.map((entry) => (
              <div key={entry.channel} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {CHANNEL_CONFIG[entry.channel]?.icon}{" "}
                      {entry.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.percentage}%
                    </span>
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(entry.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
