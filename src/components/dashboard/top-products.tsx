"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";

interface TopProductItem {
  id: string;
  title: string;
  sku: string | null;
  cogs: number | null;
  status: string | null;
}

interface TopProductsProps {
  products: TopProductItem[];
}

export function TopProducts({ products }: TopProductsProps) {
  const displayProducts = products.slice(0, 5);

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
        {displayProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No products synced yet.
          </p>
        ) : (
          <div className="space-y-4">
            {displayProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-5 text-right tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {product.title}
                  </span>
                  {product.sku && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {product.sku}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      product.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
