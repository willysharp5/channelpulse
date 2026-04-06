import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { TikTokClient } from "./client";
import { generateAnomalyAlerts, generateLowStockAlerts } from "@/lib/alerts";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const TIKTOK_REFERRAL_FEE_RATE = 0.08;
const TIKTOK_TRANSACTION_FEE_RATE = 0.03;

export async function syncTikTokOrders(channelId: string) {
  const supabase = getServiceClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (!channel || channel.platform !== "tiktok" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not tiktok`);
  }

  const { access_token, refresh_token, shop_cipher } = channel.credentials ?? {};
  if (!access_token || !refresh_token || !shop_cipher) {
    throw new Error("Missing TikTok credentials for channel");
  }

  const client = new TikTokClient(access_token, refresh_token, shop_cipher);

  const sinceTimestamp = channel.last_sync_at
    ? Math.floor(new Date(channel.last_sync_at).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const sinceDate = new Date(sinceTimestamp * 1000).toISOString();
  const now = Math.floor(Date.now() / 1000);

  await supabase.from("channels").update({ status: "syncing" }).eq("id", channelId);

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

  try {
    do {
      const result = await client.searchOrders(sinceTimestamp, now, cursor);

      for (const order of result.orders) {
        const payment = order.payment_info;
        const totalAmount = parseFloat(payment?.total_amount ?? "0");
        const subtotal = parseFloat(payment?.sub_total ?? "0");
        const tax = parseFloat(payment?.tax ?? "0");
        const shipping = parseFloat(payment?.shipping_fee ?? "0");
        const platformDiscount = parseFloat(payment?.platform_discount ?? "0");
        const sellerDiscount = parseFloat(payment?.seller_discount ?? "0");
        const discounts = platformDiscount + sellerDiscount;
        const currency = payment?.currency ?? "USD";

        const itemCount = order.item_list?.reduce((s, i) => s + i.quantity, 0) ?? 1;

        const referralFee = totalAmount * TIKTOK_REFERRAL_FEE_RATE;
        const transactionFee = totalAmount * TIKTOK_TRANSACTION_FEE_RATE;
        const platformFees = Math.round((referralFee + transactionFee) * 100) / 100;

        const { error } = await supabase.from("orders").upsert(
          {
            org_id: channel.org_id,
            channel_id: channelId,
            platform: "tiktok",
            platform_order_id: order.order_id,
            order_number: order.order_id,
            status: mapTikTokStatus(order.order_status),
            financial_status: "paid",
            customer_name: null,
            customer_email: null,
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
            ordered_at: new Date(order.create_time * 1000).toISOString(),
            raw_data: order,
          },
          { onConflict: "org_id,platform,platform_order_id" }
        );

        if (error) console.error("TikTok order upsert error:", error.message);
        else totalSynced++;
      }

      cursor = result.nextCursor;
      await new Promise((r) => setTimeout(r, 500));
    } while (cursor);

    const updatedTokens = client.getUpdatedTokens();
    await supabase
      .from("channels")
      .update({
        status: "active",
        last_sync_at: new Date().toISOString(),
        last_sync_status: "completed",
        credentials: { ...channel.credentials, ...updatedTokens, shop_cipher },
      })
      .eq("id", channelId);

    if (syncJob) {
      await supabase
        .from("sync_jobs")
        .update({ status: "completed", records_synced: totalSynced, completed_at: new Date().toISOString() })
        .eq("id", syncJob.id);
    }

    await recomputeDailyStats(channel.org_id, channelId, sinceDate);
    await generateAnomalyAlerts(channel.org_id, supabase);

    let productsSynced = 0;
    try {
      const pr = await syncTikTokProducts(channelId);
      productsSynced = pr.synced;
    } catch (e) {
      console.warn("TikTok product sync (non-fatal):", e instanceof Error ? e.message : e);
    }

    return { success: true, synced: totalSynced, productsSynced };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("TikTok sync failed:", errorMessage);

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

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, platform_fees, cogs, net_profit, item_count, ordered_at")
    .eq("channel_id", channelId)
    .gte("ordered_at", sinceDate)
    .neq("status", "cancelled");

  if (!orders?.length) return;

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

export async function syncTikTokProducts(channelId: string): Promise<{ synced: number }> {
  const supabase = getServiceClient();

  const { data: channel } = await supabase.from("channels").select("*").eq("id", channelId).single();
  if (!channel || channel.platform !== "tiktok" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not tiktok`);
  }

  const { access_token, refresh_token, shop_cipher } = channel.credentials ?? {};
  if (!access_token || !refresh_token || !shop_cipher) throw new Error("Missing credentials");

  const client = new TikTokClient(access_token, refresh_token, shop_cipher);

  let cursor: string | undefined;
  let total = 0;

  do {
    const result = await client.getProducts(cursor);

    for (const product of result.products) {
      const now = new Date().toISOString();
      const imageUrl = product.images?.[0]?.url ?? null;
      const isActive = product.product_status === 4;

      for (const sku of product.skus) {
        const stock = sku.stock_infos?.reduce((s, si) => s + si.available_stock, 0) ?? 0;

        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("org_id", channel.org_id)
          .eq("channel_id", channelId)
          .eq("platform", "tiktok")
          .eq("platform_product_id", sku.id)
          .maybeSingle();

        const title = sku.seller_sku && sku.seller_sku !== product.product_name
          ? `${product.product_name} — ${sku.seller_sku}`
          : product.product_name;

        const productData = {
          title,
          sku: sku.seller_sku || null,
          image_url: imageUrl,
          status: isActive ? ("active" as const) : ("draft" as const),
          inventory_quantity: stock,
          inventory_updated_at: now,
        };

        if (existing?.id) {
          await supabase.from("products").update(productData).eq("id", existing.id);
        } else {
          await supabase.from("products").insert({
            org_id: channel.org_id,
            channel_id: channelId,
            platform: "tiktok",
            platform_product_id: sku.id,
            category: null,
            cogs: 0,
            ...productData,
          });
        }
        total++;
      }
    }

    cursor = result.nextCursor;
    await new Promise((r) => setTimeout(r, 500));
  } while (cursor);

  try {
    await generateLowStockAlerts(channel.org_id, supabase);
  } catch (e) {
    console.warn("Low stock alerts:", e instanceof Error ? e.message : e);
  }

  return { synced: total };
}

function mapTikTokStatus(status: string): string {
  switch (status) {
    case "UNPAID": return "pending";
    case "ON_HOLD":
    case "AWAITING_SHIPMENT": return "paid";
    case "AWAITING_COLLECTION":
    case "IN_TRANSIT":
    case "PARTIALLY_SHIPPING": return "shipped";
    case "DELIVERED":
    case "COMPLETED": return "delivered";
    case "CANCELLED": return "cancelled";
    default: return "pending";
  }
}
