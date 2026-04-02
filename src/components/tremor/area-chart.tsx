"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TREMOR_CHART_COLORS } from "@/lib/chartUtils";
import { cn } from "@/lib/utils";

interface TremorAreaChartProps {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors?: string[];
  yAxisWidth?: number;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  showTooltip?: boolean;
  stack?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const COLOR_PALETTE = ["blue", "emerald", "violet", "amber", "cyan", "pink", "lime", "fuchsia", "gray"];

export function TremorAreaChart({
  data,
  index,
  categories,
  colors,
  yAxisWidth = 56,
  showXAxis = true,
  showYAxis = true,
  showGridLines = true,
  showTooltip = true,
  stack = false,
  valueFormatter = (v) => v.toLocaleString(),
  className,
}: TremorAreaChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const colorMap = useMemo(() => {
    const assignedColors = colors ?? COLOR_PALETTE.slice(0, categories.length);
    return categories.map((cat, i) => ({
      key: cat,
      hex: TREMOR_CHART_COLORS[assignedColors[i]] ?? assignedColors[i] ?? "#6b7280",
    }));
  }, [categories, colors]);

  if (!mounted) return <div className={cn("h-72", className)} />;

  return (
    <div className={cn("h-72 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            {colorMap.map(({ key, hex }) => (
              <linearGradient key={key} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hex} stopOpacity={0.4} />
                <stop offset="60%" stopColor={hex} stopOpacity={0.12} />
                <stop offset="100%" stopColor={hex} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          {showGridLines && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          )}
          {showXAxis && (
            <XAxis
              dataKey={index}
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              interval="preserveStartEnd"
              dy={8}
            />
          )}
          {showYAxis && (
            <YAxis
              width={yAxisWidth}
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              tickFormatter={(v) => valueFormatter(v)}
            />
          )}
          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
                    <div className="space-y-1">
                      {payload.map((p) => (
                        <div key={p.dataKey as string} className="flex items-center justify-between gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-muted-foreground">{p.dataKey as string}</span>
                          </div>
                          <span className="font-medium tabular-nums">{valueFormatter(p.value as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
          )}
          {colorMap.map(({ key, hex }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={hex}
              strokeWidth={2}
              fill={`url(#area-${key})`}
              stackId={stack ? "stack" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
