import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import {
  RiPulseFill,
  RiArrowUpSFill,
  RiArrowDownSFill,
  RiBarChartBoxFill,
  RiShoppingCart2Fill,
  RiLineChartFill,
  RiShieldCheckFill,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const PRICING = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with one channel",
    features: ["1 sales channel", "100 orders/month", "7-day history", "Basic dashboard"],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$19",
    description: "For growing sellers",
    features: ["3 sales channels", "5,000 orders/month", "90-day history", "Full analytics", "CSV export"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$39",
    description: "For multi-channel sellers",
    features: ["5 sales channels", "25,000 orders/month", "1-year history", "P&L reports", "Priority support", "Custom alerts"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "$79",
    description: "For high-volume operations",
    features: ["Unlimited channels", "Unlimited orders", "Unlimited history", "API access", "Dedicated support", "Custom integrations"],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] text-gray-950 dark:bg-gray-950 dark:text-gray-50">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-[#fafaf9]/80 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
              <RiPulseFill className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">ChannelPulse</span>
          </Link>
          <ul className="hidden items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400 md:flex">
            <li><Link href="#features" className="transition-colors hover:text-gray-950 dark:hover:text-gray-50">Features</Link></li>
            <li><Link href="#analytics" className="transition-colors hover:text-gray-950 dark:hover:text-gray-50">Analytics</Link></li>
            <li><Link href="#pricing" className="transition-colors hover:text-gray-950 dark:hover:text-gray-50">Pricing</Link></li>
          </ul>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50 sm:inline">
              Sign In
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="sm" className="rounded-lg border-gray-300 font-medium dark:border-gray-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (with dot grid + radial glow confined to this section) ── */}
      <section className="relative overflow-hidden">
        {/* Dot grid — only in hero */}
        <div
          className="pointer-events-none absolute inset-0 dark:opacity-15"
          style={{
            backgroundImage: "radial-gradient(circle, #a8a8a8 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.55,
          }}
        />
        {/* Fade-out at bottom so dots dissolve cleanly */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#fafaf9] to-transparent dark:from-gray-950" />
        {/* Soft radial amber glow */}
        <div className="pointer-events-none absolute left-1/2 top-24 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/[0.06] blur-3xl dark:bg-amber-500/[0.04]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-28 pt-20 text-center md:pb-36 md:pt-28">
          <Link
            href="/signup"
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-900/80 dark:hover:bg-gray-900"
          >
            <span className="font-semibold text-amber-600 dark:text-amber-400">New</span>
            <span className="text-gray-600 dark:text-gray-400">Shopify &amp; Amazon now live</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          <h1 className="mx-auto text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            Clarity for{" "}
            <br className="hidden sm:block" />
            every Channel
          </h1>

          <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            Unify your Shopify, Amazon, eBay, and Etsy data into one analytics dashboard. Revenue, orders, and profit — in real time.
          </p>

          <div className="mt-10">
            <Link href="/signup">
              <Button className="h-12 rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600">
                Start tracking free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature 1: Unified Dashboard (full-width card with embedded UI) ── */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-32">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Unified Dashboard</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
            A single pane of glass for all your sales channels. Real-time monitoring across Shopify, Amazon, eBay, and more.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-2xl shadow-gray-300/20 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Revenue", value: "$45,230", change: "+12.3%", up: true },
                { label: "Orders", value: "2,081", change: "+8.1%", up: true },
                { label: "Net Profit", value: "$12,425", change: "+15.2%", up: true },
                { label: "Avg Order Value", value: "$21.74", change: "-2.1%", up: false },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
                  <span className={`mt-2 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    kpi.up
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}>
                    {kpi.up ? <RiArrowUpSFill className="h-3 w-3" /> : <RiArrowDownSFill className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-5">
              {/* Chart area */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 lg:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Revenue — Last 30 Days</p>
                  <div className="flex gap-4">
                    {[{ l: "Shopify", c: "#96BF48" }, { l: "Amazon", c: "#FF9900" }].map((ch) => (
                      <div key={ch.l} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ch.c }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{ch.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex h-44 items-end gap-[2px]">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const s = 35 + Math.sin(i * 0.35) * 18 + i * 1.8;
                    const a = 12 + Math.cos(i * 0.4) * 8 + i * 0.6;
                    return (
                      <div key={i} className="flex flex-1 flex-col justify-end gap-[1px]">
                        <div className="w-full rounded-t-[2px] bg-[#FF9900]" style={{ height: `${a}px`, opacity: 0.7 }} />
                        <div className="w-full bg-[#96BF48]" style={{ height: `${s}px`, opacity: 0.75 }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Donut / channel split */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
                <p className="mb-5 text-sm font-semibold">Channel Split</p>
                <div className="flex justify-center">
                  <div className="relative h-32 w-32">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="36" fill="none" strokeWidth="14" className="stroke-gray-100 dark:stroke-gray-800" />
                      <circle cx="50" cy="50" r="36" fill="none" stroke="#96BF48" strokeWidth="14" strokeDasharray={`${0.628 * 226.2} ${226.2}`} strokeLinecap="round" />
                      <circle cx="50" cy="50" r="36" fill="none" stroke="#FF9900" strokeWidth="14" strokeDasharray={`${0.284 * 226.2} ${226.2}`} strokeDashoffset={`${-0.628 * 226.2}`} strokeLinecap="round" />
                      <circle cx="50" cy="50" r="36" fill="none" stroke="#E53238" strokeWidth="14" strokeDasharray={`${0.088 * 226.2} ${226.2}`} strokeDashoffset={`${-(0.628 + 0.284) * 226.2}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold tabular-nums">$45.2k</span>
                      <span className="text-[10px] text-gray-400">Total</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-2.5">
                  {[
                    { label: "Shopify", val: "$28,430", pct: "62.8%", color: "#96BF48" },
                    { label: "Amazon", val: "$12,870", pct: "28.4%", color: "#FF9900" },
                    { label: "eBay", val: "$3,930", pct: "8.8%", color: "#E53238" },
                  ].map((ch) => (
                    <div key={ch.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                        <span className="text-gray-600 dark:text-gray-400">{ch.label}</span>
                      </div>
                      <span className="font-medium tabular-nums">{ch.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 2: Multi-Channel Sync (two-column with visual) ── */}
      <section className="relative z-10 overflow-hidden border-y border-gray-200/60 bg-white/50 py-32 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/30">
        {/* Subtle side glow */}
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-emerald-400/[0.05] blur-3xl" />
        <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Multi-Channel Sync</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Connect your stores via secure OAuth. Orders, products, and revenue flow in automatically. Zero CSV uploads.
            </p>
            <p className="mt-6 text-gray-500 dark:text-gray-400 leading-relaxed">
              Deploy real-time syncing across your Shopify, Amazon, and eBay stores with our integrated webhook pipeline. New orders appear in your dashboard within seconds of being placed.
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
              {[
                { name: "Shopify", color: "#96BF48", abbr: "S", status: "Syncing", orders: "1,247" },
                { name: "Amazon", color: "#FF9900", abbr: "A", status: "Syncing", orders: "634" },
                { name: "eBay", color: "#E53238", abbr: "E", status: "Syncing", orders: "200" },
                { name: "Etsy", color: "#F16521", abbr: "Et", status: "Pending", orders: "—" },
                { name: "WooCommerce", color: "#7B2D8E", abbr: "W", status: "Pending", orders: "—" },
              ].map((ch) => (
                <div key={ch.name} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: ch.color }}>
                      {ch.abbr}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ch.name}</p>
                      <p className="text-xs text-gray-400">{ch.orders !== "—" ? `${ch.orders} orders` : "Not connected"}</p>
                    </div>
                  </div>
                  {ch.status === "Syncing" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Syncing
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Coming Soon</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ── Feature 3: Profit & Loss (two-column reversed) ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
                <p className="mb-4 text-sm font-semibold">P&L — Last 30 Days</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Revenue", value: "$45,230", bold: true },
                    { label: "  Shopify Sales", value: "$28,430", indent: true },
                    { label: "  Amazon Sales", value: "$12,870", indent: true },
                    { label: "  eBay Sales", value: "$3,930", indent: true },
                    { label: "COGS", value: "-$15,831", negative: true },
                    { label: "Gross Profit", value: "$29,399", bold: true },
                    { label: "Marketplace Fees", value: "-$5,877", negative: true },
                    { label: "Shipping", value: "-$4,523", negative: true },
                    { label: "Advertising", value: "-$2,800", negative: true },
                  ].map((row, i) => (
                    <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${row.bold ? "bg-white font-semibold dark:bg-gray-900" : ""}`}>
                      <span className={row.indent ? "text-gray-500 dark:text-gray-400 pl-3" : ""}>{row.label}</span>
                      <span className={`tabular-nums ${row.negative ? "text-red-600 dark:text-red-400" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-3 text-sm font-bold dark:bg-emerald-950/50">
                    <span>NET PROFIT</span>
                    <span className="text-emerald-700 dark:text-emerald-400">$16,199</span>
                  </div>
                  <p className="text-right text-xs text-gray-400">35.8% net margin</p>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Profit & Loss</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Turn raw orders into actionable P&L insights
            </p>
            <p className="mt-6 text-gray-500 dark:text-gray-400 leading-relaxed">
              See exactly where your profit comes from and where fees eat into margins. Set COGS per product or as a percentage, track marketplace fees, shipping costs, ad spend, and refunds — all broken down by channel.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="relative z-10 overflow-hidden border-y border-gray-200/60 bg-white/50 py-24 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/30">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/[0.06] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-4xl px-6">
        <blockquote className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-14">
          <p className="text-lg font-medium leading-relaxed text-gray-700 dark:text-gray-300 sm:text-xl">
            <strong>&ldquo;ChannelPulse replaced three spreadsheets and two dashboards for us.</strong> Having Shopify and Amazon revenue in one view with real P&L numbers saved us hours every week. The setup took literally 2 minutes.&rdquo;
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              E
            </div>
            <div>
              <p className="text-sm font-semibold">Emma Chen</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Founder, Pinewood Commerce</p>
            </div>
          </div>
        </blockquote>
        </div>
      </section>

      {/* ── Analytics Section (Solar-style data table) ── */}
      <section id="analytics" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">ChannelPulse Analytics</h2>
          <p className="mt-3 max-w-xl text-gray-500 dark:text-gray-400">
            Turn raw order data into actionable insights with real-time channel performance analytics.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-2xl shadow-gray-300/20 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            {/* KPI row */}
            <div className="border-b border-gray-200 p-6 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Combined Revenue</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums tracking-tight">$45,230</span>
                <span className="mb-1 inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <RiArrowUpSFill className="h-3 w-3" />+12.3%
                </span>
                <span className="mb-1 text-xs text-gray-400">Past 30 days</span>
              </div>
            </div>

            {/* Data table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Channel</th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Orders</th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">AOV</th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Growth</th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Fees</th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {[
                    { ch: "Shopify", color: "#96BF48", orders: "1,247", rev: "$28,430", aov: "$22.80", growth: "+14.2%", up: true, fees: "$852", profit: "$18,204" },
                    { ch: "Amazon", color: "#FF9900", orders: "634", rev: "$12,870", aov: "$20.30", growth: "+8.7%", up: true, fees: "$1,930", profit: "$6,122" },
                    { ch: "eBay", color: "#E53238", orders: "200", rev: "$3,930", aov: "$19.65", growth: "-3.1%", up: false, fees: "$510", profit: "$2,099" },
                  ].map((row) => (
                    <tr key={row.ch} className="transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="font-medium">{row.ch}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.orders}</td>
                      <td className="px-4 py-4 text-right font-medium tabular-nums">{row.rev}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{row.aov}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${row.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {row.up ? <RiArrowUpSFill className="h-3 w-3" /> : <RiArrowDownSFill className="h-3 w-3" />}
                          {row.growth}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-gray-500 dark:text-gray-400">{row.fees}</td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums">{row.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Feature pills below table */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: RiBarChartBoxFill, title: "Revenue Breakdown", desc: "See revenue per channel with trend lines and AOV metrics." },
            { icon: RiShoppingCart2Fill, title: "Order Analytics", desc: "Track order volume, fulfillment status, and customer data." },
            { icon: RiLineChartFill, title: "P&L Reports", desc: "Full profit & loss with COGS, fees, shipping, and ad spend." },
            { icon: RiShieldCheckFill, title: "Read-Only & Secure", desc: "We never write to your stores. Encrypted, row-level security." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <f.icon className="mb-3 h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 overflow-hidden border-y border-gray-200/60 bg-white/50 py-32 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/30">
        <div className="pointer-events-none absolute -left-32 top-0 h-[350px] w-[350px] rounded-full bg-violet-400/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[350px] w-[350px] rounded-full bg-amber-400/[0.05] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400">Start free. Upgrade when you grow. No hidden fees.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-amber-400 bg-white shadow-xl shadow-amber-400/10 ring-1 ring-amber-400 dark:border-amber-600 dark:bg-gray-900 dark:ring-amber-600"
                  : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm">Most Popular</span>
                </div>
              )}
              <p className="text-sm font-semibold">{plan.name}</p>
              <div className="mt-3">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/signup">
                  <Button
                    className={`w-full rounded-xl ${plan.highlight ? "bg-amber-500 font-semibold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to get started?</h2>
          <p className="mx-auto mt-4 max-w-md text-gray-500 dark:text-gray-400">
            Begin your multichannel analytics journey today or chat with us about your needs.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup">
              <Button className="h-12 rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600">
                Start free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-12 rounded-xl px-8 text-base">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 bg-white dark:bg-gray-950">
        {/* Diagonal hatching stripe — matches Solar */}
        <div
          className="h-16 w-full border-y border-gray-200 dark:border-gray-800"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 5px)",
            opacity: 0.5,
          }}
        />

        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
            {/* Logo + description */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <RiPulseFill className="h-4 w-4" />
                </div>
                <span className="font-bold">ChannelPulse</span>
              </div>
            </div>

            {/* Link columns */}
            {[
              { title: "Product", links: ["Overview", "Orders", "Revenue", "P&L Reports", "Documentation", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press", "Partners"] },
              { title: "Resources", links: ["Community", "Contact", "Support", "Privacy Policy", "Terms of Service", "Report an Issue"] },
              { title: "Channels", links: ["Shopify", "Amazon", "eBay", "Etsy", "WooCommerce"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-gray-950 dark:text-gray-50">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom row: socials + copyright */}
          <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              {[
                { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { label: "YouTube", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" },
                { label: "GitHub", path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
              ].map((social) => (
                <Link key={social.label} href="#" aria-label={social.label} className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d={social.path} /></svg>
                </Link>
              ))}
            </div>
            <p className="text-xs text-gray-400">&copy; 2026 ChannelPulse, Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
