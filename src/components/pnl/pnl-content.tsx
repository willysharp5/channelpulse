"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  Pencil,
  Save,
  Loader2,
  X,
  Percent,
  DollarSign,
  Download,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import { downloadCSV } from "@/lib/csv-export";
import { KPICard } from "@/components/dashboard/kpi-card";
import { CategoryBar } from "@/components/tremor/category-bar";
import { computePnLExpenseTotals } from "@/lib/pnl-model";
import type { Platform } from "@/types";
import type { CostSettings, CogsMethod, PnLChannelRow, PnLChannelFeeRow } from "@/lib/queries";

interface PnLData {
  totalRevenue: number;
  totalOrders: number;
  revenueByPlatform: Record<string, number>;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  costSettings: CostSettings;
  fees: {
    marketplace: number;
    shipping: number;
    processing: number;
    advertising: number;
    refunds: number;
    other: number;
    total: number;
  };
  netProfit: number;
  netMargin: number;
  channelBreakdown: PnLChannelRow[];
  channelFeeOverrides: PnLChannelFeeRow[];
}

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />} />
      <TooltipContent side="top" className="max-w-[280px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function PnLRow({
  label,
  value,
  indent = false,
  bold = false,
  negative = false,
  highlight = false,
  color,
  tooltip,
}: {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
  color?: string;
  tooltip?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${indent ? "pl-6" : ""} ${bold ? "font-semibold" : ""} ${highlight ? "text-lg py-3" : ""}`}
    >
      <span className="flex items-center gap-2">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
        {label}
        {tooltip && <Tip text={tooltip} />}
      </span>
      <span className={`tabular-nums ${negative ? "text-red-500" : ""}`}>
        {negative ? "-" : ""}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function numOrNull(v: string): number | null {
  if (v === "" || v === "-") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function PnLContent({
  pnl,
  rangeLabel,
  children,
}: {
  pnl: PnLData;
  rangeLabel: string;
  /** Server-rendered sales-by-channel table (avoids hydration mismatch for that block). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(pnl.costSettings);
  const [channelRows, setChannelRows] = useState<PnLChannelFeeRow[]>(pnl.channelFeeOverrides);
  const [perStoreOpen, setPerStoreOpen] = useState(false);

  useEffect(() => {
    if (!editing) {
      setSettings(pnl.costSettings);
      setChannelRows(pnl.channelFeeOverrides);
    }
  }, [pnl.costSettings, pnl.channelFeeOverrides, editing]);

  const rev = pnl.totalRevenue;
  const orders = pnl.totalOrders;

  const cs = editing ? settings : pnl.costSettings;

  const cogsFromPercent = cs.default_cogs_percent > 0 ? (rev * cs.default_cogs_percent) / 100 : 0;
  const effectiveCogs = editing
    ? settings.cogs_method === "per_product"
      ? pnl.cogs
      : cogsFromPercent
    : pnl.cogs;

  const channelAggs = useMemo(
    () =>
      pnl.channelBreakdown.map((r) => ({
        channelId: r.channelId,
        revenue: r.revenue,
        orders: r.orders,
        storedPlatformFees: r.platformFees,
      })),
    [pnl.channelBreakdown]
  );

  const overrideInputs = useMemo(
    () =>
      (editing ? channelRows : pnl.channelFeeOverrides).map((r) => ({
        channelId: r.channelId,
        platform_fee_percent: r.platform_fee_percent,
        platform_fee_flat: r.platform_fee_flat,
        marketing_monthly: r.marketing_monthly,
        shipping_cost_percent: r.shipping_cost_percent,
        payment_processing_percent: r.payment_processing_percent,
      })),
    [editing, channelRows, pnl.channelFeeOverrides]
  );

  const expenseTotals = useMemo(
    () =>
      computePnLExpenseTotals({
        costSettings: settings,
        totalRevenue: rev,
        totalOrders: orders,
        channelAggs,
        channelOverrides: overrideInputs,
      }),
    [settings, rev, orders, channelAggs, overrideInputs]
  );

  const displayFees = editing ? expenseTotals : pnl.fees;
  const displayGrossProfit = editing ? rev - effectiveCogs : pnl.grossProfit;
  const displayNetProfit = editing ? displayGrossProfit - displayFees.total : pnl.netProfit;
  const grossMargin = rev > 0 ? (displayGrossProfit / rev) * 100 : 0;
  const netMargin = rev > 0 ? (displayNetProfit / rev) * 100 : 0;

  const hintRows = editing ? channelRows : pnl.channelFeeOverrides;
  const anyStoreShippingOverride = hintRows.some((r) => r.shipping_cost_percent != null);
  const anyStoreProcessingOverride = hintRows.some((r) => r.payment_processing_percent != null);
  const shippingExpenseTooltip = anyStoreShippingOverride
    ? `Shipping estimate: each store’s revenue in this period × that store’s shipping % (or org default ${cs.shipping_cost_percent}% if the store is left blank), then summed.`
    : `Shipping estimate: ${cs.shipping_cost_percent}% of total revenue. Use Edit rates → Per-store overrides to set a different shipping % per store.`;
  const processingExpenseTooltip = anyStoreProcessingOverride
    ? `Processing estimate: each store’s revenue × that store’s processing % (or org default ${cs.payment_processing_percent}% if blank), summed.`
    : `Processing estimate: ${cs.payment_processing_percent}% of total revenue. Override per store under Edit rates if needed.`;

  const categoryBarData = [
    { label: "Revenue", value: Math.max(rev - effectiveCogs - displayFees.total, 0), color: "#10b981" },
    { label: "COGS", value: effectiveCogs, color: "#f59e0b" },
    { label: "Expenses", value: displayFees.total, color: "#ef4444" },
    { label: "Profit", value: Math.max(displayNetProfit, 0), color: "#3b82f6" },
  ];

  function updateChannelRow(channelId: string, patch: Partial<PnLChannelFeeRow>) {
    setChannelRows((rows) => rows.map((r) => (r.channelId === channelId ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) return;

      const res2 = await fetch("/api/settings/channel-pnl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: channelRows.map((r) => ({
            channelId: r.channelId,
            platform_fee_percent: r.platform_fee_percent,
            platform_fee_flat: r.platform_fee_flat,
            marketing_monthly: r.marketing_monthly,
            shipping_cost_percent: r.shipping_cost_percent,
            payment_processing_percent: r.payment_processing_percent,
          })),
        }),
      });
      if (res2.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const marketplaceTooltip = editing
    ? settings.use_modeled_platform_fees
      ? `Modeled: for each store in this date range, (revenue × fee %) + (orders × flat $). Per-store overrides apply when set; otherwise org defaults (${settings.platform_fee_percent}% + $${settings.platform_fee_flat.toFixed(2)}/order).`
      : `Using synced fee totals from orders when available; otherwise org defaults (${settings.platform_fee_percent}% + $${settings.platform_fee_flat.toFixed(2)}/order). Turn on “Use my marketplace fee rates” to replace synced totals with your rates.`
    : pnl.costSettings.use_modeled_platform_fees
      ? "Marketplace fees are calculated from your fee % and per-order $ (org defaults plus any per-store overrides) for each channel in range."
      : "Marketplace fees use totals stored on synced orders when we have them (estimates from sync). If none, org-wide % and flat per order apply. Edit rates to switch to your own modeled fees.";

  const advertisingTooltip = editing
    ? `Shared monthly ads ($${settings.advertising_monthly.toFixed(2)}) plus each store’s “This store’s ad spend / month” in overrides. Dollar amounts only—not a percent of sales.`
    : `Shared monthly ad budget plus each store’s monthly ad line. These are dollar amounts per month (not prorated to the date range).`;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          data={{
            title: "Total Revenue (P&L)",
            value: rev,
            formattedValue: formatCurrency(rev),
            change: 0,
            changeLabel: `${orders} orders`,
            sparklineData: [],
          }}
        />
        <KPICard
          data={{
            title: "Gross Margin",
            value: grossMargin,
            formattedValue: `${grossMargin.toFixed(1)}%`,
            change: grossMargin,
            changeLabel: `${formatCurrency(displayGrossProfit)} gross profit`,
            sparklineData: [],
          }}
        />
        <KPICard
          data={{
            title: "Net Profit",
            value: displayNetProfit,
            formattedValue: formatCurrency(displayNetProfit),
            change: netMargin,
            changeLabel: `${netMargin.toFixed(1)}% net margin`,
            sparklineData: [],
          }}
        />
      </div>

      <CategoryBar data={categoryBarData} amountLabel="Amount" />

      {children}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-semibold">Profit &amp; Loss Statement — {rangeLabel}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const rows: string[][] = [
                  ["Section", "Line item", "Amount (USD)"],
                  ["Summary", "Total revenue", pnl.totalRevenue.toFixed(2)],
                  ["Summary", "Total orders", String(pnl.totalOrders)],
                  ["Summary", "Gross profit", pnl.grossProfit.toFixed(2)],
                  ["Summary", "Net profit", pnl.netProfit.toFixed(2)],
                  ...Object.entries(pnl.revenueByPlatform).map(([plat, r]) => ["Revenue by platform", plat, r.toFixed(2)]),
                  ...pnl.channelBreakdown.flatMap((ch) => [
                    ["Channel", `${ch.name} (revenue)`, ch.revenue.toFixed(2)],
                    ["Channel", `${ch.name} (est. fees on synced orders)`, ch.platformFees.toFixed(2)],
                    ["Channel", `${ch.name} (est. COGS)`, ch.estimatedCogs.toFixed(2)],
                    ["Channel", `${ch.name} (est. profit)`, ch.estimatedProfit.toFixed(2)],
                  ]),
                  ["Expenses", "Marketplace", displayFees.marketplace.toFixed(2)],
                  ["Expenses", "Shipping (model)", displayFees.shipping.toFixed(2)],
                  ["Expenses", "Processing (model)", displayFees.processing.toFixed(2)],
                  ["Expenses", "Advertising", displayFees.advertising.toFixed(2)],
                  ["Expenses", "Refunds (model)", displayFees.refunds.toFixed(2)],
                  ["Expenses", "Other", displayFees.other.toFixed(2)],
                ];
                downloadCSV(
                  `channelpulse-pnl-${new Date().toISOString().split("T")[0]}.csv`,
                  rows[0],
                  rows.slice(1)
                );
              }}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            {!editing ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit Rates
              </Button>
            ) : null}
            {editing ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setSettings(pnl.costSettings);
                    setChannelRows(pnl.channelFeeOverrides);
                    setEditing(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="max-w-2xl">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Revenue</p>
            {Object.entries(pnl.revenueByPlatform).map(([platform, revenue]) => {
              const config = CHANNEL_CONFIG[platform as Platform];
              return revenue > 0 ? (
                <PnLRow
                  key={platform}
                  label={`${config?.label ?? platform} Sales`}
                  value={revenue}
                  indent
                  color={config?.color}
                  tooltip={`Revenue from ${config?.label ?? platform} orders.`}
                />
              ) : null;
            })}
            <Separator className="my-2" />
            <PnLRow label="Total Revenue" value={rev} bold tooltip="Sum of all channel revenue." />

            <div className="h-4" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              COGS (Cost of Goods Sold)
            </p>
            <PnLRow
              label={
                cs.cogs_method === "per_product"
                  ? "Product Costs (per-product)"
                  : cs.default_cogs_percent > 0
                    ? `Product Costs (${cs.default_cogs_percent}% of revenue)`
                    : "Product Costs"
              }
              value={effectiveCogs}
              indent
              negative
              tooltip={
                cs.cogs_method === "per_product"
                  ? `Using per-product costs from the Products page. Total: ${formatCurrency(pnl.cogs)}. Switch to percentage in Edit Rates if you prefer a flat rate.`
                  : cs.default_cogs_percent > 0
                    ? `Using percentage method: ${cs.default_cogs_percent}% × ${formatCurrency(rev)} = ${formatCurrency(cogsFromPercent)}. Switch to per-product in Edit Rates if you have individual costs.`
                    : "No COGS configured. Click Edit Rates to set a percentage or switch to per-product costs."
              }
            />
            <Separator className="my-2" />
            <PnLRow
              label="Gross Profit"
              value={displayGrossProfit}
              bold
              tooltip={`Revenue - COGS = ${formatCurrency(rev)} - ${formatCurrency(effectiveCogs)} = ${formatCurrency(displayGrossProfit)}.`}
            />
            <p className="text-xs text-muted-foreground text-right">{grossMargin.toFixed(1)}% margin</p>

            <div className="h-4" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Fees & Expenses</p>

            {editing ? (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30 mb-4">
                <p className="text-sm font-medium">Edit your cost rates</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Org defaults</span> apply to every store. Open{" "}
                  <span className="font-medium text-foreground">Per-store overrides</span> only where TikTok, Shopify,
                  etc. need different numbers. We do not pull official fee APIs yet—enter what you actually pay (from
                  each platform’s pricing or payouts).
                </p>

                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-3">
                  <Label className="text-xs font-medium">COGS — Cost of Goods Sold</Label>
                  <p className="text-[10px] text-muted-foreground">Choose how to calculate your product costs.</p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, cogs_method: "percentage" as CogsMethod })}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                        settings.cogs_method === "percentage"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      <Percent className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Use a percentage</p>
                        <p className="text-[10px] text-muted-foreground">Apply a flat % of revenue as COGS</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, cogs_method: "per_product" as CogsMethod })}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                        settings.cogs_method === "per_product"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium">Per-product costs</p>
                        <p className="text-[10px] text-muted-foreground">Use costs set on the Products page</p>
                      </div>
                    </button>
                  </div>

                  {settings.cogs_method === "percentage" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">COGS Percentage (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.default_cogs_percent}
                        onChange={(e) =>
                          setSettings({ ...settings, default_cogs_percent: parseFloat(e.target.value) || 0 })
                        }
                        className="h-8"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        E.g. 35% means your products cost ~35% of revenue. = {formatCurrency(rev)} ×{" "}
                        {settings.default_cogs_percent}% = {formatCurrency(cogsFromPercent)}.
                      </p>
                    </div>
                  )}

                  {settings.cogs_method === "per_product" && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground">
                        Using individual product costs from the Products page. Current total:{" "}
                        <span className="font-medium">{formatCurrency(pnl.cogs)}</span>.
                        {pnl.cogs === 0 && " No per-product costs set yet — go to Products to enter them."}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />
                <p className="text-xs font-medium text-muted-foreground">
                  Marketplace &amp; card fees — org defaults
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  These model what platforms and card networks take: a{" "}
                  <span className="font-medium text-foreground">percent of each sale</span> plus a{" "}
                  <span className="font-medium text-foreground">fixed dollar amount on every order</span> (like a
                  per-transaction fee). They are not your ad spend—ads are separate below.
                </p>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-background/80 p-3 text-xs leading-snug">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-3.5 shrink-0 rounded border-input"
                    checked={settings.use_modeled_platform_fees}
                    onChange={(e) => setSettings({ ...settings, use_modeled_platform_fees: e.target.checked })}
                  />
                  <span>
                    <span className="font-medium text-foreground">Use these rates for marketplace fees</span> instead of
                    the fee totals stored on synced orders. When checked, we calculate (this store’s revenue × % below)
                    + (this store’s orders × $ below) for each store, using per-store overrides when you set them.
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">% of sale (marketplace / cards)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.platform_fee_percent}
                      onChange={(e) =>
                        setSettings({ ...settings, platform_fee_percent: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Org default percent of each dollar sold (e.g. 2.9 = 2.9%). Applied per store unless overridden.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">$ per order (fixed)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.platform_fee_flat}
                      onChange={(e) =>
                        setSettings({ ...settings, platform_fee_flat: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Org default flat fee each time an order is placed (e.g. 0.30). Per store unless overridden.
                    </p>
                  </div>
                </div>

                <Collapsible open={perStoreOpen} onOpenChange={setPerStoreOpen}>
                  <CollapsibleTrigger
                    render={
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm font-medium hover:bg-muted/60"
                      >
                        Per-store overrides (optional)
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform ${perStoreOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    }
                  />
                  <CollapsibleContent className="pt-3 data-[state=closed]:hidden">
                    <div className="mb-3 space-y-1.5 rounded-md border border-dashed bg-muted/20 p-3 text-[10px] text-muted-foreground leading-relaxed">
                      <p>
                        <span className="font-medium text-foreground">Row 1 — Marketplace &amp; cards:</span> same idea
                        as org: <strong>% of this store’s sales</strong> and <strong>$ per order</strong>. Leave empty
                        to use the org defaults above ({settings.platform_fee_percent}% and $
                        {settings.platform_fee_flat.toFixed(2)}).
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Row 2 — Fulfillment &amp; processing:</span>{" "}
                        <strong>shipping %</strong> and <strong>card/processing %</strong> of{" "}
                        <em>this store’s revenue only</em>. Leave empty to use org shipping (
                        {settings.shipping_cost_percent}%) and processing ({settings.payment_processing_percent}%). If{" "}
                        <em>any</em> store sets shipping or processing, we use per-store math for that line.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Ads for this store:</span>{" "}
                        <strong>monthly</strong> ad spend for this channel only (e.g. TikTok Shop ads). Added to the
                        shared “monthly advertising” field org-wide—not a percent of sales.
                      </p>
                    </div>
                    <div className="max-h-[min(50vh,28rem)] space-y-3 overflow-y-auto pr-1">
                      {channelRows.map((row) => {
                        const cfg = CHANNEL_CONFIG[row.platform as Platform];
                        return (
                          <div
                            key={row.channelId}
                            className="rounded-md border border-border/80 bg-background/60 p-3 space-y-3"
                          >
                            <p className="text-xs font-medium">
                              {cfg?.color ? (
                                <span className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: cfg.color }} />
                              ) : null}
                              {row.name}
                              <span className="ml-1 font-normal text-muted-foreground">({cfg?.label ?? row.platform})</span>
                            </p>

                            <div>
                              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Marketplace &amp; card fees
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] leading-tight text-muted-foreground">
                                    % of this store’s sales (optional)
                                  </Label>
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="Org default"
                                    value={row.platform_fee_percent ?? ""}
                                    onChange={(e) =>
                                      updateChannelRow(row.channelId, {
                                        platform_fee_percent: numOrNull(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] leading-tight text-muted-foreground">
                                    $ per order on this store (optional)
                                  </Label>
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="Org default"
                                    value={row.platform_fee_flat ?? ""}
                                    onChange={(e) =>
                                      updateChannelRow(row.channelId, {
                                        platform_fee_flat: numOrNull(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Shipping &amp; processing (% of this store’s revenue)
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] leading-tight text-muted-foreground">
                                    Shipping % (optional)
                                  </Label>
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder={`Org ${settings.shipping_cost_percent}%`}
                                    value={row.shipping_cost_percent ?? ""}
                                    onChange={(e) =>
                                      updateChannelRow(row.channelId, {
                                        shipping_cost_percent: numOrNull(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] leading-tight text-muted-foreground">
                                    Payment processing % (optional)
                                  </Label>
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder={`Org ${settings.payment_processing_percent}%`}
                                    value={row.payment_processing_percent ?? ""}
                                    onChange={(e) =>
                                      updateChannelRow(row.channelId, {
                                        payment_processing_percent: numOrNull(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Ads (monthly)
                              </p>
                              <div className="space-y-1">
                                <Label className="text-[10px] leading-tight text-muted-foreground">
                                  This store’s ad spend / month ($)
                                </Label>
                                <Input
                                  className="h-8 text-xs max-w-[12rem]"
                                  placeholder="0 — none"
                                  value={row.marketing_monthly ?? ""}
                                  onChange={(e) =>
                                    updateChannelRow(row.channelId, {
                                      marketing_monthly: numOrNull(e.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />
                <p className="text-xs font-medium text-muted-foreground">Shipping, processing, ads — org defaults</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  These apply to <span className="font-medium text-foreground">total revenue</span> (shipping &amp;
                  processing) or are a <span className="font-medium text-foreground">single monthly number</span> (shared
                  ads). Override shipping/processing per store above if channels differ.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Shipping as % of revenue</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.shipping_cost_percent}
                      onChange={(e) =>
                        setSettings({ ...settings, shipping_cost_percent: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Blended estimate: fulfillment as a percent of sales (org default for all stores).
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment processing as % of revenue</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.payment_processing_percent}
                      onChange={(e) =>
                        setSettings({ ...settings, payment_processing_percent: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Gateway fees as a percent of sales when not using per-store overrides.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Shared monthly advertising ($)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={settings.advertising_monthly}
                      onChange={(e) =>
                        setSettings({ ...settings, advertising_monthly: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">Spend not tied to one store (optional)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Refund/Return Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.refund_rate_percent}
                      onChange={(e) =>
                        setSettings({ ...settings, refund_rate_percent: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">Estimated refunds as % of revenue</p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Other Monthly Expenses ($)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={settings.other_expenses_monthly}
                      onChange={(e) =>
                        setSettings({ ...settings, other_expenses_monthly: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">Software, warehousing, etc.</p>
                  </div>
                </div>
              </div>
            ) : null}

            <PnLRow
              label="Marketplace Fees"
              value={displayFees.marketplace}
              indent
              negative
              tooltip={marketplaceTooltip}
            />
            <PnLRow
              label="Shipping Costs"
              value={displayFees.shipping}
              indent
              negative
              tooltip={shippingExpenseTooltip}
            />
            <PnLRow
              label="Payment Processing"
              value={displayFees.processing}
              indent
              negative
              tooltip={processingExpenseTooltip}
            />
            <PnLRow label="Advertising" value={displayFees.advertising} indent negative tooltip={advertisingTooltip} />
            <PnLRow
              label="Returns & Refunds"
              value={displayFees.refunds}
              indent
              negative
              tooltip={`${cs.refund_rate_percent}% of revenue. = ${formatCurrency(rev)} × ${cs.refund_rate_percent}%.`}
            />
            {displayFees.other > 0 && (
              <PnLRow
                label="Other Expenses"
                value={displayFees.other}
                indent
                negative
                tooltip={`Monthly fixed expenses: ${formatCurrency(displayFees.other)}/month.`}
              />
            )}
            <Separator className="my-2" />
            <PnLRow
              label="Total Expenses"
              value={displayFees.total}
              bold
              negative
              tooltip={`Sum of all fees shown above.`}
            />

            <div className="h-2" />
            <Separator className="my-2 border-2" />
            <div
              className={`rounded-lg px-4 -mx-4 ${displayNetProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}`}
            >
              <PnLRow
                label="NET PROFIT"
                value={displayNetProfit}
                bold
                highlight
                tooltip={`Gross Profit (${formatCurrency(displayGrossProfit)}) - Total Expenses (${formatCurrency(displayFees.total)}) = ${formatCurrency(displayNetProfit)}.`}
              />
              <p
                className={`text-xs text-right pb-3 ${displayNetProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {netMargin.toFixed(1)}% net margin
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
