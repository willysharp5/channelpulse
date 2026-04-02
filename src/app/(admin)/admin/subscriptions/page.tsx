import { getSubscriptions, getAdminDashboardStats } from "@/lib/admin/queries";
import { SubscriptionsClient } from "@/components/admin/subscriptions-table";
import { StatCard } from "@/components/admin/stat-card";
import { CreditCard, XCircle, AlertTriangle, DollarSign } from "lucide-react";

interface Props {
  searchParams: Promise<{ search?: string; status?: string; plan?: string }>;
}

export default async function AdminSubscriptionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [subscriptions, stats] = await Promise.all([
    getSubscriptions(params.search, params.status, params.plan),
    getAdminDashboardStats(),
  ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Subscription Management
        </h1>
        <p className="text-muted-foreground">
          Monitor and manage user subscriptions
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={CreditCard}
        />
        <StatCard
          title="Cancelled (30d)"
          value={stats.cancelledLast30d}
          icon={XCircle}
        />
        <StatCard
          title="Failed Payments"
          value={0}
          icon={AlertTriangle}
        />
        <StatCard
          title="Est. MRR"
          value={`$${stats.mrr.toLocaleString()}`}
          subtitle="Monthly recurring revenue"
          icon={DollarSign}
        />
      </div>

      <SubscriptionsClient
        subscriptions={subscriptions}
        initialSearch={params.search}
        initialStatus={params.status}
        initialPlan={params.plan}
      />
    </div>
  );
}
