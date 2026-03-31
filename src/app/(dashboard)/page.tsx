import { Header } from "@/components/layout/header";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelBreakdown } from "@/components/charts/channel-breakdown";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentOrders } from "@/components/dashboard/recent-orders";

export default function OverviewPage() {
  return (
    <>
      <Header title="Overview" />
      <div className="flex-1 space-y-6 p-6">
        <OverviewCards />

        <RevenueChart />

        <div className="grid gap-6 lg:grid-cols-2">
          <ChannelBreakdown />
          <TopProducts />
        </div>

        <RecentOrders />
      </div>
    </>
  );
}
