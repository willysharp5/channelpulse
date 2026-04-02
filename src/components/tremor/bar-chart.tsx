"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TREMOR_CHART_COLORS } from "@/lib/chartUtils";
import { cn } from "@/lib/utils";

interface TremorBarChartProps {
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
  layout?: "vertical" | "horizontal";
  valueFormatter?: (value: number) => string;
  className?: string;
}

const COLOR_PALETTE = ["blue", "emerald", "violet", "amber", "cyan", "pink", "lime", "fuchsia", "gray"];

export function TremorBarChart({
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
  layout = "horizontal",
  valueFormatter = (v) => v.toLocaleString(),
  className,
}: TremorBarChartProps) {
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
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          {showGridLines && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          )}
          {layout === "horizontal" ? (
            <>
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
            </>
          ) : (
            <>
              {showYAxis && (
                <YAxis
                  dataKey={index}
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  width={yAxisWidth}
                />
              )}
              {showXAxis && (
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(v) => valueFormatter(v)}
                />
              )}
            </>
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
            <Bar
              key={key}
              dataKey={key}
              fill={hex}
              radius={[4, 4, 0, 0]}
              stackId={stack ? "stack" : undefined}
              opacity={0.9}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
