"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export interface DonutDataItem {
  name: string;
  value: number;
  color: string;
}

interface TremorDonutChartProps {
  data: DonutDataItem[];
  /** Top line in the hole when nothing is selected (default "Total"). */
  label?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
  size?: number;
  /** Highlight a slice and show its value in the center; `null` shows total. */
  selectedIndex?: number | null;
  /** Called with slice index; parent can toggle to `null` for the same index to deselect. */
  onSliceClick?: (index: number) => void;
}

export function TremorDonutChart({
  data,
  label = "Total",
  valueFormatter = (v) => v.toLocaleString(),
  className,
  size = 180,
  selectedIndex = null,
  onSliceClick,
}: TremorDonutChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const total = data.reduce((s, d) => s + d.value, 0);
  const selected = selectedIndex !== null ? data[selectedIndex] : null;
  const selectedPct =
    selected && total > 0 ? ((selected.value / total) * 100).toFixed(1) : null;

  if (!mounted) return <div style={{ height: size, width: size }} className={className} />;

  return (
    <div className={cn("relative isolate", className)} style={{ height: size, width: size }}>
      <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center px-3 text-center">
        {selected ? (
          <>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
              {selected.name}
            </span>
            <span className="mt-0.5 text-lg font-bold tabular-nums">
              {valueFormatter(selected.value)}
            </span>
            {selectedPct !== null ? (
              <span className="mt-0.5 text-[10px] text-muted-foreground">{selectedPct}% of total</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-lg font-bold tabular-nums">{valueFormatter(total)}</span>
          </>
        )}
      </div>
      <div className="relative z-10 h-full w-full [&_.recharts-surface]:cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.44}
              paddingAngle={data.length > 1 ? 3 : 0}
              strokeWidth={0}
              onClick={(_, index) => onSliceClick?.(index)}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`${entry.name}-${i}`}
                  fill={entry.color}
                  fillOpacity={
                    selectedIndex === null ? 1 : selectedIndex === i ? 1 : 0.32
                  }
                  style={{ outline: "none" }}
                />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ zIndex: 20 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0].payload as DonutDataItem;
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                return (
                  <div className="rounded-lg border bg-background p-2.5 shadow-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium tabular-nums">
                      Revenue: {valueFormatter(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">Share: {pct}%</p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
