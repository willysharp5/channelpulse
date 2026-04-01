import { createClient } from "@/lib/supabase/server";

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();
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
  const currentAOV = currentOrders > 0 ? currentRevenue / currentOrders : 0;

  const prevRevenue = sumField(prevStats, "total_revenue");
  const prevOrders = sumField(prevStats, "total_orders");
  const prevProfit = sumField(prevStats, "estimated_profit");
  const prevAOV = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? ((curr - prev) / prev) * 100 : 0;

  return {
    revenue: { value: currentRevenue, change: pctChange(currentRevenue, prevRevenue) },
    orders: { value: currentOrders, change: pctChange(currentOrders, prevOrders) },
    profit: { value: currentProfit, change: pctChange(currentProfit, prevProfit) },
    aov: { value: currentAOV, change: pctChange(currentAOV, prevAOV) },
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

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("org_id", orgId)
    .order("title", { ascending: true });

  return products ?? [];
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

const EMPTY_PNL = {
  totalRevenue: 0, totalOrders: 0, revenueByPlatform: {} as Record<string, number>,
  cogs: 0, grossProfit: 0, grossMargin: 0,
  fees: { marketplace: 0, shipping: 0, processing: 0, advertising: 0, refunds: 0, other: 0, total: 0 },
  netProfit: 0, netMargin: 0,
  costSettings: DEFAULT_COST_SETTINGS,
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

  const channelMap = new Map(channels?.map((c) => [c.id, c.platform]) ?? []);

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
  let totalUnits = 0;

  for (const row of stats ?? []) {
    const platform = channelMap.get(row.channel_id) ?? "other";
    revenueByPlatform[platform] = (revenueByPlatform[platform] ?? 0) + Number(row.total_revenue);
    totalRevenue += Number(row.total_revenue);
    totalFees += Number(row.platform_fees);
    totalOrders += Number(row.total_orders);
  }

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
