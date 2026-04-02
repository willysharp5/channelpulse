"use client";

import { TremorBarChart } from "@/components/tremor/bar-chart";
import { formatCurrency } from "@/lib/formatters";

interface ChannelRevenueBarProps {
  data: Record<string, unknown>[];
  colors: string[];
}

export function ChannelRevenueBar({ data, colors }: ChannelRevenueBarProps) {
  return (
    <TremorBarChart
      data={data}
      index="channel"
      categories={["Revenue"]}
      colors={colors}
      layout="vertical"
      yAxisWidth={100}
      valueFormatter={(v) => formatCurrency(v)}
    />
  );
}
