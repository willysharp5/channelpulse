import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Sparkles, LineChart, Upload, FileSpreadsheet, AlertTriangle, Bell, Mail, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us";

export const metadata: Metadata = {
  title: "ChannelPulse — Multichannel Sales Analytics",
  description:
    "ChannelPulse unifies your Shopify, Amazon, Etsy, and TikTok Shop sales into one dashboard. Track revenue, orders, profit and inventory in real time. Free to start.",
  alternates: { canonical: "https://channelpulse.us" },
  openGraph: {
    title: "ChannelPulse — Multichannel Sales Analytics",
    description:
      "One dashboard for all your stores. Real-time revenue, P&L, inventory and AI-powered insights for Shopify, Amazon, Etsy, and TikTok Shop sellers.",
    url: "https://channelpulse.us",
    type: "website",
    images: [{ url: "/logo-512.png", width: 512, height: 512, alt: "ChannelPulse" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://channelpulse.us/#organization",
      name: "ChannelPulse",
      url: "https://channelpulse.us",
      logo: {
        "@type": "ImageObject",
        url: "https://channelpulse.us/logo-512.png",
        width: 512,
        height: 512,
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": "https://channelpulse.us/#website",
      url: "https://channelpulse.us",
      name: "ChannelPulse",
      publisher: { "@id": "https://channelpulse.us/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "ChannelPulse",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://app.channelpulse.us",
      description:
        "ChannelPulse unifies your Shopify, Amazon, Etsy, and TikTok Shop sales into one analytics dashboard. Track revenue, orders, profit and inventory across all your channels in real time.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan available. Paid plans from $19/month.",
      },
      featureList: [
        "Multichannel sales dashboard",
        "Revenue and profit tracking",
        "P&L reports by channel",
        "Inventory management and alerts",
        "AI-powered insights",
        "CSV import for orders and products",
        "Weekly email digest",
      ],
      screenshot: "https://channelpulse.us/logo-512.png",
      publisher: { "@id": "https://channelpulse.us/#organization" },
    },
  ],
};

import {
  RiArrowUpSFill,
  RiArrowDownSFill,
  RiBarChartBoxFill,
  RiShoppingCart2Fill,
  RiLineChartFill,
  RiShieldCheckFill,
  RiSparklingFill,
} from "@remixicon/react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LandingAiChatSection } from "@/components/landing/landing-ai-chat-section";
import { TestimonialsCarousel } from "@/components/landing/testimonials-carousel";
import { FooterNavLink } from "@/components/landing/footer-nav-link";

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
    features: [
      "3 sales channels",
      "5,000 orders/month",
      "30-day history",
      "Low stock alerts",
      "Top products & basic inventory",
      "Core revenue & order analytics",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$39",
    description: "For multi-channel sellers",
    features: [
      "5 sales channels",
      "25,000 orders/month",
      "90-day history",
      "AI Insights on your synced data",
      "P&L by channel",
      "CSV export (orders, products, P&L)",
      "Custom in-app alerts",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "$79",
    description: "For high-volume sellers",
    features: [
      "Our highest channel & order limits",
      "1-year history",
      "Full multichannel dashboard & P&L",
      "AI Insights on your synced data",
      "Inventory, products & CSV exports",
      "Same alerts & automations as Growth",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="scroll-smooth min-h-dvh bg-[#fafaf9] text-gray-950 dark:bg-gray-950 dark:text-gray-50">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-[#fafaf9]/80 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="ChannelPulse" width={32} height={32} className="rounded-lg" />
            <span className="text-base font-bold tracking-tight">ChannelPulse</span>
          </Link>
          <ul className="hidden items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400 md:flex">
            {[
              { label: "Features", hash: "#features" },
              { label: "AI & Analytics", hash: "#ai-analytics" },
              { label: "Analytics", hash: "#analytics" },
              { label: "Pricing", hash: "#pricing" },
            ].map(({ label, hash }) => (
              <li key={hash}>
                <FooterNavLink
                  href={`/landing${hash}`}
                  label={label}
                  className="transition-colors hover:text-gray-950 dark:hover:text-gray-50"
                />
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href={`${APP_URL}/demo`}
              className="hidden text-sm font-medium text-amber-700 transition-colors hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 sm:inline"
            >
              View a demo store
            </a>
            <a href={`${APP_URL}/login`} className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50 sm:inline">
              Sign In
            </a>
            <a href={`${APP_URL}/signup`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg border-gray-300 font-medium dark:border-gray-700")}>
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero (with dot grid + radial glow confined to this section) ── */}
      <section className="relative overflow-hidden">
        {/* Dot grid only in hero */}
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
            href={`${APP_URL}/signup`}
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-900/80 dark:hover:bg-gray-900"
          >
            <span className="font-semibold text-amber-600 dark:text-amber-400">New</span>
            <span className="text-gray-600 dark:text-gray-400">Ask AI questions about your store data</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          <h1 className="mx-auto text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
            Clarity for{" "}
            <br className="hidden sm:block" />
            every Channel
          </h1>

          <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            Unify your Shopify, Amazon, Etsy, and TikTok Shop data into one analytics dashboard. Revenue, orders, and profit in real time, with AI-powered insights and deep multichannel analytics.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`${APP_URL}/demo`}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-amber-500/50 bg-white/90 px-8 text-base font-semibold text-amber-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-amber-50 dark:border-amber-500/40 dark:bg-gray-900/90 dark:text-amber-100 dark:hover:bg-amber-950/50"
            >
              View a demo store
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-600"
            >
              Start tracking free
            </a>
          </div>
        </div>
      </section>

      {/* ── Feature 1: Unified Dashboard (full-width card with embedded UI) ── */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-32">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Unified Dashboard</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
            A single pane of glass for all your sales channels. Real-time monitoring across Shopify, Amazon, Etsy, and TikTok Shop.
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
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="text-sm font-semibold">Revenue</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Last 30 days</p>
                  </div>
                  <div className="flex gap-4">
                    {[{ l: "Shopify", c: "#96BF48" }, { l: "Amazon", c: "#FF9900" }, { l: "TikTok", c: "#FE2C55" }].map((ch) => (
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
                      <circle cx="50" cy="50" r="36" fill="none" stroke="#FE2C55" strokeWidth="14" strokeDasharray={`${0.088 * 226.2} ${226.2}`} strokeDashoffset={`${-(0.628 + 0.284) * 226.2}`} strokeLinecap="round" />
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
                    { label: "TikTok Shop", val: "$3,930", pct: "8.8%", color: "#FE2C55" },
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
      <section id="sync" className="relative z-10 overflow-hidden border-y border-gray-200/60 bg-white/50 py-32 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/30">
        {/* Subtle side glow */}
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-emerald-400/[0.05] blur-3xl" />
        <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Multi-Channel Sync</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Connect your stores via secure OAuth. Orders, products, and revenue flow in automatically no spreadsheets required.
            </p>
            <p className="mt-6 text-gray-500 dark:text-gray-400 leading-relaxed">
              Connect your Shopify, Amazon, Etsy, and TikTok Shop stores once and your orders, products, and revenue start appearing in your dashboard automatically no manual work needed.
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
              {[
                { name: "Shopify", color: "#96BF48", abbr: "S", status: "Syncing", orders: "1,247" },
                { name: "Amazon", color: "#FF9900", abbr: "A", status: "Syncing", orders: "634" },
                { name: "Etsy", color: "#F16521", abbr: "Et", status: "Syncing", orders: "312" },
                { name: "TikTok Shop", color: "#FE2C55", abbr: "TT", status: "Syncing", orders: "156" },
              ].map((ch) => (
                <div key={ch.name} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: ch.color }}>
                      {ch.abbr}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ch.name}</p>
                      <p className="text-xs text-gray-400">{ch.orders ? `${ch.orders} orders` : "Not connected"}</p>
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
      <section id="pnl" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
                <div className="mb-4">
                  <p className="text-sm font-semibold">P&amp;L</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Last 30 days</p>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Revenue", value: "$45,230", bold: true },
                    { label: "  Shopify Sales", value: "$28,430", indent: true },
                    { label: "  Amazon Sales", value: "$12,870", indent: true },
                    { label: "  TikTok Shop", value: "$3,930", indent: true },
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
              See exactly where your profit comes from and where fees eat into margins. Set your cost of goods (what you paid to make or buy each product) per item or as a percentage, then track marketplace fees, shipping costs, ad spend, and refunds all broken down by channel.
            </p>
          </div>
        </div>
      </section>

      {/* ── CSV Import ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Import</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Not everything syncs and that&apos;s okay</h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
              Some platforms don&apos;t have a direct API connection, and some historical data only lives in a spreadsheet.
              That&apos;s why ChannelPulse lets you import <strong className="font-semibold text-gray-900 dark:text-gray-100">orders, products, and inventory</strong> from any CSV file so nothing is left out of your analytics.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: FileSpreadsheet, title: "Smart column mapping", desc: "Paste in any spreadsheet export and we match your columns automatically. No reformatting." },
                { icon: Upload, title: "Orders, products & inventory", desc: "Import historical orders, set up your product catalog, or update stock levels in bulk." },
                { icon: Check, title: "Blends with live sync data", desc: "Imported data sits alongside your synced channels so your dashboards stay complete." },
              ].map((f) => (
                <li key={f.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-950 dark:text-gray-50 text-sm">{f.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <a href={`${APP_URL}/signup`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-colors hover:bg-amber-600">
                <Upload className="h-4 w-4" /> Start importing free
              </a>
            </div>
          </div>

          {/* Import wizard mock */}
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              {/* Step pills */}
              <div className="flex items-center gap-0 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                {["Choose type", "Upload file", "Map columns", "Review"].map((step, i) => (
                  <div key={step} className="flex items-center gap-0">
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${i === 1 ? "bg-amber-500 text-white" : "text-gray-400"}`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${i === 1 ? "bg-white/30" : "bg-gray-200 dark:bg-gray-700"}`}>{i + 1}</span>
                      <span className="hidden sm:inline">{step}</span>
                    </span>
                    {i < 3 && <span className="mx-0.5 text-gray-300 dark:text-gray-700">›</span>}
                  </div>
                ))}
              </div>

              {/* Dropzone */}
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 py-10 text-center dark:border-amber-800/40 dark:bg-amber-950/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-200">Drop your CSV here</p>
                  <p className="mt-1 text-xs text-gray-400">or click to browse · orders, products, inventory</p>
                  <span className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Choose file</span>
                </div>

                {/* Column mapping preview */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-500">Column mapping auto-detected</p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {[
                      { your: "Order ID", maps: "platform_order_id" },
                      { your: "Sale Date", maps: "ordered_at" },
                      { your: "Total ($)", maps: "total_amount" },
                      { your: "SKU", maps: "sku" },
                    ].map((row) => (
                      <div key={row.your} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-mono text-gray-500 dark:text-gray-400">{row.your}</span>
                        <span className="text-gray-300 dark:text-gray-600">→</span>
                        <span className="font-mono font-medium text-amber-700 dark:text-amber-400">{row.maps}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI & Analytics ── */}
      <section
        id="ai-analytics"
        className="relative z-10 overflow-hidden border-y border-gray-200/60 bg-gradient-to-b from-white via-[#fafaf9] to-white py-32 dark:border-gray-800/60 dark:from-gray-950 dark:via-gray-900/40 dark:to-gray-950"
      >
        <div className="pointer-events-none absolute right-0 top-1/4 h-[320px] w-[320px] rounded-full bg-violet-400/[0.07] blur-3xl dark:bg-violet-500/[0.08]" />
        <div className="pointer-events-none absolute -left-20 bottom-1/4 h-[280px] w-[280px] rounded-full bg-amber-400/[0.06] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-12 lg:gap-14">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Intelligence
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">AI insights &amp; deep analytics</h2>
              <p className="mt-4 leading-relaxed text-gray-500 dark:text-gray-400">
                Go beyond static charts. ChannelPulse combines interactive analytics across every connected store with an AI assistant that understands your orders, revenue, products, and profit so you can ask questions in plain English and get answers instantly.
              </p>
              <ul className="mt-10 space-y-6">
                <li className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-950 dark:text-gray-50">AI Insights</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      Ask questions in plain language, use suggested reports, and dig into performance with context from your real channel data, not generic advice.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <LineChart className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-950 dark:text-gray-50">Multichannel analytics</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      Revenue trends, order KPIs, channel comparisons, inventory views, and exportable reports filtered by date range and store, all in one place.
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <a href={`${APP_URL}/demo`} className="inline-flex items-center justify-center rounded-xl border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950/40">
                  View a demo store
                </a>
                <a href={`${APP_URL}/signup`} className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-colors hover:bg-amber-600">
                  Start with AI &amp; analytics
                </a>
              </div>
            </div>

            <div className="min-w-0 w-full overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <LandingAiChatSection />
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials carousel ── */}
      <TestimonialsCarousel />

      {/* ── Analytics Section (Solar-style data table) ── */}
      <section id="analytics" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">ChannelPulse Analytics</h2>
          <p className="mt-3 max-w-xl text-gray-500 dark:text-gray-400">
            Turn raw order data into actionable insights with real-time channel performance analytics. Pair tables and charts with{" "}
            <Link href="#ai-analytics" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
              AI Insights
            </Link>{" "}
            to explore trends and ask follow-up questions in natural language.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-2xl shadow-gray-300/20 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            {/* KPI row */}
            <div className="border-b border-gray-200 p-6 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Combined Revenue</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums tracking-tight">$52,070</span>
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
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400" title="Average order value">
                      Avg order
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Growth</th>
                    <th className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Fees</th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {[
                    { ch: "Shopify", color: "#96BF48", orders: "1,247", rev: "$28,430", aov: "$22.80", growth: "+14.2%", up: true, fees: "$852", profit: "$18,204" },
                    { ch: "Amazon", color: "#FF9900", orders: "634", rev: "$12,870", aov: "$20.30", growth: "+8.7%", up: true, fees: "$1,930", profit: "$6,122" },
                    { ch: "Etsy", color: "#F16521", orders: "312", rev: "$6,840", aov: "$21.92", growth: "+22.4%", up: true, fees: "$548", profit: "$4,180" },
                    { ch: "TikTok Shop", color: "#FE2C55", orders: "156", rev: "$3,930", aov: "$25.19", growth: "+31.6%", up: true, fees: "$510", profit: "$2,099" },
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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { icon: RiBarChartBoxFill, title: "Revenue Breakdown", desc: "See revenue per channel with trend lines and average order value." },
            { icon: RiShoppingCart2Fill, title: "Order Analytics", desc: "Track order volume, fulfillment status, and customer data." },
            { icon: RiLineChartFill, title: "P&L Reports", desc: "Full profit & loss with COGS, fees, shipping, and ad spend." },
            { icon: RiShieldCheckFill, title: "Read-Only & Secure", desc: "We never write to your stores. Encrypted, row-level security." },
            { icon: RiSparklingFill, title: "AI Insights", desc: "Ask questions in plain English and explore suggested reports grounded in your synced data." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <f.icon className="mb-3 h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Inventory and Notifications ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Visual */}
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">

              {/* Inventory rows */}
              <div className="border-b border-gray-200 p-4 dark:border-gray-800">
                <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Inventory across channels</p>
                <div className="space-y-2">
                  {[
                    { name: "Wireless Earbuds Pro", sku: "WEP-001", qty: 3, status: "critical", channel: "#96BF48" },
                    { name: "Travel Neck Pillow", sku: "TNP-002", qty: 14, status: "low", channel: "#FF9900" },
                    { name: "Bamboo Cutting Board", sku: "BCB-003", qty: 87, status: "healthy", channel: "#F16521" },
                    { name: "Resistance Bands Set", sku: "RBS-004", qty: 8, status: "low", channel: "#FE2C55" },
                  ].map((item) => (
                    <div key={item.sku} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.channel }} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tabular-nums text-xs font-semibold">{item.qty} left</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.status === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                          item.status === "low" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}>
                          {item.status === "critical" ? "Critical" : item.status === "low" ? "Low" : "Healthy"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification toasts */}
              <div className="space-y-2 p-4">
                <p className="mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Recent notifications</p>
                {[
                  { color: "bg-red-500", Icon: AlertTriangle, title: "Critical stock: Wireless Earbuds Pro", sub: "3 units left across Shopify", time: "Just now" },
                  { color: "bg-amber-500", Icon: Bell, title: "Low stock: Resistance Bands Set", sub: "8 units left on TikTok Shop", time: "12 min ago" },
                  { color: "bg-blue-500", Icon: Mail, title: "Weekly digest sent", sub: "Revenue, orders and inventory summary", time: "Mon 8:00am" },
                ].map((n) => (
                  <div key={n.title} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${n.color} text-white`}>
                      <n.Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                      <p className="truncate text-[10px] text-gray-400">{n.sub}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-400">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Inventory and alerts</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Know before you run out</h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
              ChannelPulse tracks stock levels across every connected channel in one view. Every product is marked as Healthy, Low, or Critical based on thresholds you control. You never have to log into each store separately to check what is running low.
            </p>
            <ul className="mt-8 space-y-5">
              {[
                {
                  Icon: AlertTriangle,
                  color: "bg-red-500/10 text-red-600 dark:text-red-400",
                  title: "Critical and low stock alerts",
                  desc: "Get notified the moment a product dips below your reorder point, before you miss a sale.",
                },
                {
                  Icon: Bell,
                  color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  title: "Alerts across all your channels",
                  desc: "One notification covers all your stores. If Wireless Earbuds Pro is low on Shopify and TikTok Shop, you get one alert, not five.",
                },
                {
                  Icon: Mail,
                  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  title: "Weekly email digest",
                  desc: "A summary of revenue, orders, and inventory health lands in your inbox every Monday morning so you start the week informed.",
                },
                {
                  Icon: SlidersHorizontal,
                  color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
                  title: "Your thresholds, your rules",
                  desc: "Set your own critical and low stock numbers. A seller moving 500 units a day needs different triggers than someone selling 10.",
                },
              ].map((f) => (
                <li key={f.title} className="flex gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.color}`}>
                    <f.Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-950 dark:text-gray-50">{f.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
                <a
                  href={`${APP_URL}/signup`}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                    plan.highlight
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600"
                      : "border border-border hover:bg-muted"
                  )}
                >
                  {plan.cta}
                </a>
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
            Connect your first store in under 2 minutes. Free to start, no credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={`${APP_URL}/signup`} className="inline-flex h-12 items-center gap-1.5 rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-600">
              Start free <ArrowRight className="h-4 w-4" />
            </a>
            <a href={`${APP_URL}/demo`} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-xl px-8 text-base")}>
              View a demo store
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 bg-white dark:bg-gray-950">
        {/* Diagonal hatching stripe matches Solar */}
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
                <Image src="/logo.svg" alt="ChannelPulse" width={32} height={32} className="rounded-lg" />
                <span className="font-bold">ChannelPulse</span>
              </div>
            </div>

            {/* Link columns */}
            {[
              { title: "Product", links: [
                { label: "Overview", href: "/landing#features" },
                { label: "Orders", href: "/landing#analytics" },
                { label: "Revenue", href: "/landing#analytics" },
                { label: "P&L Reports", href: "/landing#pnl" },
                { label: "AI Insights", href: "/landing#ai-analytics" },
              ]},
              { title: "Company", links: [
                { label: "About", href: "/about" },
              ]},
              { title: "Resources", links: [
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ]},
              { title: "Channels", links: [
                { label: "Shopify", href: "" },
                { label: "Amazon", href: "" },
                { label: "Etsy", href: "" },
                { label: "TikTok Shop", href: "" },
                { label: "Walmart Marketplace", href: "" },
              ]},
            ].map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-gray-950 dark:text-gray-50">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <FooterNavLink href={link.href} label={link.label} />
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom row: socials + copyright */}
          <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <Link href="#" aria-label="Discord" className="text-gray-400 transition-colors hover:text-[#5865F2] dark:hover:text-[#5865F2]">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </Link>
            </div>
            <p className="text-xs text-gray-400">&copy; 2026 ChannelPulse, Inc.</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
