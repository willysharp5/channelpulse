"use client";

import { useState, useCallback, Suspense } from "react";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductsTable } from "./products-table";
import { CogsImport } from "./cogs-import";
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  title: string;
  sku: string | null;
  image_url: string | null;
  cogs: number | null;
  category: string | null;
  status: string | null;
}

function KpiTip({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />} />
      <TooltipContent side="top" className="max-w-[260px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
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
  const totalCogs = products.reduce((s, p) => s + Number(p.cogs ?? 0), 0);

  const handleCogsUpdate = useCallback((productId: string, newCogs: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, cogs: newCogs } : p))
    );
  }, []);

  const handleBatchImportComplete = useCallback(() => {
    // Re-fetch products after CSV import
    fetch("/api/products/list")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data) && data.length > 0) setProducts(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Total Products
              <KpiTip tip={`Total products synced from all channels. ${activeProducts} active, ${draftProducts} draft, ${archivedProducts} archived.`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Active Products
              <KpiTip tip="Products with status 'active' — live and available for sale on your connected channels." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Total COGS (Cost of Goods)
              <KpiTip tip={`Sum of Cost of Goods Sold for all products. Updates in real-time as you edit. Currently ${formatCurrency(totalCogs)}.`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(totalCogs)}
            </div>
          </CardContent>
        </Card>
      </div>

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
