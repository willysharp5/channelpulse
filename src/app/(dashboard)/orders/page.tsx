import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { OrdersTable } from "@/components/orders/orders-table";
import { getAllOrders } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";
import { PLAN_LIMITS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [user, orders] = await Promise.all([getSession(), getAllOrders()]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const totalProfit = orders.reduce((s, o) => s + Number(o.net_profit ?? 0), 0);
  const totalFees = orders.reduce((s, o) => s + Number(o.platform_fees ?? 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const plan = "free" as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const netRevenue = totalRevenue - totalFees;
  const categoryData = [
    { label: "Net Revenue", value: Math.max(netRevenue - totalProfit, 0), color: "#10b981" },
    { label: "Platform Fees", value: totalFees, color: "#f97316" },
    { label: "Net Profit", value: Math.max(totalProfit, 0), color: "#6366f1" },
  ].filter((d) => d.value > 0);

  return (
    <>
      <Header title="Orders" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            data={{
              title: "Total Orders",
              value: totalOrders,
              formattedValue: totalOrders.toLocaleString(),
              change: 0,
              changeLabel: "",
              sparklineData: [],
              progress: {
                value: totalOrders,
                max: limits.ordersPerMonth,
                label: `${totalOrders.toLocaleString()} / ${limits.ordersPerMonth.toLocaleString()} plan limit`,
                color: totalOrders > limits.ordersPerMonth * 0.9 ? "#ef4444" : "#f59e0b",
              },
            }}
          />
          <KPICard
            data={{
              title: "Total Revenue",
              value: totalRevenue,
              formattedValue: formatCurrency(totalRevenue),
              change: 0,
              changeLabel: "",
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Avg Order Value",
              value: avgOrderValue,
              formattedValue: formatCurrency(avgOrderValue),
              change: 0,
              changeLabel: "",
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Net Profit",
              value: totalProfit,
              formattedValue: formatCurrency(totalProfit),
              change: 0,
              changeLabel: "",
              sparklineData: [],
              progress: {
                value: Math.abs(profitMargin),
                max: 100,
                label: `${profitMargin.toFixed(1)}% profit margin`,
                color: profitMargin >= 20 ? "#10b981" : profitMargin >= 0 ? "#f59e0b" : "#ef4444",
              },
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium tabular-nums">{formatCurrency(totalRevenue)}</span>
              </div>
              <CategoryBar data={categoryData} />
            </div>
          </CardContent>
        </Card>

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
