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

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();
  const signupData = await getSignupTimeline(30);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage users, monitor subscriptions, and oversee platform health.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} active`}
          icon={Users}
        />
        <StatCard
          title="Organizations"
          value={stats.totalOrganizations}
          icon={Building2}
        />
        <StatCard
          title="Banned Users"
          value={stats.bannedUsers}
          icon={UserX}
        />
        <StatCard
          title="Channels Connected"
          value={stats.totalChannels}
          icon={Link2}
        />
      </div>

      <h2 className="text-lg font-semibold">Subscription Metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={CreditCard}
        />
        <StatCard
          title="Est. MRR"
          value={`$${stats.mrr.toLocaleString()}`}
          subtitle="Monthly recurring revenue"
          icon={DollarSign}
        />
        <StatCard
          title="New Users (7d)"
          value={stats.newUsersLast7d}
          icon={UserPlus}
        />
        <StatCard
          title="Cancelled (30d)"
          value={stats.cancelledLast30d}
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Signups (30 days)</CardTitle>
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
                <span className="text-muted-foreground">New Users (30d)</span>
                <span className="font-medium">{stats.newUsersLast30d}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
