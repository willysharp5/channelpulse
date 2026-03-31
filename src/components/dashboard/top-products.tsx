"use client";

import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { mockTopProducts } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import Link from "next/link";

export function TopProducts() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Top Products</CardTitle>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTopProducts.map((product, i) => {
            const isPositive = product.trend >= 0;
            return (
              <div
                key={product.id}
                className="flex items-center gap-3"
              >
                <span className="text-sm font-medium text-muted-foreground w-5 text-right tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {product.title}
                    </span>
                    <div className="hidden sm:flex gap-1">
                      {product.channels.map((ch) => (
                        <ChannelBadge
                          key={ch.channel}
                          platform={ch.channel}
                          className="text-[10px] px-1.5 py-0"
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {product.totalUnits} units sold
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatCurrency(product.totalRevenue)}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isPositive ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {formatPercent(product.trend)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
