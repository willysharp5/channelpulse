import { getSubscriptionsList, getAdminDashboardStats } from "@/lib/admin/queries";
import { SubscriptionsClient } from "@/components/admin/subscriptions-table";
import { StatCard } from "@/components/admin/stat-card";
import { CreditCard, XCircle, AlertTriangle, DollarSign } from "lucide-react";
import { parseTableDateRangeSearchParams } from "@/lib/table-date-range";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const first = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const tableDate = parseTableDateRangeSearchParams(raw);
  const page = Math.max(1, parseInt(first("page") ?? "1", 10) || 1);

  const [listResult, stats] = await Promise.all([
    getSubscriptionsList({
      search: first("search"),
      status: first("status"),
      plan: first("plan"),
      range: tableDate.range,
      dateFrom: tableDate.dateFrom,
      dateTo: tableDate.dateTo,
      page,
    }),
    getAdminDashboardStats({ days: 30 }),
  ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
        <p className="text-muted-foreground">Monitor and manage user subscriptions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon={CreditCard} />
        <StatCard title="Cancelled (30d)" value={stats.cancelledInPeriod} icon={XCircle} />
        <StatCard title="Failed Payments" value={0} icon={AlertTriangle} />
        <StatCard
          title="Est. MRR"
          value={`$${stats.mrr.toLocaleString()}`}
          subtitle="Monthly recurring revenue"
          icon={DollarSign}
        />
      </div>

      <SubscriptionsClient
        subscriptions={listResult.subscriptions}
        total={listResult.total}
        effectivePage={listResult.effectivePage}
        requestedPage={page}
      />
    </div>
  );
}
