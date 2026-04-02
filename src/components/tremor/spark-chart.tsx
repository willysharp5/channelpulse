"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

interface SparkAreaChartProps {
  data: number[];
  color?: string;
  height?: number;
  type?: "area" | "bar";
}

export function SparkChart({
  data,
  color = "#3b82f6",
  height = 36,
  type = "area",
}: SparkAreaChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || data.length === 0) return <div style={{ height }} />;

  const chartData = data.map((value, i) => ({ i, v: value }));
  const gradientId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
