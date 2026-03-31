"use client";

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, PiggyBank, BarChart3, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatPercent } from "@/lib/formatters";
import type { KPIData } from "@/types";

const ICON_MAP: Record<string, LucideIcon> = {
  "Total Revenue": DollarSign,
  "Total Orders": ShoppingCart,
  "Net Profit": PiggyBank,
  "Avg Order Value": BarChart3,
};

interface KPICardProps {
  data: KPIData;
}

export function KPICard({ data }: KPICardProps) {
  const Icon = ICON_MAP[data.title] ?? DollarSign;
  const isPositive = data.change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {data.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">
          {data.formattedValue}
        </div>
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
        {data.sparklineData.length > 0 && (
          <div className="mt-3">
            <Sparkline data={data.sparklineData} positive={isPositive} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
