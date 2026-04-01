import { createClient } from "@/lib/supabase/server";

const DEMO_ORG_ID = "a0000000-0000-0000-0000-000000000001";

async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return DEMO_ORG_ID;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  return profile?.org_id ?? DEMO_ORG_ID;
}

export async function getDashboardStats(days = 30) {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString().split("T")[0];

  const prevFromDate = new Date();
  prevFromDate.setDate(prevFromDate.getDate() - days * 2);
  const prevFromStr = prevFromDate.toISOString().split("T")[0];

  // Current period stats
  const { data: currentStats } = await supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", fromStr);

  // Previous period stats (for comparison)
  const { data: prevStats } = await supabase
    .from("daily_stats")
    .select("total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", orgId)
    .gte("date", prevFromStr)
    .lt("date", fromStr);

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
  shopify: number;
  amazon: number;
  ebay: number;
  etsy: number;
  total: number;
  [key: string]: string | number;
}

export async function getRevenueSeries(days = 30): Promise<RevenuePoint[]> {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString().split("T")[0];

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("date, channel_id, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", fromStr)
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
    const existing = byDate.get(row.date) ?? { shopify: 0, amazon: 0, ebay: 0, etsy: 0, total: 0 };
    existing[platform] = (existing[platform] ?? 0) + Number(row.total_revenue);
    existing.total += Number(row.total_revenue);
    byDate.set(row.date, existing);
  }

  return Array.from(byDate.entries())
    .map(([date, values]) => ({ date, ...values } as RevenuePoint))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getChannelRevenue(days = 30) {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString().split("T")[0];

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("channel_id, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", fromStr);

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

  const { data: orders } = await supabase
    .from("orders")
    .select("id, platform, platform_order_id, order_number, status, customer_name, total_amount, currency, ordered_at")
    .eq("org_id", orgId)
    .order("ordered_at", { ascending: false })
    .limit(limit);

  return orders ?? [];
}

export async function getChannels() {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  return channels ?? [];
}
