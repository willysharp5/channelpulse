import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { EtsyClient } from "./client";
import { generateAnomalyAlerts, generateLowStockAlerts } from "@/lib/alerts";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const ETSY_TRANSACTION_FEE = 0.065;
const ETSY_LISTING_FEE = 0.20;
const ETSY_PAYMENT_PROCESSING_RATE = 0.03;
const ETSY_PAYMENT_PROCESSING_FIXED = 0.25;

function etsyMoney(m: { amount: number; divisor: number } | null | undefined): number {
  if (!m) return 0;
  return m.amount / m.divisor;
}

export async function syncEtsyOrders(channelId: string) {
  const supabase = getServiceClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (!channel || channel.platform !== "etsy" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not etsy`);
  }

  const refreshToken = channel.credentials?.refresh_token;
  const shopId = channel.credentials?.shop_id ?? channel.platform_store_id;
  if (!refreshToken || !shopId) throw new Error("No refresh token or shop ID for channel");

  const client = new EtsyClient(refreshToken, shopId);

  const sinceTimestamp = channel.last_sync_at
    ? Math.floor(new Date(channel.last_sync_at).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const sinceDate = new Date(sinceTimestamp * 1000).toISOString();

  await supabase
    .from("channels")
    .update({ status: "syncing" })
    .eq("id", channelId);

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
  let offset = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const result = await client.getReceipts(sinceTimestamp, offset);

      for (const receipt of result.results) {
        const totalAmount = etsyMoney(receipt.grandtotal);
        const subtotal = etsyMoney(receipt.subtotal);
        const tax = etsyMoney(receipt.total_tax_cost);
        const shipping = etsyMoney(receipt.total_shipping_cost);
        const discounts = etsyMoney(receipt.discount_amt);
        const currency = receipt.grandtotal?.currency_code ?? "USD";

        const itemCount = receipt.transactions?.reduce(
          (sum, t) => sum + t.quantity,
          0
        ) ?? 1;

        const transactionFee = totalAmount * ETSY_TRANSACTION_FEE;
        const listingFees = itemCount * ETSY_LISTING_FEE;
        const paymentProcessing =
          totalAmount * ETSY_PAYMENT_PROCESSING_RATE + ETSY_PAYMENT_PROCESSING_FIXED;
        const platformFees = Math.round(
          (transactionFee + listingFees + paymentProcessing) * 100
        ) / 100;

        const { error } = await supabase.from("orders").upsert(
          {
            org_id: channel.org_id,
            channel_id: channelId,
            platform: "etsy",
            platform_order_id: String(receipt.receipt_id),
            order_number: String(receipt.receipt_id),
            status: mapEtsyStatus(receipt.status),
            financial_status: "paid",
            customer_name: receipt.name ?? null,
            customer_email: receipt.buyer_email ?? null,
            subtotal: Math.round(subtotal * 100) / 100,
            total_tax: Math.round(tax * 100) / 100,
            total_shipping: Math.round(shipping * 100) / 100,
            total_discounts: Math.round(discounts * 100) / 100,
            total_amount: totalAmount,
            currency,
            platform_fees: platformFees,
            cogs: 0,
            net_profit: Math.round((totalAmount - platformFees) * 100) / 100,
            item_count: itemCount,
            ordered_at: new Date(receipt.create_timestamp * 1000).toISOString(),
            raw_data: receipt,
          },
          { onConflict: "org_id,platform,platform_order_id" }
        );

        if (error) console.error("Etsy order upsert error:", error.message);
        else totalSynced++;
      }

      hasMore = offset + result.results.length < result.count;
      offset += result.results.length;
      await new Promise((r) => setTimeout(r, 300));
    }

    const updatedRefreshToken = client.getUpdatedRefreshToken();
    await supabase
      .from("channels")
      .update({
        status: "active",
        last_sync_at: new Date().toISOString(),
        last_sync_status: "completed",
        credentials: {
          ...channel.credentials,
          refresh_token: updatedRefreshToken,
        },
      })
      .eq("id", channelId);

    if (syncJob) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "completed",
          records_synced: totalSynced,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncJob.id);
    }

    await recomputeDailyStats(channel.org_id, channelId, sinceDate);
    await generateAnomalyAlerts(channel.org_id, supabase);

    let productsSynced = 0;
    try {
      const pr = await syncEtsyListings(channelId);
      productsSynced = pr.synced;
    } catch (e) {
      console.warn("Etsy listing sync (non-fatal):", e instanceof Error ? e.message : e);
    }

    return { success: true, synced: totalSynced, productsSynced };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Etsy sync failed:", errorMessage);

    await supabase
      .from("channels")
      .update({ status: "error", last_sync_status: errorMessage })
      .eq("id", channelId);

    if (syncJob) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          error: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncJob.id);
    }

    return { success: false, error: errorMessage };
  }
}

async function recomputeDailyStats(orgId: string, channelId: string, since: string) {
  const supabase = getServiceClient();
  const sinceDate = since.split("T")[0];

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, platform_fees, cogs, net_profit, item_count, ordered_at")
    .eq("channel_id", channelId)
    .gte("ordered_at", sinceDate)
    .neq("status", "cancelled");

  if (!orders?.length) return;

  const byDate = new Map<
    string,
    { revenue: number; orders: number; units: number; fees: number; cogs: number; profit: number }
  >();

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

export async function syncEtsyListings(channelId: string): Promise<{ synced: number }> {
  const supabase = getServiceClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (!channel || channel.platform !== "etsy" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not etsy`);
  }

  const refreshToken = channel.credentials?.refresh_token;
  const shopId = channel.credentials?.shop_id ?? channel.platform_store_id;
  if (!refreshToken || !shopId) throw new Error("No refresh token or shop ID");

  const client = new EtsyClient(refreshToken, shopId);

  let offset = 0;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const result = await client.getListings(offset);

    for (const listing of result.results) {
      const now = new Date().toISOString();
      const imageUrl = listing.images?.[0]?.url_fullxfull ?? null;
      const sku = listing.sku?.[0] ?? null;

      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("org_id", channel.org_id)
        .eq("channel_id", channelId)
        .eq("platform", "etsy")
        .eq("platform_product_id", String(listing.listing_id))
        .maybeSingle();

      const productData = {
        title: listing.title,
        sku,
        image_url: imageUrl,
        status: listing.state === "active" ? "active" as const : "draft" as const,
        inventory_quantity: listing.quantity,
        inventory_updated_at: now,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", existing.id);
        if (error) console.error("Etsy product update error:", error.message);
        else total++;
      } else {
        const { error } = await supabase.from("products").insert({
          org_id: channel.org_id,
          channel_id: channelId,
          platform: "etsy",
          platform_product_id: String(listing.listing_id),
          category: null,
          cogs: 0,
          ...productData,
        });
        if (error) console.error("Etsy product insert error:", error.message);
        else total++;
      }
    }

    hasMore = offset + result.results.length < result.count;
    offset += result.results.length;
    await new Promise((r) => setTimeout(r, 300));
  }

  try {
    await generateLowStockAlerts(channel.org_id, supabase);
  } catch (e) {
    console.warn("Low stock alerts:", e instanceof Error ? e.message : e);
  }

  return { synced: total };
}

function mapEtsyStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case "completed":
      return "delivered";
    case "paid":
    case "open":
      return "paid";
    case "shipped":
      return "shipped";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}
