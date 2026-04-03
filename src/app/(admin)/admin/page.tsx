import {
  Users,
  Building2,
  CreditCard,
  DollarSign,
  UserPlus,
  Link2,
  UserX,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { getAdminDashboardStats, getSignupTimeline } from "@/lib/admin/queries";
import { AdminSignupChart } from "@/components/admin/signup-chart";
import { AdminDashboardRangePicker } from "@/components/admin/admin-dashboard-range-picker";
import { DATE_RANGE_PRESETS, rangeToDays } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const dateParams =
    params.from && params.to
      ? { from: params.from, to: params.to }
      : { days: rangeToDays(params.range ?? null) };
  const rangeLabel =
    params.from && params.to
      ? `${params.from} to ${params.to}`
      : DATE_RANGE_PRESETS.find((p) => p.value === (params.range ?? "30d"))?.label ?? "Last 30 days";

  const [stats, signupData] = await Promise.all([
    getAdminDashboardStats(dateParams),
    getSignupTimeline(dateParams),
  ]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, monitor subscriptions, and oversee platform health.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <span className="text-xs font-medium text-muted-foreground">Reporting period</span>
          <AdminDashboardRangePicker />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} subtitle={`${stats.activeUsers} active`} icon={Users} />
        <StatCard title="Organizations" value={stats.totalOrganizations} icon={Building2} />
        <StatCard title="Banned Users" value={stats.bannedUsers} icon={UserX} />
        <StatCard title="Channels Connected" value={stats.totalChannels} icon={Link2} />
      </div>

      <h2 className="text-lg font-semibold">Subscription Metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon={CreditCard} />
        <StatCard
          title="Est. MRR"
          value={`$${stats.mrr.toLocaleString()}`}
          subtitle="Monthly recurring revenue"
          icon={DollarSign}
        />
        <StatCard
          title="New signups"
          value={stats.newUsersInPeriod}
          subtitle={rangeLabel}
          icon={UserPlus}
        />
        <StatCard
          title="Cancelled subs"
          value={stats.cancelledInPeriod}
          subtitle={rangeLabel}
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New signups ({rangeLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminSignupChart data={signupData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Database Status</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-medium">{stats.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Subscriptions</span>
                <span className="font-medium">{stats.activeSubscriptions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Organizations</span>
                <span className="font-medium">{stats.totalOrganizations}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
