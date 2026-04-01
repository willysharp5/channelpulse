import { Suspense } from "react";
import { Info } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductsTable } from "@/components/products/products-table";
import { getProducts } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function KpiTip({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />} />
      <TooltipContent side="top" className="max-w-[260px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

export default async function ProductsPage() {
  const [user, products] = await Promise.all([getSession(), getProducts()]);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === "active").length;
  const draftProducts = products.filter((p) => p.status === "draft").length;
  const archivedProducts = products.filter((p) => p.status === "archived").length;
  const totalCogs = products.reduce((s, p) => s + Number(p.cogs ?? 0), 0);

  return (
    <>
      <Header title="Products" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total Products
                <KpiTip tip={`Total number of products synced from all connected channels. Breakdown: ${activeProducts} active, ${draftProducts} draft, ${archivedProducts} archived.`} />
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
                <KpiTip tip="Products with status 'active' — these are live and available for sale on your connected channels. Does not include draft or archived products." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total COGS Value
                <KpiTip tip={`Sum of Cost of Goods Sold for all products. Currently ${formatCurrency(totalCogs)}. Set individual product costs in the COGS column to improve profit calculations.`} />
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
          <CardHeader>
            <CardTitle className="text-base font-semibold">All Products</CardTitle>
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
              <ProductsTable products={products} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
