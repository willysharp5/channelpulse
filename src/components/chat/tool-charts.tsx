"use client";

import { TremorAreaChart } from "@/components/tremor/area-chart";
import { TremorBarChart } from "@/components/tremor/bar-chart";
import { TremorDonutChart, type DonutDataItem } from "@/components/tremor/donut-chart";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

function channelColor(name: string): string {
  const key = name.toLowerCase() as Platform;
  return CHANNEL_CONFIG[key]?.color ?? "#6b7280";
}

function fmt(n: number): string {
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return n.toFixed(1) + "%";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ToolResultChart({ toolName, result }: { toolName: string; result: any }) {
  if (!result) return null;

  switch (toolName) {
    case "getDashboardOverview":
      return <DashboardOverviewChart data={result} />;
    case "getChannelBreakdown":
      return <ChannelBreakdownChart data={result} />;
    case "getProfitAndLoss":
      return <PnLChart data={result} />;
    case "getTopProducts":
      return <TopProductsTable data={result} />;
    case "getOrdersSummary":
      return <OrdersTable data={result} />;
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DashboardOverviewChart({ data }: { data: any }) {
  const { kpis, revenueSeries, platforms } = data;
  if (!kpis) return null;

  const stats = [
    { label: "Revenue", value: fmt(kpis.revenue?.value ?? 0), change: kpis.revenue?.change },
    { label: "Orders", value: (kpis.orders?.value ?? 0).toLocaleString(), change: kpis.orders?.change },
    { label: "Profit", value: fmt(kpis.profit?.value ?? 0), change: kpis.profit?.change },
    { label: "AOV", value: fmt(kpis.aov?.value ?? 0), change: kpis.aov?.change },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{s.value}</p>
            {s.change != null && (
              <span
                className={`text-xs font-medium ${
                  s.change >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {s.change >= 0 ? "↑" : "↓"} {pct(Math.abs(s.change))}
              </span>
            )}
          </div>
        ))}
      </div>

      {revenueSeries?.length > 0 && platforms?.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Revenue by Channel</p>
          <TremorAreaChart
            data={revenueSeries}
            index="date"
            categories={platforms}
            colors={platforms.map((p: string) => channelColor(p))}
            valueFormatter={(v) => fmt(v)}
          />
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChannelBreakdownChart({ data }: { data: any }) {
  const channels = data.channels;
  if (!channels?.length) return null;

  const donutData: DonutDataItem[] = channels.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ch: any) => ({
      name: ch.label || ch.channel,
      value: ch.revenue ?? 0,
      color: channelColor(ch.channel),
    })
  );

  const barData = channels.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ch: any) => ({
      name: ch.label || ch.channel,
      Revenue: ch.revenue ?? 0,
      Orders: ch.orders ?? 0,
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-4 sm:flex-row">
        <TremorDonutChart
          data={donutData}
          label="Revenue"
          valueFormatter={fmt}
          size={160}
        />
        <div className="flex flex-col gap-2">
          {donutData.map((d) => {
            const total = donutData.reduce((s, x) => s + x.value, 0);
            const share = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {fmt(d.value)} ({share}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Revenue by Channel</p>
        <TremorBarChart
          data={barData}
          index="name"
          categories={["Revenue"]}
          colors={channels.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ch: any) => channelColor(ch.channel)
          )}
          valueFormatter={fmt}
        />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PnLChart({ data }: { data: any }) {
  const stats = [
    { label: "Revenue", value: fmt(data.totalRevenue ?? 0) },
    { label: "COGS", value: fmt(data.cogs ?? 0) },
    { label: "Gross Profit", value: fmt(data.grossProfit ?? 0), sub: pct(data.grossMargin ?? 0) + " margin" },
    { label: "Net Profit", value: fmt(data.netProfit ?? 0), sub: pct(data.netMargin ?? 0) + " margin" },
  ];

  const fees = data.fees;
  const feeData = fees
    ? [
        { name: "Marketplace", value: fees.marketplace ?? 0 },
        { name: "Shipping", value: fees.shipping ?? 0 },
        { name: "Processing", value: fees.processing ?? 0 },
        { name: "Advertising", value: fees.advertising ?? 0 },
        { name: "Refunds", value: fees.refunds ?? 0 },
        { name: "Other", value: fees.other ?? 0 },
      ].filter((f) => f.value > 0)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      {feeData.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Expense Breakdown</p>
          <TremorBarChart
            data={feeData.map((f) => ({ name: f.name, Amount: f.value }))}
            index="name"
            categories={["Amount"]}
            valueFormatter={fmt}
          />
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TopProductsTable({ data }: { data: any }) {
  const products = data.products;
  if (!products?.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Product</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Revenue</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Units</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Platform</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {products.map((p: any, i: number) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="max-w-[200px] truncate px-3 py-2 font-medium">{p.title || p.name}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(p.revenue ?? 0)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{p.unitsSold ?? p.units ?? 0}</td>
              <td className="px-3 py-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: channelColor(p.platform ?? "") }}
                  />
                  {p.platform ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrdersTable({ data }: { data: any }) {
  const orders = data.orders;
  if (!orders?.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Order</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Customer</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Amount</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Platform</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {orders.map((o: any, i: number) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium">#{o.order_number || o.platform_order_id || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{o.customer_name || "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(o.total_amount ?? 0)}</td>
              <td className="px-3 py-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  o.status === "fulfilled" || o.status === "paid"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : o.status === "cancelled" || o.status === "refunded"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-amber-500/10 text-amber-600"
                }`}>
                  {o.status ?? "—"}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: channelColor(o.platform ?? "") }}
                  />
                  {o.platform ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
