"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  RiLink,
  RiBankCardFill,
  RiNotification3Fill,
  RiUserFill,
  RiArrowRightUpLine,
  RiShieldCheckFill,
  RiSparklingFill,
} from "@remixicon/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_CONFIG, PLAN_LIMITS, PLAN_PRICES } from "@/lib/constants";
import type { Platform } from "@/types";
import { mergeNotificationPrefs } from "@/lib/alerts";

type NotificationPrefsState = ReturnType<typeof mergeNotificationPrefs>;

interface SettingsContentProps {
  email: string;
  businessName: string;
  plan: string;
  notificationPrefs: NotificationPrefsState;
  channels: Array<{
    id: string;
    platform: string;
    name: string;
    status: string | null;
    created_at: string | null;
  }>;
}

export function SettingsContent({ email, businessName, plan, channels, notificationPrefs: initialPrefs }: SettingsContentProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [tab, setTab] = useState(() => {
    if (tabFromUrl === "notifications" || tabFromUrl === "billing" || tabFromUrl === "account") {
      return tabFromUrl;
    }
    return "channels";
  });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "notifications" || t === "billing" || t === "account") setTab(t);
  }, [searchParams]);

  const [notifPrefs, setNotifPrefs] = useState(initialPrefs);
  const [savingNotif, setSavingNotif] = useState(false);

  const saveNotif = useCallback((patch: Partial<NotificationPrefsState>) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, ...patch };
      void (async () => {
        setSavingNotif(true);
        try {
          await fetch("/api/settings/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });
        } catch {
          /* ignore */
        } finally {
          setSavingNotif(false);
        }
      })();
      return next;
    });
  }, []);

  const planLimits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const planPrice = PLAN_PRICES[plan] ?? 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="channels" className="gap-1.5">
            <RiLink className="h-3.5 w-3.5" /> Channels
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <RiBankCardFill className="h-3.5 w-3.5" /> Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <RiNotification3Fill className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <RiUserFill className="h-3.5 w-3.5" /> Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Channels</CardTitle>
              <CardDescription>Manage your marketplace connections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {channels.map((ch) => {
                const config = CHANNEL_CONFIG[ch.platform as Platform];
                return (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: config?.color }}
                      >
                        {config?.abbr}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{ch.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Connected {ch.created_at ? new Date(ch.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          ch.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            : ""
                        }
                      >
                        {ch.status === "active" ? "Active" : ch.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="text-xs">
                        Disconnect
                      </Button>
                    </div>
                  </div>
                );
              })}
              {channels.length === 0 && (
                <p className="text-sm text-muted-foreground">No channels connected yet.</p>
              )}
              <Separator className="my-4" />
              <ConnectShopifySection hasShopify={channels.some((ch) => ch.platform === "shopify")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription className="mt-1">
                    You&apos;re on the{" "}
                    <span className="font-semibold capitalize text-foreground">{plan}</span> plan.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                >
                  <RiSparklingFill className="mr-1 h-3 w-3" />
                  {plan === "free" ? "Free Tier" : "Active"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">${planPrice}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-background p-3">
                    <RiLink className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Channels</p>
                      <p className="text-sm font-semibold">
                        {planLimits?.channels === 999 ? "Unlimited" : `${planLimits?.channels ?? 1} channel${(planLimits?.channels ?? 1) > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-background p-3">
                    <RiShieldCheckFill className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Orders / month</p>
                      <p className="text-sm font-semibold">
                        {planLimits?.ordersPerMonth === 999999
                          ? "Unlimited"
                          : `${(planLimits?.ordersPerMonth ?? 100).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Link href="/billing" className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600">
                Manage Billing <RiArrowRightUpLine className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          {savingNotif && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving preferences…
            </p>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alerts</CardTitle>
              <CardDescription>Get notified about critical events in real time.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-0">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div>
                    <Label htmlFor="sync_errors" className="text-sm font-medium">Sync errors</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Channel sync failures and connection issues</p>
                  </div>
                </div>
                <Switch
                  id="sync_errors"
                  checked={notifPrefs.sync_errors}
                  onCheckedChange={(v) => void saveNotif({ sync_errors: v })}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div>
                    <Label htmlFor="revenue_drops" className="text-sm font-medium">Revenue drops</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">When daily revenue drops sharply vs previous day</p>
                  </div>
                </div>
                <Switch
                  id="revenue_drops"
                  checked={notifPrefs.revenue_drops}
                  onCheckedChange={(v) => void saveNotif({ revenue_drops: v })}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <div>
                    <Label htmlFor="low_stock" className="text-sm font-medium">Low stock</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">When inventory is at or below your threshold</p>
                  </div>
                </div>
                <Switch
                  id="low_stock"
                  checked={notifPrefs.low_stock}
                  onCheckedChange={(v) => void saveNotif({ low_stock: v })}
                />
              </div>
              <div className="px-6 py-4 border-b space-y-2">
                <Label className="text-xs">Low stock threshold (units)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-9 max-w-[120px]"
                  value={notifPrefs.low_stock_threshold}
                  onChange={(e) => {
                    const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setNotifPrefs((p) => ({ ...p, low_stock_threshold: n }));
                  }}
                  onBlur={(e) => {
                    const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                    void saveNotif({ low_stock_threshold: n });
                  }}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <div>
                    <Label htmlFor="order_spikes" className="text-sm font-medium">Order spikes</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Unusual order volume</p>
                  </div>
                </div>
                <Switch
                  id="order_spikes"
                  checked={notifPrefs.order_spikes}
                  onCheckedChange={(v) => void saveNotif({ order_spikes: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reports &amp; Digests</CardTitle>
              <CardDescription>Scheduled summaries (email digest not yet wired).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <Label htmlFor="weekly_digest" className="text-sm font-medium">Weekly digest</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Reserved for future email</p>
                </div>
                <Switch
                  id="weekly_digest"
                  checked={notifPrefs.weekly_digest}
                  onCheckedChange={(v) => void saveNotif({ weekly_digest: v })}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <Label htmlFor="monthly_report" className="text-sm font-medium">Monthly report</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Reserved for future email</p>
                </div>
                <Switch
                  id="monthly_report"
                  checked={notifPrefs.monthly_report}
                  onCheckedChange={(v) => void saveNotif({ monthly_report: v })}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <Label htmlFor="channel_summary" className="text-sm font-medium">Channel summary</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Reserved for future email</p>
                </div>
                <Switch
                  id="channel_summary"
                  checked={notifPrefs.channel_summary}
                  onCheckedChange={(v) => void saveNotif({ channel_summary: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery</CardTitle>
              <CardDescription>How you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Future: send to your account email</p>
                </div>
                <Switch
                  id="email"
                  checked={notifPrefs.email}
                  onCheckedChange={(v) => void saveNotif({ email: v })}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <Label htmlFor="in_app" className="text-sm font-medium">In-app</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Bell icon in the dashboard</p>
                </div>
                <Switch
                  id="in_app"
                  checked={notifPrefs.in_app}
                  onCheckedChange={(v) => void saveNotif({ in_app: v })}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <Label htmlFor="browser_push" className="text-sm font-medium">Browser push</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Reserved</p>
                </div>
                <Switch
                  id="browser_push"
                  checked={notifPrefs.browser_push}
                  onCheckedChange={(v) => void saveNotif({ browser_push: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Manage your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Business Name</Label>
                <Input id="name" defaultValue={businessName} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" defaultValue={email} disabled className="h-10" />
                <p className="text-xs text-muted-foreground">
                  Email is managed by your authentication provider.
                </p>
              </div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConnectShopifySection({ hasShopify }: { hasShopify: boolean }) {
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);

  function handleConnectShopify() {
    let domain = shopDomain.trim();
    if (!domain) return;
    domain = domain.replace(/^https?:\/\//, "").split("/")[0];
    if (!domain.includes(".myshopify.com")) {
      domain = domain + ".myshopify.com";
    }
    setConnecting(true);
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-3">Add a new channel</p>
      {!hasShopify && (
        <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: CHANNEL_CONFIG.shopify.color }}
            >
              S
            </span>
            <span className="text-sm font-semibold">Connect Shopify</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your Shopify store domain to connect via OAuth.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="your-store.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnectShopify()}
              className="flex-1 h-9"
            />
            <Button
              onClick={handleConnectShopify}
              disabled={!shopDomain.trim() || connecting}
              className="bg-[#96BF48] hover:bg-[#7ea03c] text-white"
              size="sm"
            >
              {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {(["amazon", "ebay", "etsy", "woocommerce"] as const).map((platform) => (
          <Button key={platform} variant="outline" className="gap-2 rounded-lg" disabled>
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CHANNEL_CONFIG[platform].color }}
            />
            {CHANNEL_CONFIG[platform].label}
            <Badge variant="secondary" className="text-[10px] px-1.5">
              Soon
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
