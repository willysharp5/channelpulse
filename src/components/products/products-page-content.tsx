"use client";

import { useState, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { ProductsTable } from "./products-table";
import { CogsImport } from "./cogs-import";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { KPIData } from "@/types";

interface Product {
  id: string;
  title: string;
  sku: string | null;
  image_url: string | null;
  cogs: number | null;
  category: string | null;
  status: string | null;
  unitsSold: number;
  revenue: number;
  channelLabel: string;
  salesPlatform: string;
}

interface ProductsPageContentProps {
  initialProducts: Product[];
}

export function ProductsPageContent({ initialProducts }: ProductsPageContentProps) {
  const [products, setProducts] = useState(initialProducts);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === "active").length;
  const draftProducts = products.filter((p) => p.status === "draft").length;
  const archivedProducts = products.filter((p) => p.status === "archived").length;
  const inactiveProducts = totalProducts - activeProducts;
  const totalCogs = products.reduce((s, p) => s + Number(p.cogs ?? 0), 0);

  const kpis: KPIData[] = [
    {
      title: "Total Products",
      value: totalProducts,
      formattedValue: formatNumber(totalProducts),
      change: 0,
      changeLabel: `${activeProducts} active, ${draftProducts} draft, ${archivedProducts} archived`,
      sparklineData: [],
    },
    {
      title: "Active Products",
      value: activeProducts,
      formattedValue: formatNumber(activeProducts),
      change: 0,
      changeLabel: totalProducts > 0
        ? `${((activeProducts / totalProducts) * 100).toFixed(0)}% of catalog`
        : "",
      sparklineData: [],
    },
    {
      title: "Total COGS Value",
      value: totalCogs,
      formattedValue: formatCurrency(totalCogs),
      change: 0,
      changeLabel: "",
      sparklineData: [],
    },
  ];

  const statusBreakdown = [
    { label: "Active", value: activeProducts, color: "#10b981" },
    { label: "Draft", value: draftProducts, color: "#f59e0b" },
    { label: "Archived", value: archivedProducts, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const handleCogsUpdate = useCallback((productId: string, newCogs: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, cogs: newCogs } : p))
    );
  }, []);

  const handleBatchImportComplete = useCallback(() => {
    fetch("/api/products/list")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProducts(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} data={kpi} />
        ))}
      </div>

      {statusBreakdown.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Product Status Breakdown
            </p>
            <CategoryBar data={statusBreakdown} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">All Products</CardTitle>
          <CogsImport products={products} onImportComplete={handleBatchImportComplete} />
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-9 w-full max-w-sm" />
                <Skeleton className="h-[300px] w-full" />
              </div>
            }
          >
            <ProductsTable products={products} onCogsUpdate={handleCogsUpdate} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
