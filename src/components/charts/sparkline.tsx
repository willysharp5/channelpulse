"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  positive?: boolean;
}

export function Sparkline({
  data,
  color,
  height = 32,
  positive = true,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));
  const fillColor = color ?? (positive ? "#22C55E" : "#EF4444");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`spark-${fillColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={fillColor}
          strokeWidth={1.5}
          fill={`url(#spark-${fillColor})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
