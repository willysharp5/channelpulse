import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ShopifyClient } from "./client";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function extractGid(shopifyGid: string): string {
  return shopifyGid.split("/").pop() ?? shopifyGid;
}

export async function syncShopifyOrders(channelId: string) {
  const supabase = getServiceClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (!channel || channel.platform !== "shopify" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not shopify`);
  }

  const accessToken = channel.credentials?.access_token;
  if (!accessToken) throw new Error("No access token for channel");

  const client = new ShopifyClient(channel.platform_store_id, accessToken);

  // Determine since date — last sync or 30 days ago
  const sinceDate = channel.last_sync_at
    ? new Date(channel.last_sync_at).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Update channel status to syncing
  await supabase
    .from("channels")
    .update({ status: "syncing" })
    .eq("id", channelId);

  // Create sync job
  const { data: syncJob } = await supabase
    .from("sync_jobs")
    .insert({
      org_id: channel.org_id,
      channel_id: channelId,
      type: "orders",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  let totalSynced = 0;
  let cursor: string | undefined;
  let hasMore = true;

  try {
    while (hasMore) {
      const result = await client.fetchOrders(sinceDate, cursor);
      const edges = result.orders.edges;

      for (const edge of edges) {
        const order = edge.node;
        const totalAmount = parseFloat(order.totalPriceSet.shopMoney.amount);
        const subtotal = parseFloat(order.subtotalPriceSet.shopMoney.amount);
        const tax = parseFloat(order.totalTaxSet.shopMoney.amount);
        const shipping = parseFloat(order.totalShippingPriceSet.shopMoney.amount);
        const discounts = parseFloat(order.totalDiscountsSet.shopMoney.amount);
        const platformFees = totalAmount * 0.029 + 0.3; // Estimated Shopify payments fee

        const { error } = await supabase.from("orders").upsert(
          {
            org_id: channel.org_id,
            channel_id: channelId,
            platform: "shopify",
            platform_order_id: extractGid(order.id),
            order_number: order.name,
            status: mapShopifyStatus(order.displayFulfillmentStatus),
            financial_status: order.displayFinancialStatus?.toLowerCase(),
            customer_name: order.customer?.displayName ?? null,
            customer_email: order.customer?.email ?? null,
            subtotal,
            total_tax: tax,
            total_shipping: shipping,
            total_discounts: discounts,
            total_amount: totalAmount,
            currency: order.totalPriceSet.shopMoney.currencyCode,
            platform_fees: Math.round(platformFees * 100) / 100,
            cogs: 0,
            net_profit: Math.round((totalAmount - platformFees) * 100) / 100,
            item_count: order.lineItems.edges.length,
            ordered_at: order.createdAt,
            raw_data: order,
          },
          { onConflict: "org_id,platform,platform_order_id" }
        );

        if (error) console.error("Order upsert error:", error.message);
        else totalSynced++;
      }

      hasMore = result.orders.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : undefined;

      // Respect rate limits
      await new Promise((r) => setTimeout(r, 500));
    }

    // Update channel and sync job
    await supabase
      .from("channels")
      .update({ status: "active", last_sync_at: new Date().toISOString(), last_sync_status: "completed" })
      .eq("id", channelId);

    if (syncJob) {
      await supabase
        .from("sync_jobs")
        .update({ status: "completed", records_synced: totalSynced, completed_at: new Date().toISOString() })
        .eq("id", syncJob.id);
    }

    // Recompute daily stats
    await recomputeDailyStats(channel.org_id, channelId, sinceDate);

    return { success: true, synced: totalSynced };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync failed:", errorMessage);

    await supabase
      .from("channels")
      .update({ status: "error", last_sync_status: errorMessage })
      .eq("id", channelId);

    if (syncJob) {
      await supabase
        .from("sync_jobs")
        .update({ status: "failed", error: errorMessage, completed_at: new Date().toISOString() })
        .eq("id", syncJob.id);
    }

    return { success: false, error: errorMessage };
  }
}

async function recomputeDailyStats(orgId: string, channelId: string, since: string) {
  const supabase = getServiceClient();
  const sinceDate = since.split("T")[0];

  // Get aggregated order data by date
  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, platform_fees, cogs, net_profit, item_count, ordered_at")
    .eq("channel_id", channelId)
    .gte("ordered_at", sinceDate)
    .neq("status", "cancelled");

  if (!orders?.length) return;

  // Group by date
  const byDate = new Map<string, { revenue: number; orders: number; units: number; fees: number; cogs: number; profit: number }>();

  for (const order of orders) {
    const date = new Date(order.ordered_at).toISOString().split("T")[0];
    const existing = byDate.get(date) ?? { revenue: 0, orders: 0, units: 0, fees: 0, cogs: 0, profit: 0 };
    existing.revenue += Number(order.total_amount);
    existing.orders += 1;
    existing.units += Number(order.item_count);
    existing.fees += Number(order.platform_fees);
    existing.cogs += Number(order.cogs);
    existing.profit += Number(order.net_profit);
    byDate.set(date, existing);
  }

  for (const [date, stats] of byDate) {
    await supabase.from("daily_stats").upsert(
      {
        org_id: orgId,
        channel_id: channelId,
        date,
        total_revenue: stats.revenue,
        total_orders: stats.orders,
        total_units: stats.units,
        avg_order_value: stats.orders > 0 ? stats.revenue / stats.orders : 0,
        platform_fees: stats.fees,
        estimated_cogs: stats.cogs,
        estimated_profit: stats.profit,
      },
      { onConflict: "channel_id,date" }
    );
  }
}

function mapShopifyStatus(fulfillmentStatus: string): string {
  switch (fulfillmentStatus?.toUpperCase()) {
    case "FULFILLED": return "delivered";
    case "PARTIALLY_FULFILLED":
    case "IN_PROGRESS": return "shipped";
    case "UNFULFILLED":
    case null: return "paid";
    default: return "pending";
  }
}
