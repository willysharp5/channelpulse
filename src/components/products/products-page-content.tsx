"use client";

import { useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ProductsTable } from "./products-table";
import type { KPIData } from "@/types";
import type { ProductsCatalogSummary, ProductsPageResult } from "@/lib/products-list";

interface ProductsPageContentProps {
  catalogSummary: ProductsCatalogSummary;
  pageData: ProductsPageResult;
  requestedPage: number;
}

export function ProductsPageContent({
  catalogSummary,
  pageData,
  requestedPage,
}: ProductsPageContentProps) {
  const router = useRouter();

  const totalProducts = catalogSummary.total;
  const activeProducts = catalogSummary.active;
  const draftProducts = catalogSummary.draft;
  const archivedProducts = catalogSummary.archived;
  const totalCogs = catalogSummary.totalCogs;

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
      changeLabel:
        totalProducts > 0 ? `${((activeProducts / totalProducts) * 100).toFixed(0)}% of catalog` : "",
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

  const handleCogsUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleBatchImportComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex-1 min-w-0 max-w-full space-y-6 p-6">
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} data={kpi} />
        ))}
      </div>

      {statusBreakdown.length > 0 && (
        <Card className="min-w-0 max-w-full">
          <CardContent className="min-w-0 pt-5 pb-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Product Status Breakdown</p>
            <CategoryBar data={statusBreakdown} formatValue={formatNumber} amountLabel="Products" />
          </CardContent>
        </Card>
      )}

      <Card className="min-w-0 max-w-full">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">All Products</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full">
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-9 w-full max-w-sm" />
                <Skeleton className="h-[300px] w-full" />
              </div>
            }
          >
            <ProductsTable
              rows={pageData.rows}
              totalCount={pageData.totalCount}
              pageableTotalCount={pageData.pageableTotalCount}
              effectivePage={pageData.effectivePage}
              requestedPage={requestedPage}
              platformOptions={pageData.platformOptions}
              sortTruncated={pageData.sortTruncated}
              onCogsUpdate={handleCogsUpdate}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
