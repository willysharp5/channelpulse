"use client";

import { useState } from "react";
import { Info, Pencil, Save, Loader2, X, Percent, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";
import type { CostSettings, CogsMethod } from "@/lib/queries";

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
}

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />} />
      <TooltipContent side="top" className="max-w-[280px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function KpiTip({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />} />
      <TooltipContent side="top" className="max-w-[280px] text-xs">{tip}</TooltipContent>
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
    <div className={`flex items-center justify-between py-1.5 ${indent ? "pl-6" : ""} ${bold ? "font-semibold" : ""} ${highlight ? "text-lg py-3" : ""}`}>
      <span className="flex items-center gap-2">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
        {label}
        {tooltip && <Tip text={tooltip} />}
      </span>
      <span className={`tabular-nums ${negative ? "text-red-500" : ""}`}>
        {negative ? "-" : ""}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export function PnLContent({ pnl }: { pnl: PnLData }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(pnl.costSettings);

  const rev = pnl.totalRevenue;
  const orders = pnl.totalOrders;

  // Recalculate with current settings
  const marketplaceFees = (rev * settings.platform_fee_percent / 100) + (orders * settings.platform_fee_flat);
  const shippingCost = rev * (settings.shipping_cost_percent / 100);
  const processingFees = rev * (settings.payment_processing_percent / 100);
  const advertising = settings.advertising_monthly;
  const refunds = rev * (settings.refund_rate_percent / 100);
  const otherExpenses = settings.other_expenses_monthly;
  const totalExpenses = marketplaceFees + shippingCost + processingFees + advertising + refunds + otherExpenses;
  const cogsFromPercent = settings.default_cogs_percent > 0 ? (rev * settings.default_cogs_percent / 100) : 0;
  const effectiveCogs = settings.cogs_method === "per_product" ? pnl.cogs : cogsFromPercent;
  const grossProfit = rev - effectiveCogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = rev > 0 ? (grossProfit / rev) * 100 : 0;
  const netMargin = rev > 0 ? (netProfit / rev) * 100 : 0;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Total Revenue
              <KpiTip tip="Gross revenue from all connected channels. Sum of all order amounts including tax and shipping." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(rev)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Gross Margin
              <KpiTip tip={`(Revenue - COGS) ÷ Revenue × 100 = (${formatCurrency(rev)} - ${formatCurrency(effectiveCogs)}) ÷ ${formatCurrency(rev)} = ${grossMargin.toFixed(1)}%. COGS method: ${settings.cogs_method === "per_product" ? "per-product costs" : `${settings.default_cogs_percent}% of revenue`}.`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-500">{grossMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Net Profit
              <KpiTip tip={`Gross Profit (${formatCurrency(grossProfit)}) - Total Expenses (${formatCurrency(totalExpenses)}) = ${formatCurrency(netProfit)}. Margin: ${netMargin.toFixed(1)}%.`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">{netMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Profit & Loss Statement — Last 30 Days
          </CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit Rates
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSettings(pnl.costSettings); setEditing(false); }}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="max-w-2xl">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Revenue</p>
            {Object.entries(pnl.revenueByPlatform).map(([platform, revenue]) => {
              const config = CHANNEL_CONFIG[platform as Platform];
              return revenue > 0 ? (
                <PnLRow key={platform} label={`${config?.label ?? platform} Sales`} value={revenue} indent color={config?.color} tooltip={`Revenue from ${config?.label ?? platform} orders.`} />
              ) : null;
            })}
            <Separator className="my-2" />
            <PnLRow label="Total Revenue" value={rev} bold tooltip="Sum of all channel revenue." />

            <div className="h-4" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              COGS (Cost of Goods Sold)
            </p>
            <PnLRow
              label={settings.cogs_method === "per_product"
                ? "Product Costs (per-product)"
                : settings.default_cogs_percent > 0
                  ? `Product Costs (${settings.default_cogs_percent}% of revenue)`
                  : "Product Costs"
              }
              value={effectiveCogs}
              indent
              negative
              tooltip={settings.cogs_method === "per_product"
                ? `Using per-product costs from the Products page. Total: ${formatCurrency(pnl.cogs)}. Switch to percentage in Edit Rates if you prefer a flat rate.`
                : settings.default_cogs_percent > 0
                  ? `Using percentage method: ${settings.default_cogs_percent}% × ${formatCurrency(rev)} = ${formatCurrency(effectiveCogs)}. Switch to per-product in Edit Rates if you have individual costs.`
                  : "No COGS configured. Click Edit Rates to set a percentage or switch to per-product costs."
              }
            />
            <Separator className="my-2" />
            <PnLRow label="Gross Profit" value={grossProfit} bold tooltip={`Revenue - COGS = ${formatCurrency(rev)} - ${formatCurrency(effectiveCogs)} = ${formatCurrency(grossProfit)}.`} />
            <p className="text-xs text-muted-foreground text-right">{grossMargin.toFixed(1)}% margin</p>

            <div className="h-4" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Fees & Expenses</p>

            {editing ? (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30 mb-4">
                <p className="text-sm font-medium">Edit your cost rates</p>

                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-3">
                  <Label className="text-xs font-medium">COGS — Cost of Goods Sold</Label>
                  <p className="text-[10px] text-muted-foreground">Choose how to calculate your product costs.</p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
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
                      <Input type="number" step="0.1" value={settings.default_cogs_percent} onChange={(e) => setSettings({ ...settings, default_cogs_percent: parseFloat(e.target.value) || 0 })} className="h-8" />
                      <p className="text-[10px] text-muted-foreground">
                        E.g. 35% means your products cost ~35% of revenue. = {formatCurrency(rev)} × {settings.default_cogs_percent}% = {formatCurrency(cogsFromPercent)}.
                      </p>
                    </div>
                  )}

                  {settings.cogs_method === "per_product" && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground">
                        Using individual product costs from the Products page. Current total: <span className="font-medium">{formatCurrency(pnl.cogs)}</span>.
                        {pnl.cogs === 0 && " No per-product costs set yet — go to Products to enter them."}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />
                <p className="text-xs font-medium text-muted-foreground">Fees & Expenses</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marketplace Fee (%)</Label>
                    <Input type="number" step="0.1" value={settings.platform_fee_percent} onChange={(e) => setSettings({ ...settings, platform_fee_percent: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Percentage of revenue charged by the marketplace</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Per-Transaction Fee ($)</Label>
                    <Input type="number" step="0.01" value={settings.platform_fee_flat} onChange={(e) => setSettings({ ...settings, platform_fee_flat: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Flat fee per transaction (e.g. $0.30)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Shipping Cost (%)</Label>
                    <Input type="number" step="0.1" value={settings.shipping_cost_percent} onChange={(e) => setSettings({ ...settings, shipping_cost_percent: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Estimated shipping as % of revenue</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Processing (%)</Label>
                    <Input type="number" step="0.1" value={settings.payment_processing_percent} onChange={(e) => setSettings({ ...settings, payment_processing_percent: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Payment gateway fee (e.g. Stripe 2.9%)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monthly Advertising ($)</Label>
                    <Input type="number" step="1" value={settings.advertising_monthly} onChange={(e) => setSettings({ ...settings, advertising_monthly: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Your monthly ad spend (Google, Meta, etc.)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Refund/Return Rate (%)</Label>
                    <Input type="number" step="0.1" value={settings.refund_rate_percent} onChange={(e) => setSettings({ ...settings, refund_rate_percent: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Estimated refund rate as % of revenue</p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Other Monthly Expenses ($)</Label>
                    <Input type="number" step="1" value={settings.other_expenses_monthly} onChange={(e) => setSettings({ ...settings, other_expenses_monthly: parseFloat(e.target.value) || 0 })} className="h-8" />
                    <p className="text-[10px] text-muted-foreground">Any other fixed monthly costs (software, warehousing, etc.)</p>
                  </div>
                </div>
              </div>
            ) : null}

            <PnLRow label="Marketplace Fees" value={marketplaceFees} indent negative tooltip={`${settings.platform_fee_percent}% of revenue + $${settings.platform_fee_flat.toFixed(2)} per order. = (${formatCurrency(rev)} × ${settings.platform_fee_percent}%) + (${orders} × $${settings.platform_fee_flat.toFixed(2)}).`} />
            <PnLRow label="Shipping Costs" value={shippingCost} indent negative tooltip={`${settings.shipping_cost_percent}% of revenue. = ${formatCurrency(rev)} × ${settings.shipping_cost_percent}%.`} />
            <PnLRow label="Payment Processing" value={processingFees} indent negative tooltip={`${settings.payment_processing_percent}% of revenue. = ${formatCurrency(rev)} × ${settings.payment_processing_percent}%.`} />
            <PnLRow label="Advertising" value={advertising} indent negative tooltip={`Monthly ad spend: ${formatCurrency(advertising)}/month. Edit to set your actual ad budget.`} />
            <PnLRow label="Returns & Refunds" value={refunds} indent negative tooltip={`${settings.refund_rate_percent}% of revenue. = ${formatCurrency(rev)} × ${settings.refund_rate_percent}%.`} />
            {otherExpenses > 0 && (
              <PnLRow label="Other Expenses" value={otherExpenses} indent negative tooltip={`Monthly fixed expenses: ${formatCurrency(otherExpenses)}/month.`} />
            )}
            <Separator className="my-2" />
            <PnLRow label="Total Expenses" value={totalExpenses} bold negative tooltip={`Sum of all fees: ${formatCurrency(marketplaceFees)} + ${formatCurrency(shippingCost)} + ${formatCurrency(processingFees)} + ${formatCurrency(advertising)} + ${formatCurrency(refunds)}${otherExpenses > 0 ? ` + ${formatCurrency(otherExpenses)}` : ""}.`} />

            <div className="h-2" />
            <Separator className="my-2 border-2" />
            <PnLRow label="NET PROFIT" value={netProfit} bold highlight tooltip={`Gross Profit (${formatCurrency(grossProfit)}) - Total Expenses (${formatCurrency(totalExpenses)}) = ${formatCurrency(netProfit)}.`} />
            <p className="text-xs text-muted-foreground text-right">{netMargin.toFixed(1)}% net margin</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
