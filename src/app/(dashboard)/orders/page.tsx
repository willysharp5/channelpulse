import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersTable } from "@/components/orders/orders-table";
import { getAllOrders } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [user, orders] = await Promise.all([getSession(), getAllOrders()]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const totalProfit = orders.reduce((s, o) => s + Number(o.net_profit ?? 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <>
      <Header title="Orders" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Order Value
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit
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
