"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Eye, Ban, ShieldCheck, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminUserDetail, SubscriptionPlan } from "@/types/admin";

interface PlanLimits {
  channels: number;
  ordersPerMonth: number;
}

interface PlanOption {
  id: string;
  name: string;
}

interface Props {
  user: AdminUserDetail;
  planLimits: PlanLimits;
  availablePlans: PlanOption[];
}

export function UserDetailClient({ user, planLimits, availablePlans }: Props) {
  const router = useRouter();
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [tourSeen, setTourSeen] = useState(user.has_seen_dashboard_tour);
  const [tourUpdating, setTourUpdating] = useState(false);

  useEffect(() => {
    setTourSeen(user.has_seen_dashboard_tour);
  }, [user.has_seen_dashboard_tour]);

  const plan = (user.subscription?.plan ?? "free") as SubscriptionPlan;
  const limits = planLimits;

  async function handleImpersonate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(`Now viewing as ${user.full_name ?? user.email}`);
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Failed to start impersonation");
    } finally {
      setLoading(false);
    }
  }

  async function handleBan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason }),
      });
      if (!res.ok) throw new Error();
      toast.success("User has been banned");
      setBanDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to ban user");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("User has been unbanned");
      router.refresh();
    } catch {
      toast.error("Failed to unban user");
    } finally {
      setLoading(false);
    }
  }

  async function patchDashboardTour(hasSeen: boolean) {
    setTourUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/tour`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_seen_dashboard_tour: hasSeen }),
      });
      if (!res.ok) throw new Error();
      setTourSeen(hasSeen);
      toast.success(
        hasSeen
          ? "Tour marked complete for this user"
          : "Tour reset — they will see it on their next Overview visit"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update dashboard tour");
    } finally {
      setTourUpdating(false);
    }
  }

  return (
    <>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to Users
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user.full_name ?? "Unnamed User"}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleImpersonate}
            disabled={loading}
          >
            <Eye className="mr-2 size-4" />
            Impersonate
          </Button>
          {user.status === "active" ? (
            <Button
              variant="destructive"
              onClick={() => setBanDialogOpen(true)}
              disabled={loading || user.role === "super_admin"}
            >
              <Ban className="mr-2 size-4" />
              Ban User
            </Button>
          ) : (
            <Button variant="outline" onClick={handleUnban} disabled={loading}>
              <ShieldCheck className="mr-2 size-4" />
              Unban User
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="User ID" value={user.id} mono />
            <Row label="Email" value={user.email} />
            <Row label="Name" value={user.full_name ?? "—"} />
            <Row label="Role" value={user.role === "super_admin" ? "Super Admin" : "User"} />
            <Row
              label="Status"
              value={
                <Badge
                  variant={user.status === "active" ? "default" : "destructive"}
                  className={
                    user.status === "active"
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      : ""
                  }
                >
                  {user.status}
                </Badge>
              }
            />
            <Row
              label="Joined"
              value={format(parseISO(user.created_at), "MMMM d, yyyy")}
            />
            {user.banned_at && (
              <>
                <Row
                  label="Banned At"
                  value={format(parseISO(user.banned_at), "MMMM d, yyyy")}
                />
                <Row label="Ban Reason" value={user.banned_reason ?? "—"} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription & Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <Select
                defaultValue={plan}
                onValueChange={async (value) => {
                  if (!value || value === plan) return;
                  try {
                    const res = await fetch(`/api/admin/users/${user.id}/plan`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ plan: value }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success(`Plan changed to ${value}`);
                    router.refresh();
                  } catch {
                    toast.error("Failed to change plan");
                  }
                }}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Changing the plan here only updates access limits. To change billing, update the subscription in{" "}
              <a
                href="https://dashboard.stripe.com/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                Stripe Dashboard →
              </a>
            </div>
            <Row
              label="Channels"
              value={
                <span className="flex items-center gap-1.5">
                  <span className={user.channels_count > limits.channels ? "text-red-600 font-semibold" : ""}>
                    {user.channels_count} connected
                  </span>
                  <span className="text-muted-foreground">
                    · limit {limits.channels === 999 ? "unlimited" : limits.channels}
                  </span>
                  {user.channels_count > limits.channels && (
                    <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                      Over limit
                    </Badge>
                  )}
                </span>
              }
            />
            <Row label="Total Orders" value={formatNumber(user.orders_count)} />
            <Row label="Total Revenue" value={formatCurrency(user.total_revenue)} />
            {user.subscription?.current_period_end && (
              <Row
                label="Current Period Ends"
                value={format(
                  parseISO(user.subscription.current_period_end),
                  "MMM d, yyyy"
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {user.organization && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Name" value={user.organization.name} />
            <Row label="Org ID" value={user.organization.id} mono />
            <Row
              label="Onboarding"
              value={
                user.organization.onboarding_completed
                  ? "Completed"
                  : "In Progress"
              }
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <CardTitle className="text-base">Dashboard tour</CardTitle>
          </div>
          <CardDescription>
            Overview guided walkthrough (KPIs, chart, channels, date range). Reset so this user sees it
            again, or mark complete if they should not see it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            label="Status"
            value={
              tourSeen ? (
                <Badge variant="secondary" className="font-normal">
                  Completed or skipped
                </Badge>
              ) : (
                <Badge className="bg-amber-100 font-normal text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100">
                  Pending — shows on next Overview visit
                </Badge>
              )
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tourUpdating || !tourSeen}
              onClick={() => void patchDashboardTour(false)}
            >
              {tourUpdating ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              Reset tour for user
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tourUpdating || tourSeen}
              onClick={() => void patchDashboardTour(true)}
            >
              {tourUpdating ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              Mark tour complete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              This will prevent {user.email} from accessing ChannelPulse. You can
              unban them later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason</label>
            <Input
              placeholder="Enter ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={loading}
            >
              {loading ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
