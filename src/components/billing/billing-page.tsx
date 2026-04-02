"use client";

import { useState } from "react";
import { RiCheckFill } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PLAN_LIMITS } from "@/lib/constants";

interface Plan {
  key: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

interface Subscription {
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
}

interface Props {
  plans: Plan[];
  currentPlan: string;
  subscription: Subscription | null;
  freeFeatures: string[];
}

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  starter: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20",
  },
  growth: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  scale: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
};

function TierBadge({ tier }: { tier: string }) {
  const colors = TIER_COLORS[tier] ?? {
    bg: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-400",
    ring: "ring-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
    >
      <span
        className={`size-1.5 rounded-full ${colors.text.includes("blue") ? "bg-blue-500" : colors.text.includes("amber") ? "bg-amber-500" : "bg-violet-500"}`}
      />
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function CategoryBar({ values, className }: { values: number[]; className?: string }) {
  const colors = [
    "bg-blue-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-zinc-200 dark:bg-zinc-700",
  ];
  return (
    <div className={`flex h-2 w-full overflow-hidden rounded-full ${className ?? ""}`}>
      {values.map((value, i) => (
        <div
          key={i}
          className={`${colors[i % colors.length]} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      ))}
    </div>
  );
}

export function BillingClient({ plans, currentPlan, subscription, freeFeatures }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(null);
    }
  }

  const limits =
    PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  const channelUsagePercent = Math.min(
    (1 / Math.max(limits.channels, 1)) * 100,
    100
  );
  const orderUsagePercent = Math.min(
    (50 / Math.max(limits.ordersPerMonth, 1)) * 100,
    100
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details
        </p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Current Plan</CardTitle>
              <TierBadge tier={subscription.plan} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium capitalize">
                  {subscription.plan} Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.status === "active"
                    ? "Active"
                    : subscription.status}
                  {subscription.current_period_end &&
                    ` · Renews ${new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={loading === "portal"}
              >
                {loading === "portal" ? "Loading..." : "Manage Billing"}
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Usage this period
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Channels</span>
                  <span className="text-muted-foreground">
                    1 / {limits.channels === 999 ? "∞" : limits.channels}
                  </span>
                </div>
                <CategoryBar
                  values={[channelUsagePercent, 100 - channelUsagePercent]}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Orders</span>
                  <span className="text-muted-foreground">
                    50 /{" "}
                    {limits.ordersPerMonth >= 999999
                      ? "∞"
                      : limits.ordersPerMonth.toLocaleString()}
                  </span>
                </div>
                <CategoryBar
                  values={[orderUsagePercent, 100 - orderUsagePercent]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentPlan === "free" && !subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Current Plan</CardTitle>
              <Badge variant="outline">Free</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  {freeFeatures.join(" · ")}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Usage
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Channels</span>
                  <span className="text-muted-foreground">
                    0 / {PLAN_LIMITS.free.channels}
                  </span>
                </div>
                <CategoryBar values={[0, 100]} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Orders</span>
                  <span className="text-muted-foreground">
                    0 / {PLAN_LIMITS.free.ordersPerMonth}
                  </span>
                </div>
                <CategoryBar values={[0, 100]} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          {currentPlan === "free" ? "Upgrade your plan" : "Available plans"}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <Card
                key={plan.key}
                className={
                  plan.popular
                    ? "relative overflow-visible border-amber-500 shadow-lg shadow-amber-500/10"
                    : "relative"
                }
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-amber-500 shadow-sm">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className={`pb-4 ${plan.popular ? "pt-8" : ""}`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <TierBadge tier={plan.key} />
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold tracking-tight">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <RiCheckFill className="size-4 mt-0.5 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className={
                        plan.popular
                          ? "w-full bg-amber-500 text-white hover:bg-amber-600 border-amber-500"
                          : "w-full"
                      }
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={loading === plan.key}
                    >
                      {loading === plan.key
                        ? "Loading..."
                        : currentPlan === "free"
                          ? `Upgrade to ${plan.name}`
                          : `Switch to ${plan.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
