import Link from "next/link";
import {
  Zap,
  BarChart3,
  ShoppingCart,
  TrendingUp,
  Shield,
  Clock,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Unified Dashboard",
    description:
      "See revenue, orders, and profit from every channel in one clean view. No more jumping between tabs.",
  },
  {
    icon: ShoppingCart,
    title: "Multi-Channel Sync",
    description:
      "Connect Shopify, Amazon, and more. Orders sync automatically every 15 minutes via webhooks.",
  },
  {
    icon: TrendingUp,
    title: "Profit & Loss",
    description:
      "Real P&L reports with COGS, marketplace fees, shipping, and advertising costs broken down per channel.",
  },
  {
    icon: Shield,
    title: "Read-Only & Secure",
    description:
      "We never write to your stores. Read-only access with encrypted credentials and row-level security.",
  },
  {
    icon: Clock,
    title: "3-Minute Setup",
    description:
      "Connect your first store via OAuth and see your data in under 3 minutes. No CSV uploads needed.",
  },
  {
    icon: Star,
    title: "Built for Sellers",
    description:
      "Designed for small-to-mid e-commerce sellers who sell on 2+ channels and are tired of spreadsheets.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with one channel",
    features: ["1 channel", "100 orders/month", "7-day data history", "Basic dashboard"],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$19",
    description: "For growing sellers",
    features: ["3 channels", "5,000 orders/month", "90-day data history", "Full analytics", "CSV export"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$39",
    description: "Most popular for multi-channel sellers",
    features: [
      "5 channels",
      "25,000 orders/month",
      "1-year data history",
      "P&L reports",
      "Priority support",
      "Custom alerts",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "$79",
    description: "For high-volume operations",
    features: [
      "Unlimited channels",
      "Unlimited orders",
      "Unlimited history",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const CHANNELS = [
  { name: "Shopify", color: "#96BF48", icon: "🟢", status: "Live" },
  { name: "Amazon", color: "#FF9900", icon: "🟠", status: "Live" },
  { name: "eBay", color: "#E53238", icon: "🔴", status: "Coming Soon" },
  { name: "Etsy", color: "#F16521", icon: "🟤", status: "Coming Soon" },
  { name: "WooCommerce", color: "#7B2D8E", icon: "🟣", status: "Coming Soon" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg">ChannelPulse</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
        <Badge variant="outline" className="mb-6 px-3 py-1 text-sm">
          Now in Early Access
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          All your sales channels.
          <br />
          <span className="text-amber-500">One dashboard.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          ChannelPulse unifies your Shopify, Amazon, eBay, and Etsy data into one
          beautiful analytics dashboard. See revenue, orders, profit, and trends
          across every channel — in real time.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white gap-2 h-12 px-8 text-base">
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            No credit card required. Free plan available.
          </p>
        </div>

        {/* Channel logos */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
          {CHANNELS.map((ch) => (
            <div
              key={ch.name}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            >
              <span>{ch.icon}</span>
              <span className="font-medium">{ch.name}</span>
              {ch.status === "Live" ? (
                <Badge variant="secondary" className="text-[10px] px-1.5">Live</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">Soon</Badge>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-xl border bg-card p-4 shadow-2xl shadow-amber-500/5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Revenue", value: "$45,230", change: "+12.3%" },
              { label: "Orders", value: "2,081", change: "+8.1%" },
              { label: "Profit", value: "$12,425", change: "+15.2%" },
              { label: "AOV", value: "$21.74", change: "-2.1%" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold tabular-nums mt-1">{kpi.value}</p>
                <p className={`text-xs font-medium mt-0.5 ${kpi.change.startsWith("+") ? "text-emerald-500" : "text-red-500"}`}>
                  {kpi.change}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-48 rounded-lg border bg-gradient-to-t from-amber-500/5 to-transparent flex items-end justify-center">
            <div className="flex gap-1 pb-4">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 rounded-t bg-amber-500/40"
                  style={{ height: `${20 + Math.sin(i * 0.5) * 30 + i * 2}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to track multichannel sales
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop switching between dashboards. ChannelPulse gives you one source of truth.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 mb-2">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you grow. No hidden fees.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlight ? "border-amber-500 ring-1 ring-amber-500 relative" : ""}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div>
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup">
                    <Button
                      className={`w-full ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to see all your sales in one place?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join sellers who&apos;ve ditched spreadsheets for ChannelPulse.
            Connect your first store in under 3 minutes.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white gap-2 h-12 px-8 text-base">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500 text-white">
              <Zap className="h-3 w-3" />
            </div>
            <span className="text-sm font-medium">ChannelPulse</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 ChannelPulse. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
