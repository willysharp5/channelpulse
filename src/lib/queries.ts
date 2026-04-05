import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImpersonatedUserId } from "@/lib/admin/impersonate";
import { DEMO_ORG_ID } from "@/lib/demo-data";
import { PLAN_LIMITS } from "@/lib/constants";
import {
  topProductsFromOrders,
  rollupForProducts,
  lookupProductSales,
  type TopProductSale,
} from "@/lib/sales-from-orders";
import { computePnLExpenseTotals, type ChannelPnlOverride } from "@/lib/pnl-model";

export type { TopProductSale };

export async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();

  const impersonatedUserId = await getImpersonatedUserId();

  if (impersonatedUserId) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        (await supabase.auth.getUser()).data.user?.id ?? ""
      )
      .single();

    if (adminProfile?.role === "super_admin") {
      const sb = createAdminClient();
      const { data: targetProfile } = await sb
        .from("profiles")
        .select("org_id")
        .eq("id", impersonatedUserId)
        .single();
      return targetProfile?.org_id ?? null;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  return profile?.org_id ?? null;
}

/**
 * Session org + Supabase client, or service-role client for the fixed public demo org only.
 */
export async function resolveOrgScope(
  demoOrgId?: string | null
): Promise<{ orgId: string; supabase: SupabaseClient } | null> {
  if (demoOrgId) {
    if (demoOrgId !== DEMO_ORG_ID) return null;
    return { orgId: DEMO_ORG_ID, supabase: createAdminClient() };
  }
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return null;
  return { orgId, supabase };
}

export function getDemoUserPlan(): {
  plan: string;
  limits: { channels: number; ordersPerMonth: number };
  status: "active" | "cancelling" | "expired" | "free";
  periodEnd: string | null;
} {
  return { plan: "scale", limits: PLAN_LIMITS.scale, status: "active", periodEnd: null };
}

const EMPTY_STATS = {
  revenue: { value: 0, change: 0 },
  orders: { value: 0, change: 0 },
  profit: { value: 0, change: 0 },
  aov: { value: 0, change: 0 },
  units: { value: 0, change: 0 },
};

import { getDateRange, type DateParams } from "./date-range-bounds";
import { buildReportingChannelsFilter, type ReportingChannelsFilter } from "@/lib/reporting-channel-filter";

export type { DateParams };
export { getDateRange };
export type { ReportingChannelsFilter };

export async function getReportingChannelsFilter(demoOrgId?: string | null): Promise<ReportingChannelsFilter> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return { kind: "none" };
  return buildReportingChannelsFilter(scope.supabase, scope.orgId);
}

export async function getDashboardStats(params: DateParams = { days: 30 }, demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return EMPTY_STATS;
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return EMPTY_STATS;
  }

  const { fromStr, toStr, prevFromStr, prevToStr } = getDateRange(params);

  let currentQ = supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);
  if (reportFilter.kind === "include_only") {
    currentQ = currentQ.in("channel_id", reportFilter.channelIds);
  }
  const { data: currentStats } = await currentQ;

  let prevQ = supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", prevFromStr)
    .lt("date", prevToStr);
  if (reportFilter.kind === "include_only") {
    prevQ = prevQ.in("channel_id", reportFilter.channelIds);
  }
  const { data: prevStats } = await prevQ;

  const sumField = (rows: Record<string, unknown>[] | null, field: string) =>
    rows?.reduce((s, r) => s + Number(r[field] || 0), 0) ?? 0;

  const currentRevenue = sumField(currentStats, "total_revenue");
  const currentOrders = sumField(currentStats, "total_orders");
  const currentProfit = sumField(currentStats, "estimated_profit");
  const currentUnits = sumField(currentStats, "total_units");
  const currentAOV = currentOrders > 0 ? currentRevenue / currentOrders : 0;

  const prevRevenue = sumField(prevStats, "total_revenue");
  const prevOrders = sumField(prevStats, "total_orders");
  const prevProfit = sumField(prevStats, "estimated_profit");
  const prevUnits = sumField(prevStats, "total_units");
  const prevAOV = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  return {
    revenue: { value: currentRevenue, change: pctChange(currentRevenue, prevRevenue) },
    orders: { value: currentOrders, change: pctChange(currentOrders, prevOrders) },
    profit: { value: currentProfit, change: pctChange(currentProfit, prevProfit) },
    aov: { value: currentAOV, change: pctChange(currentAOV, prevAOV) },
    units: { value: currentUnits, change: pctChange(currentUnits, prevUnits) },
  };
}

export interface ComparisonStats {
  revenue: number;
  orders: number;
  profit: number;
  units: number;
  aov: number;
}

export async function getComparisonStats(
  compareFrom: string,
  compareTo: string,
  demoOrgId?: string | null
): Promise<ComparisonStats> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return { revenue: 0, orders: 0, profit: 0, units: 0, aov: 0 };
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return { revenue: 0, orders: 0, profit: 0, units: 0, aov: 0 };
  }

  let q = supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", compareFrom)
    .lte("date", compareTo);
  if (reportFilter.kind === "include_only") {
    q = q.in("channel_id", reportFilter.channelIds);
  }
  const { data } = await q;

  const sumField = (rows: Record<string, unknown>[] | null, field: string) =>
    rows?.reduce((s, r) => s + Number(r[field] || 0), 0) ?? 0;

  const revenue = sumField(data, "total_revenue");
  const orders = sumField(data, "total_orders");
  const profit = sumField(data, "estimated_profit");
  const units = sumField(data, "total_units");
  const aov = orders > 0 ? revenue / orders : 0;

  return { revenue, orders, profit, units, aov };
}

export async function getComparisonRevenueSeries(
  compareFrom: string,
  compareTo: string,
  demoOrgId?: string | null
): Promise<{ date: string; total: number }[]> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let q = supabase
    .from("daily_stats")
    .select("date, total_revenue")
    .eq("org_id", orgId)
    .gte("date", compareFrom)
    .lte("date", compareTo)
    .order("date", { ascending: true });
  if (reportFilter.kind === "include_only") {
    q = q.in("channel_id", reportFilter.channelIds);
  }
  const { data } = await q;

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + Number(row.total_revenue));
  }

  return Array.from(byDate.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface RevenuePoint {
  date: string;
  total: number;
  [key: string]: string | number;
}

export async function getRevenueSeries(
  params: DateParams = { days: 30 },
  demoOrgId?: string | null
): Promise<{ series: RevenuePoint[]; platforms: string[] }> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return { series: [], platforms: [] };
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return { series: [], platforms: [] };
  }

  const { fromStr, toStr } = getDateRange(params);

  let statsQ = supabase
    .from("daily_stats")
    .select("date, channel_id, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date", { ascending: true });
  if (reportFilter.kind === "include_only") {
    statsQ = statsQ.in("channel_id", reportFilter.channelIds);
  }
  const { data: stats } = await statsQ;

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform")
    .eq("org_id", orgId);

  const channelMap = new Map(channels?.map((c) => [c.id, c.platform]) ?? []);

  // Group by date, split by platform
  const byDate = new Map<string, Record<string, number>>();
  for (const row of stats ?? []) {
    const platform = channelMap.get(row.channel_id) ?? "other";
    const existing = byDate.get(row.date) ?? { total: 0 };
    existing[platform] = (existing[platform] ?? 0) + Number(row.total_revenue);
    existing.total += Number(row.total_revenue);
    byDate.set(row.date, existing);
  }

  const activePlatformSet = new Set<string>();
  for (const row of stats ?? []) {
    const platform = channelMap.get(row.channel_id);
    if (platform) activePlatformSet.add(platform);
  }

  const series = Array.from(byDate.entries())
    .map(([date, values]) => ({ date, ...values } as RevenuePoint))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { series, platforms: [...activePlatformSet] };
}

export async function getChannelRevenue(params: DateParams = { days: 30 }, demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  const { fromStr, toStr } = getDateRange(params);

  let statsQ = supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);
  if (reportFilter.kind === "include_only") {
    statsQ = statsQ.in("channel_id", reportFilter.channelIds);
  }
  const { data: stats } = await statsQ;

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, name")
    .eq("org_id", orgId);

  const channelMap = new Map(
    channels?.map((c) => [c.id, { platform: c.platform, name: c.name }]) ?? []
  );

  const byChannel = new Map<string, { revenue: number; orders: number; platform: string; name: string }>();
  for (const row of stats ?? []) {
    const ch = channelMap.get(row.channel_id);
    if (!ch) continue;
    const existing = byChannel.get(row.channel_id) ?? {
      revenue: 0,
      orders: 0,
      platform: ch.platform,
      name: ch.name,
    };
    existing.revenue += Number(row.total_revenue);
    existing.orders += Number(row.total_orders);
    byChannel.set(row.channel_id, existing);
  }

  const totalRevenue = Array.from(byChannel.values()).reduce((s, c) => s + c.revenue, 0);

  return Array.from(byChannel.entries()).map(([channelId, ch]) => ({
    channelId,
    channel: ch.platform,
    label: ch.name,
    revenue: ch.revenue,
    orders: ch.orders,
    percentage: totalRevenue > 0 ? Math.round((ch.revenue / totalRevenue) * 100) : 0,
  }));
}

export async function getRecentOrders(limit = 10, demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let q = supabase
    .from("orders")
    .select("id, platform, platform_order_id, order_number, status, customer_name, total_amount, currency, ordered_at")
    .eq("org_id", orgId)
    .order("ordered_at", { ascending: false })
    .limit(limit);
  if (reportFilter.kind === "include_only") {
    q = q.in("channel_id", reportFilter.channelIds);
  }
  const { data: orders } = await q;

  return orders ?? [];
}

export async function getAllOrders(demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let q = supabase
    .from("orders")
    .select("id, platform, platform_order_id, order_number, status, financial_status, customer_name, customer_email, total_amount, subtotal, total_tax, total_shipping, total_discounts, platform_fees, net_profit, currency, item_count, ordered_at")
    .eq("org_id", orgId)
    .order("ordered_at", { ascending: false });
  if (reportFilter.kind === "include_only") {
    q = q.in("channel_id", reportFilter.channelIds);
  }
  const { data: orders } = await q;

  return orders ?? [];
}

export async function getChannels(demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  return channels ?? [];
}

export async function getChannelsWithStats(params: DateParams = { days: 30 }, demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);

  const { fromStr, toStr } = getDateRange(params);

  let channelsQ = supabase
    .from("channels")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (reportFilter.kind === "include_only") {
    channelsQ = channelsQ.in("id", reportFilter.channelIds.length > 0 ? reportFilter.channelIds : ["__none__"]);
  }
  const { data: channels } = await channelsQ;

  let statsQ = supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders, total_units")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);
  if (reportFilter.kind === "include_only") {
    statsQ = statsQ.in("channel_id", reportFilter.channelIds.length > 0 ? reportFilter.channelIds : ["__none__"]);
  }
  const { data: stats } = await statsQ;

  const statsByChannel = new Map<string, { revenue: number; orders: number; units: number }>();
  for (const row of stats ?? []) {
    const existing = statsByChannel.get(row.channel_id) ?? { revenue: 0, orders: 0, units: 0 };
    existing.revenue += Number(row.total_revenue);
    existing.orders += Number(row.total_orders);
    existing.units += Number(row.total_units);
    statsByChannel.set(row.channel_id, existing);
  }

  return (channels ?? []).map((ch) => {
    const s = statsByChannel.get(ch.id) ?? { revenue: 0, orders: 0, units: 0 };
    return { ...ch, revenue: s.revenue, ordersCount: s.orders, units: s.units };
  });
}

export async function getProducts(demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let pq = supabase.from("products").select("*").eq("org_id", orgId).order("title", { ascending: true });
  if (reportFilter.kind === "include_only") {
    pq = pq.in("channel_id", reportFilter.channelIds);
  }

  const [{ data: products }, { data: channels }] = await Promise.all([
    pq,
    supabase.from("channels").select("id, platform, name").eq("org_id", orgId),
  ]);

  const chMap = new Map((channels ?? []).map((c) => [c.id, c]));

  return (products ?? []).map((p) => {
    const cid = (p as { channel_id?: string | null }).channel_id;
    const ch = cid ? chMap.get(cid) : undefined;
    return {
      ...p,
      channels: ch ? { platform: ch.platform, name: ch.name } : null,
    };
  });
}

export async function getTopProductsBySales(
  params: DateParams = { days: 30 },
  limit = 10,
  demoOrgId?: string | null
): Promise<TopProductSale[]> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  const { fromStr, toStr } = getDateRange(params);
  const fromIso = `${fromStr}T00:00:00.000Z`;
  const toIso = `${toStr}T23:59:59.999Z`;

  let oq = supabase
    .from("orders")
    .select("id, platform, raw_data, total_amount, item_count")
    .eq("org_id", orgId)
    .gte("ordered_at", fromIso)
    .lte("ordered_at", toIso)
    .neq("status", "cancelled");
  if (reportFilter.kind === "include_only") {
    oq = oq.in("channel_id", reportFilter.channelIds);
  }
  const { data: orders } = await oq;

  return topProductsFromOrders(orders ?? [], limit);
}

export type ProductWithSales = Awaited<ReturnType<typeof getProductsWithSales>>[number];

export async function getProductsWithSales(params: DateParams = { days: 30 }, demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  const { fromStr, toStr } = getDateRange(params);
  const fromIso = `${fromStr}T00:00:00.000Z`;
  const toIso = `${toStr}T23:59:59.999Z`;

  let orderQ = supabase
    .from("orders")
    .select("id, platform, raw_data, total_amount, item_count")
    .eq("org_id", orgId)
    .gte("ordered_at", fromIso)
    .lte("ordered_at", toIso)
    .neq("status", "cancelled");
  if (reportFilter.kind === "include_only") {
    orderQ = orderQ.in("channel_id", reportFilter.channelIds);
  }

  const [products, { data: orders }] = await Promise.all([getProducts(demoOrgId), orderQ]);

  const rollup = rollupForProducts(orders ?? []);

  return products.map((p) => {
    const sales = lookupProductSales(
      { sku: p.sku as string | null, title: p.title as string },
      rollup
    );
    const ch = p.channels as { platform?: string; name?: string } | null;
    const channelPlatform = (ch?.platform as string) || "";
    const channelName = ch?.name || "";
    return {
      ...p,
      unitsSold: sales.unitsSold,
      revenue: sales.revenue,
      salesPlatform: sales.platform || channelPlatform,
      channelLabel: channelName || channelPlatform || "—",
    };
  });
}

export type CogsMethod = "percentage" | "per_product";

export interface CostSettings {
  platform_fee_percent: number;
  platform_fee_flat: number;
  shipping_cost_percent: number;
  payment_processing_percent: number;
  advertising_monthly: number;
  refund_rate_percent: number;
  other_expenses_monthly: number;
  default_cogs_percent: number;
  cogs_method: CogsMethod;
  /** When true, P&L marketplace fees = sum of per-store modeled fees (overrides + org defaults), not synced order totals. */
  use_modeled_platform_fees: boolean;
}

const DEFAULT_COST_SETTINGS: CostSettings = {
  platform_fee_percent: 2.9,
  platform_fee_flat: 0.3,
  shipping_cost_percent: 3.5,
  payment_processing_percent: 2.9,
  advertising_monthly: 0,
  refund_rate_percent: 2.0,
  other_expenses_monthly: 0,
  default_cogs_percent: 0,
  cogs_method: "percentage",
  use_modeled_platform_fees: false,
};

export async function getCostSettings(demoOrgId?: string | null): Promise<CostSettings> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return DEFAULT_COST_SETTINGS;
  const { orgId, supabase } = scope;

  const { data } = await supabase
    .from("cost_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (!data) return DEFAULT_COST_SETTINGS;

  return {
    platform_fee_percent: Number(data.platform_fee_percent ?? 2.9),
    platform_fee_flat: Number(data.platform_fee_flat ?? 0.3),
    shipping_cost_percent: Number(data.shipping_cost_percent ?? 3.5),
    payment_processing_percent: Number(data.payment_processing_percent ?? 2.9),
    advertising_monthly: Number(data.advertising_monthly ?? 0),
    refund_rate_percent: Number(data.refund_rate_percent ?? 2.0),
    other_expenses_monthly: Number(data.other_expenses_monthly ?? 0),
    default_cogs_percent: Number(data.default_cogs_percent ?? 0),
    cogs_method: (data.cogs_method as CogsMethod) ?? "percentage",
    use_modeled_platform_fees: Boolean(data.use_modeled_platform_fees),
  };
}

export interface PnLChannelRow {
  channelId: string;
  platform: string;
  name: string;
  revenue: number;
  orders: number;
  platformFees: number;
  estimatedCogs: number;
  estimatedProfit: number;
}

/** Per-store fee/marketing inputs for P&L (null = use org defaults for % / flat). */
export interface PnLChannelFeeRow {
  channelId: string;
  name: string;
  platform: string;
  platform_fee_percent: number | null;
  platform_fee_flat: number | null;
  marketing_monthly: number | null;
  shipping_cost_percent: number | null;
  payment_processing_percent: number | null;
}

const EMPTY_PNL = {
  totalRevenue: 0, totalOrders: 0, revenueByPlatform: {} as Record<string, number>,
  cogs: 0, grossProfit: 0, grossMargin: 0,
  fees: { marketplace: 0, shipping: 0, processing: 0, advertising: 0, refunds: 0, other: 0, total: 0 },
  netProfit: 0, netMargin: 0,
  costSettings: DEFAULT_COST_SETTINGS,
  channelBreakdown: [] as PnLChannelRow[],
  channelFeeOverrides: [] as PnLChannelFeeRow[],
};

export async function getPnLData(params: DateParams = { days: 30 }, demoOrgId?: string | null) {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return EMPTY_PNL;
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return EMPTY_PNL;
  }

  const { fromStr, toStr } = getDateRange(params);

  let statsQ = supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);
  if (reportFilter.kind === "include_only") {
    statsQ = statsQ.in("channel_id", reportFilter.channelIds);
  }
  const { data: stats } = await statsQ;

  let channelsQ = supabase
    .from("channels")
    .select("id, platform, name")
    .eq("org_id", orgId);
  if (reportFilter.kind === "include_only") {
    channelsQ = channelsQ.in("id", reportFilter.channelIds.length > 0 ? reportFilter.channelIds : ["__none__"]);
  }
  const { data: channels } = await channelsQ;

  const channelMap = new Map(channels?.map((c) => [c.id, { platform: c.platform, name: c.name }]) ?? []);

  let productsQ = supabase.from("products").select("cogs").eq("org_id", orgId);
  if (reportFilter.kind === "include_only") {
    productsQ = productsQ.in("channel_id", reportFilter.channelIds);
  }
  const { data: products } = await productsQ;

  const perProductCogs = (products ?? []).reduce((s, p) => s + Number(p.cogs ?? 0), 0);

  const revenueByPlatform: Record<string, number> = {};
  let totalRevenue = 0;
  let totalOrders = 0;

  const byChannelAgg = new Map<
    string,
    { revenue: number; orders: number; platformFees: number; estimatedCogs: number; estimatedProfit: number }
  >();

  for (const row of stats ?? []) {
    const ch = channelMap.get(row.channel_id);
    const platform = ch?.platform ?? "other";
    revenueByPlatform[platform] = (revenueByPlatform[platform] ?? 0) + Number(row.total_revenue);
    totalRevenue += Number(row.total_revenue);
    totalOrders += Number(row.total_orders);

    const cid = row.channel_id as string;
    const ex = byChannelAgg.get(cid) ?? {
      revenue: 0,
      orders: 0,
      platformFees: 0,
      estimatedCogs: 0,
      estimatedProfit: 0,
    };
    ex.revenue += Number(row.total_revenue);
    ex.orders += Number(row.total_orders);
    ex.platformFees += Number(row.platform_fees);
    ex.estimatedCogs += Number(row.estimated_cogs);
    ex.estimatedProfit += Number(row.estimated_profit);
    byChannelAgg.set(cid, ex);
  }

  const channelBreakdown: PnLChannelRow[] = Array.from(byChannelAgg.entries()).map(([channelId, agg]) => {
    const ch = channelMap.get(channelId);
    return {
      channelId,
      platform: ch?.platform ?? "other",
      name: ch?.name ?? ch?.platform ?? "Channel",
      revenue: agg.revenue,
      orders: agg.orders,
      platformFees: agg.platformFees,
      estimatedCogs: agg.estimatedCogs,
      estimatedProfit: agg.estimatedProfit,
    };
  });
  channelBreakdown.sort((a, b) => b.revenue - a.revenue);

  const costSettings = await getCostSettings(demoOrgId);

  // COGS based on user's chosen method
  const cogsFromPercent = costSettings.default_cogs_percent > 0 ? (totalRevenue * costSettings.default_cogs_percent / 100) : 0;
  const totalCogs = costSettings.cogs_method === "per_product" ? perProductCogs : cogsFromPercent;

  const grossProfit = totalRevenue - totalCogs;

  const { data: pnlSettingsRows } = await supabase
    .from("channel_pnl_settings")
    .select(
      "channel_id, platform_fee_percent, platform_fee_flat, marketing_monthly, shipping_cost_percent, payment_processing_percent"
    )
    .eq("org_id", orgId);

  const settingsByCh = new Map<
    string,
    {
      platform_fee_percent: number | null;
      platform_fee_flat: number | null;
      marketing_monthly: number | null;
      shipping_cost_percent: number | null;
      payment_processing_percent: number | null;
    }
  >();
  for (const r of pnlSettingsRows ?? []) {
    const cid = r.channel_id as string;
    settingsByCh.set(cid, {
      platform_fee_percent: r.platform_fee_percent != null ? Number(r.platform_fee_percent) : null,
      platform_fee_flat: r.platform_fee_flat != null ? Number(r.platform_fee_flat) : null,
      marketing_monthly: r.marketing_monthly != null ? Number(r.marketing_monthly) : null,
      shipping_cost_percent: r.shipping_cost_percent != null ? Number(r.shipping_cost_percent) : null,
      payment_processing_percent:
        r.payment_processing_percent != null ? Number(r.payment_processing_percent) : null,
    });
  }

  const channelFeeOverrides: PnLChannelFeeRow[] = (channels ?? []).map((c) => {
    const st = settingsByCh.get(c.id);
    return {
      channelId: c.id,
      name: c.name ?? c.platform ?? "Channel",
      platform: c.platform ?? "other",
      platform_fee_percent: st?.platform_fee_percent ?? null,
      platform_fee_flat: st?.platform_fee_flat ?? null,
      marketing_monthly: st?.marketing_monthly ?? null,
      shipping_cost_percent: st?.shipping_cost_percent ?? null,
      payment_processing_percent: st?.payment_processing_percent ?? null,
    };
  });

  const overrideInputs: ChannelPnlOverride[] = channelFeeOverrides.map((r) => ({
    channelId: r.channelId,
    platform_fee_percent: r.platform_fee_percent,
    platform_fee_flat: r.platform_fee_flat,
    marketing_monthly: r.marketing_monthly,
    shipping_cost_percent: r.shipping_cost_percent,
    payment_processing_percent: r.payment_processing_percent,
  }));

  const channelAggs = Array.from(byChannelAgg.entries()).map(([channelId, agg]) => ({
    channelId,
    revenue: agg.revenue,
    orders: agg.orders,
    storedPlatformFees: agg.platformFees,
  }));

  const expenseTotals = computePnLExpenseTotals({
    costSettings,
    totalRevenue,
    totalOrders,
    channelAggs,
    channelOverrides: overrideInputs,
  });

  const netProfit = grossProfit - expenseTotals.total;

  return {
    totalRevenue,
    totalOrders,
    revenueByPlatform,
    cogs: totalCogs,
    grossProfit,
    grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    costSettings,
    fees: {
      marketplace: expenseTotals.marketplace,
      shipping: expenseTotals.shipping,
      processing: expenseTotals.processing,
      advertising: expenseTotals.advertising,
      refunds: expenseTotals.refunds,
      other: expenseTotals.other,
      total: expenseTotals.total,
    },
    netProfit,
    netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    channelBreakdown,
    channelFeeOverrides,
  };
}

export async function getUserOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function getUserPlan(): Promise<{
  plan: string;
  limits: { channels: number; ordersPerMonth: number };
  status: "active" | "cancelling" | "expired" | "free";
  periodEnd: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { plan: "free", limits: PLAN_LIMITS.free, status: "free", periodEnd: null };

  const sb = createAdminClient();

  const { data: activeSub } = await sb
    .from("subscriptions")
    .select("plan, status, current_period_end, cancelled_at")
    .eq("user_id", user.id)
    .in("status", ["active", "cancelling"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (activeSub) {
    const plan = activeSub.plan as keyof typeof PLAN_LIMITS;
    return {
      plan,
      limits: PLAN_LIMITS[plan] ?? PLAN_LIMITS.free,
      status: activeSub.status === "cancelling" ? "cancelling" : "active",
      periodEnd: activeSub.current_period_end,
    };
  }

  const { data: cancelledSub } = await sb
    .from("subscriptions")
    .select("plan, current_period_end")
    .eq("user_id", user.id)
    .eq("status", "cancelled")
    .order("cancelled_at", { ascending: false })
    .limit(1)
    .single();

  if (cancelledSub?.current_period_end) {
    const periodEnd = new Date(cancelledSub.current_period_end);
    if (periodEnd > new Date()) {
      const plan = cancelledSub.plan as keyof typeof PLAN_LIMITS;
      return {
        plan,
        limits: PLAN_LIMITS[plan] ?? PLAN_LIMITS.free,
        status: "cancelling",
        periodEnd: cancelledSub.current_period_end,
      };
    }
  }

  return { plan: "free", limits: PLAN_LIMITS.free, status: "free", periodEnd: null };
}

export async function getHasSeenDashboardTour(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { data } = await supabase
    .from("profiles")
    .select("has_seen_dashboard_tour")
    .eq("id", user.id)
    .maybeSingle();

  return data?.has_seen_dashboard_tour === true;
}
