import { Suspense } from "react";
import { Info } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrdersTable } from "@/components/orders/orders-table";
import { getAllOrders } from "@/lib/queries";
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

export default async function OrdersPage() {
  const [user, orders] = await Promise.all([getSession(), getAllOrders()]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const totalProfit = orders.reduce((s, o) => s + Number(o.net_profit ?? 0), 0);
  const totalFees = orders.reduce((s, o) => s + Number(o.platform_fees ?? 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <>
      <Header title="Orders" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total Orders
                <KpiTip tip="Count of all orders synced from connected channels. Includes all statuses (paid, shipped, delivered). Excludes cancelled orders from revenue calculations." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total Revenue
                <KpiTip tip="Sum of all order amounts (total_amount) from connected channels. Includes tax and shipping charges." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Avg Order Value
                <KpiTip tip={`Average revenue per order. Calculated as: Total Revenue (${formatCurrency(totalRevenue)}) ÷ Total Orders (${totalOrders}) = ${formatCurrency(avgOrderValue)}.`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(avgOrderValue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Net Profit
                <KpiTip tip={`Revenue minus estimated platform fees. Calculated as: Total Revenue (${formatCurrency(totalRevenue)}) - Platform Fees (${formatCurrency(totalFees)}) = ${formatCurrency(totalProfit)}. COGS not yet deducted — set product costs in Settings.`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums ${totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(totalProfit)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full max-w-sm" />
                  <Skeleton className="h-[400px] w-full" />
                </div>
              }
            >
              <OrdersTable orders={orders} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
