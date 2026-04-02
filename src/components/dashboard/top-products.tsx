"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { ChannelBadge } from "@/components/layout/channel-badge";
import type { Platform } from "@/types";
import type { TopProductSale } from "@/lib/queries";
import Link from "next/link";

interface TopProductsProps {
  products: TopProductSale[];
}

export function TopProducts({ products }: TopProductsProps) {
  const displayProducts = products.slice(0, 5);
  const maxRev = Math.max(...displayProducts.map((p) => p.revenue), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Top Products</CardTitle>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {displayProducts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No sales in this range yet. Sync orders to see top SKUs.
          </p>
        ) : (
          <div className="space-y-4">
            {displayProducts.map((product) => {
              const pct = maxRev > 0 ? Math.round((product.revenue / maxRev) * 100) : 0;
              return (
                <div key={`${product.rank}-${product.title}-${product.sku ?? ""}`} className="flex items-center gap-3">
                  <span className="w-5 text-right text-sm font-medium tabular-nums text-muted-foreground">
                    {product.rank}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.title}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <ChannelBadge platform={product.platform as Platform} className="text-[10px] px-1.5 py-0" />
                      {product.sku ? (
                        <span className="font-mono text-[10px] text-muted-foreground">{product.sku}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500/90 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(product.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {product.unitsSold.toLocaleString()} units
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
