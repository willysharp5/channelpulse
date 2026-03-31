"use client";

import { useState } from "react";
import { Store, CreditCard, User, Link2, Bell } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_CONFIG } from "@/lib/constants";

export default function SettingsPage() {
  const [tab, setTab] = useState("channels");

  return (
    <>
      <Header title="Settings" />
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
                <CardDescription>
                  Manage your marketplace connections.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: `${CHANNEL_CONFIG.shopify.color}15` }}>
                      {CHANNEL_CONFIG.shopify.icon}
                    </div>
                    <div>
                      <p className="font-medium">My Shopify Store</p>
                      <p className="text-xs text-muted-foreground">Connected Dec 1, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700">Active</Badge>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: `${CHANNEL_CONFIG.amazon.color}15` }}>
                      {CHANNEL_CONFIG.amazon.icon}
                    </div>
                    <div>
                      <p className="font-medium">Amazon US Marketplace</p>
                      <p className="text-xs text-muted-foreground">Connected Jan 15, 2026</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700">Active</Badge>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Add a new channel</p>
                  <div className="flex gap-2">
                    {(["ebay", "etsy", "woocommerce"] as const).map((platform) => (
                      <Button key={platform} variant="outline" className="gap-2" disabled>
                        <span>{CHANNEL_CONFIG[platform].icon}</span>
                        {CHANNEL_CONFIG[platform].label}
                        <Badge variant="secondary" className="text-[10px]">Soon</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>You&apos;re on the Free plan.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { name: "Free", price: "$0", features: ["1 channel", "100 orders/mo"] },
                    { name: "Starter", price: "$19", features: ["3 channels", "5,000 orders/mo"] },
                    { name: "Growth", price: "$39", features: ["5 channels", "25,000 orders/mo"], highlight: true },
                    { name: "Scale", price: "$79", features: ["Unlimited", "Unlimited orders"] },
                  ].map((plan) => (
                    <div
                      key={plan.name}
                      className={`rounded-lg border p-4 ${plan.highlight ? "border-amber-500 ring-1 ring-amber-500" : ""}`}
                    >
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {plan.features.map((f) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                      <Button variant={plan.highlight ? "default" : "outline"} className={`mt-4 w-full ${plan.highlight ? "bg-amber-500 hover:bg-amber-600" : ""}`} size="sm">
                        {plan.name === "Free" ? "Current" : "Upgrade"}
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
                  <Input id="name" defaultValue="My Ecommerce Store" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="seller@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" defaultValue="America/New_York" disabled />
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
