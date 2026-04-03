import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { ExportButton } from "@/components/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { OrdersTable } from "@/components/orders/orders-table";
import { getUserPlan } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";
import { getOrdersPage, getOrdersOrgTotalCount, parseOrdersListParams } from "@/lib/orders-list";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseOrdersListParams(sp);
  const [user, orderData, orgOrderCount, { limits }] = await Promise.all([
    getSession(),
    getOrdersPage(params),
    getOrdersOrgTotalCount(),
    getUserPlan(),
  ]);

  const totalOrders = orderData.totalCount;
  const totalRevenue = orderData.totalRevenue;
  const totalProfit = orderData.totalProfit;
  const totalFees = orderData.totalFees;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
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
        <div className="flex items-center justify-between">
          <div />
          <ExportButton endpoint="/api/export/orders" label="Export Orders" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            data={{
              title: "Total Orders",
              value: orgOrderCount,
              formattedValue: orgOrderCount.toLocaleString(),
              change: 0,
              changeLabel: "",
              sparklineData: [],
              progress: {
                value: orgOrderCount,
                max: limits.ordersPerMonth,
                label: `${orgOrderCount.toLocaleString()} / ${limits.ordersPerMonth.toLocaleString()} plan limit`,
                color: orgOrderCount > limits.ordersPerMonth * 0.9 ? "#ef4444" : "#f59e0b",
              },
            }}
          />
          <KPICard
            data={{
              title: "Filtered revenue",
              value: totalRevenue,
              formattedValue: formatCurrency(totalRevenue),
              change: 0,
              changeLabel: "Matches table filters",
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Avg order (filtered)",
              value: avgOrderValue,
              formattedValue: formatCurrency(avgOrderValue),
              change: 0,
              changeLabel: "",
              sparklineData: [],
            }}
          />
          <KPICard
            data={{
              title: "Net profit (filtered)",
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
            <CardTitle className="text-base font-semibold">Revenue Breakdown (filtered)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium tabular-nums">{formatCurrency(totalRevenue)}</span>
              </div>
              <CategoryBar data={categoryData} amountLabel="Amount" />
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
              <OrdersTable
                rows={orderData.rows}
                totalCount={orderData.totalCount}
                totalRevenue={orderData.totalRevenue}
                effectivePage={orderData.effectivePage}
                requestedPage={params.page}
                platformOptions={orderData.platformOptions}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
