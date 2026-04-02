import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImpersonatedUserId } from "@/lib/admin/impersonate";
import {
  topProductsFromOrders,
  rollupForProducts,
  lookupProductSales,
  type TopProductSale,
} from "@/lib/sales-from-orders";

export type { TopProductSale };

async function getOrgId(): Promise<string | null> {
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

const EMPTY_STATS = {
  revenue: { value: 0, change: 0 },
  orders: { value: 0, change: 0 },
  profit: { value: 0, change: 0 },
  aov: { value: 0, change: 0 },
  units: { value: 0, change: 0 },
};

export interface DateParams {
  days?: number;
  from?: string;
  to?: string;
}

function getDateRange(params: DateParams): { fromStr: string; toStr: string; prevFromStr: string; prevToStr: string } {
  if (params.from && params.to) {
    const from = new Date(params.from);
    const to = new Date(params.to);
    const diff = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - diff);
    return {
      fromStr: params.from,
      toStr: params.to,
      prevFromStr: prevFrom.toISOString().split("T")[0],
      prevToStr: params.from,
    };
  }
  const days = params.days ?? 30;
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const prevFromDate = new Date();
  prevFromDate.setDate(prevFromDate.getDate() - days * 2);
  return {
    fromStr: fromDate.toISOString().split("T")[0],
    toStr: toDate.toISOString().split("T")[0],
    prevFromStr: prevFromDate.toISOString().split("T")[0],
    prevToStr: fromDate.toISOString().split("T")[0],
  };
}

export async function getDashboardStats(params: DateParams = { days: 30 }) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return EMPTY_STATS;

  const { fromStr, toStr, prevFromStr, prevToStr } = getDateRange(params);

  const { data: currentStats } = await supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);

  const { data: prevStats } = await supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", prevFromStr)
    .lt("date", prevToStr);

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

export interface RevenuePoint {
  date: string;
  total: number;
  [key: string]: string | number;
}

export async function getRevenueSeries(params: DateParams = { days: 30 }): Promise<{ series: RevenuePoint[]; platforms: string[] }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return { series: [], platforms: [] };

  const { fromStr, toStr } = getDateRange(params);

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("date, channel_id, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date", { ascending: true });

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

  const activePlatforms = [...new Set(Array.from(channelMap.values()))];

  const series = Array.from(byDate.entries())
    .map(([date, values]) => ({ date, ...values } as RevenuePoint))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { series, platforms: activePlatforms };
}

export async function getChannelRevenue(params: DateParams = { days: 30 }) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { fromStr, toStr } = getDateRange(params);

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);

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

  return Array.from(byChannel.values()).map((ch) => ({
    channel: ch.platform,
    label: ch.name,
    revenue: ch.revenue,
    orders: ch.orders,
    percentage: totalRevenue > 0 ? Math.round((ch.revenue / totalRevenue) * 100) : 0,
  }));
}

export async function getRecentOrders(limit = 10) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, platform, platform_order_id, order_number, status, customer_name, total_amount, currency, ordered_at")
    .eq("org_id", orgId)
    .order("ordered_at", { ascending: false })
    .limit(limit);

  return orders ?? [];
}

export async function getAllOrders() {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, platform, platform_order_id, order_number, status, financial_status, customer_name, customer_email, total_amount, subtotal, total_tax, total_shipping, total_discounts, platform_fees, net_profit, currency, item_count, ordered_at")
    .eq("org_id", orgId)
    .order("ordered_at", { ascending: false });

  return orders ?? [];
}

export async function getChannels() {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  return channels ?? [];
}

export async function getChannelsWithStats(params: DateParams = { days: 30 }) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { fromStr, toStr } = getDateRange(params);

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders, total_units")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);

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

export async function getProducts() {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const [{ data: products }, { data: channels }] = await Promise.all([
    supabase.from("products").select("*").eq("org_id", orgId).order("title", { ascending: true }),
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

export async function getTopProductsBySales(params: DateParams = { days: 30 }, limit = 10): Promise<TopProductSale[]> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { fromStr, toStr } = getDateRange(params);
  const fromIso = `${fromStr}T00:00:00.000Z`;
  const toIso = `${toStr}T23:59:59.999Z`;

  const { data: orders } = await supabase
    .from("orders")
    .select("id, platform, raw_data, total_amount, item_count")
    .eq("org_id", orgId)
    .gte("ordered_at", fromIso)
    .lte("ordered_at", toIso)
    .neq("status", "cancelled");

  return topProductsFromOrders(orders ?? [], limit);
}

export type ProductWithSales = Awaited<ReturnType<typeof getProductsWithSales>>[number];

export async function getProductsWithSales(params: DateParams = { days: 30 }) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return [];

  const { fromStr, toStr } = getDateRange(params);
  const fromIso = `${fromStr}T00:00:00.000Z`;
  const toIso = `${toStr}T23:59:59.999Z`;

  const [products, { data: orders }] = await Promise.all([
    getProducts(),
    supabase
      .from("orders")
      .select("id, platform, raw_data, total_amount, item_count")
      .eq("org_id", orgId)
      .gte("ordered_at", fromIso)
      .lte("ordered_at", toIso)
      .neq("status", "cancelled"),
  ]);

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

export async function getInventoryRows() {
  const products = await getProducts();
  return products.map((p) => {
    const qty = Number((p as { inventory_quantity?: number }).inventory_quantity ?? 0);
    const ch = p.channels as { platform?: string; name?: string } | null;
    const platform = (ch?.platform as string) || "—";
    const channelName = ch?.name || "—";
    const updated = (p as { inventory_updated_at?: string | null }).inventory_updated_at;
    return {
      id: p.id as string,
      title: p.title as string,
      sku: (p.sku as string | null) ?? null,
      inventory_quantity: qty,
      platform,
      channelName,
      status: (p.status as string | null) ?? null,
      updatedAt: updated,
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
};

export async function getCostSettings(): Promise<CostSettings> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return DEFAULT_COST_SETTINGS;

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

const EMPTY_PNL = {
  totalRevenue: 0, totalOrders: 0, revenueByPlatform: {} as Record<string, number>,
  cogs: 0, grossProfit: 0, grossMargin: 0,
  fees: { marketplace: 0, shipping: 0, processing: 0, advertising: 0, refunds: 0, other: 0, total: 0 },
  netProfit: 0, netMargin: 0,
  costSettings: DEFAULT_COST_SETTINGS,
  channelBreakdown: [] as PnLChannelRow[],
};

export async function getPnLData(params: DateParams = { days: 30 }) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  if (!orgId) return EMPTY_PNL;

  const { fromStr, toStr } = getDateRange(params);

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", fromStr)
    .lte("date", toStr);

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, name")
    .eq("org_id", orgId);

  const channelMap = new Map(channels?.map((c) => [c.id, { platform: c.platform, name: c.name }]) ?? []);

  // Get actual COGS from products table (user-entered values)
  const { data: products } = await supabase
    .from("products")
    .select("cogs")
    .eq("org_id", orgId);

  const perProductCogs = (products ?? []).reduce((s, p) => s + Number(p.cogs ?? 0), 0);

  const revenueByPlatform: Record<string, number> = {};
  let totalRevenue = 0;
  let totalFees = 0;
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
    totalFees += Number(row.platform_fees);
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

  const costSettings = await getCostSettings();

  // COGS based on user's chosen method
  const cogsFromPercent = costSettings.default_cogs_percent > 0 ? (totalRevenue * costSettings.default_cogs_percent / 100) : 0;
  const totalCogs = costSettings.cogs_method === "per_product" ? perProductCogs : cogsFromPercent;

  const grossProfit = totalRevenue - totalCogs;
  const marketplaceFees = totalFees > 0
    ? totalFees
    : (totalRevenue * costSettings.platform_fee_percent / 100) + (totalOrders * costSettings.platform_fee_flat);
  const shippingCost = totalRevenue * (costSettings.shipping_cost_percent / 100);
  const processingFees = totalRevenue * (costSettings.payment_processing_percent / 100);
  const advertising = costSettings.advertising_monthly;
  const refunds = totalRevenue * (costSettings.refund_rate_percent / 100);
  const otherExpenses = costSettings.other_expenses_monthly;
  const totalExpenses = marketplaceFees + shippingCost + processingFees + advertising + refunds + otherExpenses;
  const netProfit = grossProfit - totalExpenses;

  return {
    totalRevenue,
    totalOrders,
    revenueByPlatform,
    cogs: totalCogs,
    grossProfit,
    grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    costSettings,
    fees: {
      marketplace: marketplaceFees,
      shipping: shippingCost,
      processing: processingFees,
      advertising,
      refunds,
      other: otherExpenses,
      total: totalExpenses,
    },
    netProfit,
    netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    channelBreakdown,
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
  const { PLAN_LIMITS } = await import("@/lib/constants");
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
