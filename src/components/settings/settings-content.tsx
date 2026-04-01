"use client";

import { useState } from "react";
import { CreditCard, User, Link2, Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

interface SettingsContentProps {
  email: string;
  businessName: string;
  plan: string;
  channels: Array<{
    id: string;
    platform: string;
    name: string;
    status: string | null;
    created_at: string | null;
  }>;
}

export function SettingsContent({ email, businessName, plan, channels }: SettingsContentProps) {
  const [tab, setTab] = useState("channels");

  return (
    <div className="flex-1 space-y-6 p-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="channels" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Channels
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Channels</CardTitle>
              <CardDescription>Manage your marketplace connections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.map((ch) => {
                const config = CHANNEL_CONFIG[ch.platform as Platform];
                return (
                  <div key={ch.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `${config?.color}15` }}
                      >
                        {config?.icon}
                      </div>
                      <div>
                        <p className="font-medium">{ch.name}</p>
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
                            ? "border-emerald-200 text-emerald-700"
                            : ""
                        }
                      >
                        {ch.status === "active" ? "Active" : ch.status}
                      </Badge>
                      <Button variant="outline" size="sm">Disconnect</Button>
                    </div>
                  </div>
                );
              })}
              {channels.length === 0 && (
                <p className="text-sm text-muted-foreground">No channels connected yet.</p>
              )}
              <Separator />
              <ConnectShopifySection hasShopify={channels.some((ch) => ch.platform === "shopify")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You&apos;re on the <span className="font-medium capitalize">{plan}</span> plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { name: "free", price: "$0", features: ["1 channel", "100 orders/mo"] },
                  { name: "starter", price: "$19", features: ["3 channels", "5,000 orders/mo"] },
                  { name: "growth", price: "$39", features: ["5 channels", "25,000 orders/mo"], highlight: true },
                  { name: "scale", price: "$79", features: ["Unlimited", "Unlimited orders"] },
                ].map((p) => (
                  <div
                    key={p.name}
                    className={`rounded-lg border p-4 ${
                      p.name === plan
                        ? "border-amber-500 ring-1 ring-amber-500"
                        : p.highlight && p.name !== plan
                          ? "border-muted-foreground/20"
                          : ""
                    }`}
                  >
                    <p className="font-semibold capitalize">{p.name}</p>
                    <p className="text-2xl font-bold mt-1">
                      {p.price}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {p.features.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                    <Button
                      variant={p.name === plan ? "outline" : "default"}
                      className={`mt-4 w-full ${p.name !== plan ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                      size="sm"
                      disabled={p.name === plan}
                    >
                      {p.name === plan ? "Current" : "Upgrade"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what alerts you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: "sync-errors", label: "Sync Errors", desc: "Get notified when a channel sync fails", default: true },
                { id: "revenue-drops", label: "Revenue Drops", desc: "Alert when daily revenue drops more than 20%", default: true },
                { id: "weekly-digest", label: "Weekly Digest", desc: "Email summary of your weekly performance", default: false },
                { id: "low-stock", label: "Low Stock Alerts", desc: "Notify when inventory falls below threshold", default: true },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={item.id} className="font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch id={item.id} defaultChecked={item.default} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Manage your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input id="name" defaultValue={businessName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={email} disabled />
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
    if (!domain.includes(".myshopify.com")) {
      domain = domain.replace(/\.myshopify\.com$/, "") + ".myshopify.com";
    }
    setConnecting(true);
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">Add a new channel</p>
      {!hasShopify && (
        <div className="mb-4 rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CHANNEL_CONFIG.shopify.icon}</span>
            <span className="font-medium">Connect Shopify</span>
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
              className="flex-1"
            />
            <Button
              onClick={handleConnectShopify}
              disabled={!shopDomain.trim() || connecting}
              className="bg-[#96BF48] hover:bg-[#7ea03c] text-white"
            >
              {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {(["amazon", "ebay", "etsy", "woocommerce"] as const).map((platform) => (
          <Button key={platform} variant="outline" className="gap-2" disabled>
            <span>{CHANNEL_CONFIG[platform].icon}</span>
            {CHANNEL_CONFIG[platform].label}
            <Badge variant="secondary" className="text-[10px]">
              {platform === "amazon" ? "Soon" : "Soon"}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
