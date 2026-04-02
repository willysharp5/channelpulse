"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface DonutDataItem {
  name: string;
  value: number;
  color: string;
}

interface TremorDonutChartProps {
  data: DonutDataItem[];
  label?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
  size?: number;
}

export function TremorDonutChart({
  data,
  label,
  valueFormatter = (v) => v.toLocaleString(),
  className,
  size = 180,
}: TremorDonutChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!mounted) return <div style={{ height: size, width: size }} className={className} />;

  return (
    <div className={cn("relative", className)} style={{ height: size, width: size }}>
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
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
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
                  <p className="mt-1 text-sm font-medium tabular-nums">{valueFormatter(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{pct}% of total</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-lg font-bold tabular-nums">{valueFormatter(total)}</span>
      </div>
    </div>
  );
}
