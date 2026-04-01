"use client";

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, PiggyBank, BarChart3, Info, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkline } from "@/components/charts/sparkline";
import { formatPercent } from "@/lib/formatters";
import type { KPIData } from "@/types";

const ICON_MAP: Record<string, LucideIcon> = {
  "Total Revenue": DollarSign,
  "Total Orders": ShoppingCart,
  "Net Profit": PiggyBank,
  "Avg Order Value": BarChart3,
  "MoM Growth": TrendingUp,
  "Best Day": BarChart3,
  "Avg Daily Revenue": DollarSign,
  "Total Products": ShoppingCart,
  "Active Products": ShoppingCart,
  "Total COGS Value": DollarSign,
  "Gross Margin": PiggyBank,
};

const TOOLTIP_MAP: Record<string, string> = {
  "Total Revenue": "Sum of all order amounts (total_amount) across all connected channels for the selected period. Includes tax and shipping.",
  "Total Orders": "Count of all orders (excluding cancelled) across all connected channels for the selected period.",
  "Net Profit": "Revenue minus platform fees minus estimated COGS. Calculated as: Total Revenue - Platform Fees - Cost of Goods Sold.",
  "Avg Order Value": "Average revenue per order. Calculated as: Total Revenue ÷ Total Orders.",
  "MoM Growth": "Month-over-month revenue growth. Calculated as: (Current Period Revenue - Previous Period Revenue) ÷ Previous Period Revenue × 100.",
  "Best Day": "The single day with the highest total revenue in the selected period.",
  "Avg Daily Revenue": "Average revenue per day. Calculated as: Total Revenue ÷ Number of Days in Period.",
  "Total Products": "Total number of products synced from all connected channels.",
  "Active Products": "Products with status 'active' (not archived or draft).",
  "Total COGS Value": "Sum of Cost of Goods Sold values entered for all products.",
  "Gross Margin": "Percentage of revenue remaining after COGS. Calculated as: (Revenue - COGS) ÷ Revenue × 100.",
  "Total Revenue (P&L)": "Gross revenue from all channels before any deductions.",
};

interface KPICardProps {
  data: KPIData;
}

export function KPICard({ data }: KPICardProps) {
  const Icon = ICON_MAP[data.title] ?? DollarSign;
  const isPositive = data.change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const tooltip = TOOLTIP_MAP[data.title];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {data.title}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />} />
              <TooltipContent side="top" className="max-w-[260px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">
          {data.formattedValue}
        </div>
        {data.change !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon
              className={`h-3.5 w-3.5 ${
                isPositive ? "text-emerald-500" : "text-red-500"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isPositive ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {formatPercent(data.change)}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.changeLabel}
            </span>
          </div>
        )}
        {data.changeLabel && data.change === 0 && (
          <div className="mt-1">
            <span className="text-xs text-muted-foreground">{data.changeLabel}</span>
          </div>
        )}
        {data.sparklineData.length > 0 && (
          <div className="mt-3">
            <Sparkline data={data.sparklineData} positive={isPositive} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
