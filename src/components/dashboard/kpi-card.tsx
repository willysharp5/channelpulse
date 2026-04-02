"use client";

import { DollarSign, ShoppingCart, PiggyBank, BarChart3, Info, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeDelta } from "@/components/tremor/badge-delta";
import { SparkChart } from "@/components/tremor/spark-chart";
import type { KPIData } from "@/types";

const ICON_MAP: Record<string, LucideIcon> = {
  "Total Revenue": DollarSign,
  "Total Orders": ShoppingCart,
  "Net Profit": PiggyBank,
  "Avg Order Value": BarChart3,
  "MoM Growth": BarChart3,
  "Best Day": BarChart3,
  "Avg Daily Revenue": DollarSign,
  "Total Products": ShoppingCart,
  "Active Products": ShoppingCart,
  "Total COGS Value": DollarSign,
  "Gross Margin": PiggyBank,
  "Active Channels": BarChart3,
};

const TOOLTIP_MAP: Record<string, string> = {
  "Total Revenue": "Sum of all order amounts across all connected channels for the selected period.",
  "Total Orders": "Count of all orders (excluding cancelled) across all connected channels.",
  "Net Profit": "Revenue minus platform fees minus estimated COGS.",
  "Avg Order Value": "Average revenue per order. Total Revenue ÷ Total Orders.",
  "MoM Growth": "Month-over-month revenue growth percentage.",
  "Best Day": "The single day with the highest total revenue in the selected period.",
  "Avg Daily Revenue": "Average revenue per day. Total Revenue ÷ Days in Period.",
  "Total Products": "Total number of products synced from all connected channels.",
  "Active Products": "Products with status 'active' (not archived or draft).",
  "Total COGS Value": "Sum of Cost of Goods Sold values entered for all products.",
  "Gross Margin": "(Revenue - COGS) ÷ Revenue × 100.",
  "Total Revenue (P&L)": "Gross revenue from all channels before any deductions.",
};

interface KPICardProps {
  data: KPIData;
}

export function KPICard({ data }: KPICardProps) {
  const Icon = ICON_MAP[data.title] ?? DollarSign;
  const tooltip = TOOLTIP_MAP[data.title];
  const sparkColor = data.change >= 0 ? "#10b981" : "#ef4444";
  const progress = data.progress;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            {data.title}
            {tooltip && (
              <Tooltip>
                <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />} />
                <TooltipContent side="top" className="max-w-[260px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </p>
          <Icon className="h-4 w-4 text-muted-foreground/40" />
        </div>

        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
          {data.formattedValue}
        </p>

        {progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-muted-foreground">
                {progress.label ?? `${progress.value.toLocaleString()} / ${progress.max.toLocaleString()}`}
              </span>
              <span className="font-semibold tabular-nums">
                {progress.max > 0 ? `${Math.min(100, (progress.value / progress.max * 100)).toFixed(1)}%` : "0%"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, progress.max > 0 ? (progress.value / progress.max) * 100 : 0)}%`,
                  backgroundColor: progress.color ?? "#f59e0b",
                }}
              />
            </div>
          </div>
        )}

        {!progress && (
          <div className="mt-2 flex items-center gap-2">
            {data.change !== 0 ? (
              <>
                <BadgeDelta value={data.change} size="sm" />
                <span className="text-[11px] text-muted-foreground">{data.changeLabel}</span>
              </>
            ) : data.changeLabel ? (
              <span className="text-[11px] text-muted-foreground">{data.changeLabel}</span>
            ) : null}
          </div>
        )}

        {data.sparklineData.length > 0 && (
          <div className="mt-3">
            <SparkChart data={data.sparklineData} color={sparkColor} height={36} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
