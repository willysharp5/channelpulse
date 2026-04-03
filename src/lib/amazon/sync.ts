import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AmazonClient } from "./client";
import { generateLowStockAlerts } from "@/lib/alerts";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const AMAZON_REFERRAL_FEE_RATE = 0.15;
const AMAZON_FBA_PER_UNIT_FEE = 3.22;

export async function syncAmazonOrders(channelId: string) {
  const supabase = getServiceClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (!channel || channel.platform !== "amazon" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not amazon`);
  }

  const refreshToken = channel.credentials?.refresh_token;
  if (!refreshToken) throw new Error("No refresh token for channel");

  const marketplaceId = channel.credentials?.marketplace_id ?? "ATVPDKIKX0DER";
  const client = new AmazonClient(refreshToken, marketplaceId);

  const sinceDate = channel.last_sync_at
    ? new Date(channel.last_sync_at).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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
  let nextToken: string | undefined;

  try {
    do {
      const result = await client.getOrders(sinceDate, nextToken);

      for (const order of result.orders) {
        if (order.OrderStatus === "Canceled") {
          await supabase
            .from("orders")
            .update({ status: "cancelled" })
            .eq("org_id", channel.org_id)
            .eq("platform", "amazon")
            .eq("platform_order_id", order.AmazonOrderId);
          continue;
        }

        const totalAmount = parseFloat(order.OrderTotal?.Amount ?? "0");
        const currency = order.OrderTotal?.CurrencyCode ?? "USD";
        const itemCount = order.NumberOfItemsShipped + order.NumberOfItemsUnshipped;
        const isFba = order.FulfillmentChannel === "AFN";

        let subtotal = 0;
        let totalTax = 0;
        let totalShipping = 0;
        let totalDiscounts = 0;

        try {
          const items = await client.getOrderItems(order.AmazonOrderId);
          for (const item of items) {
            subtotal += parseFloat(item.ItemPrice?.Amount ?? "0");
            totalTax += parseFloat(item.ItemTax?.Amount ?? "0");
            totalShipping += parseFloat(item.ShippingPrice?.Amount ?? "0");
            totalDiscounts += parseFloat(item.PromotionDiscount?.Amount ?? "0");
          }
        } catch {
          subtotal = totalAmount;
        }

        const referralFee = totalAmount * AMAZON_REFERRAL_FEE_RATE;
        const fbaFees = isFba ? itemCount * AMAZON_FBA_PER_UNIT_FEE : 0;
        const platformFees = Math.round((referralFee + fbaFees) * 100) / 100;

        const { error } = await supabase.from("orders").upsert(
          {
            org_id: channel.org_id,
            channel_id: channelId,
            platform: "amazon",
            platform_order_id: order.AmazonOrderId,
            order_number: order.AmazonOrderId,
            status: mapAmazonStatus(order.OrderStatus),
            financial_status: mapAmazonFinancialStatus(order.OrderStatus),
            customer_name: order.BuyerInfo?.BuyerName ?? null,
            customer_email: order.BuyerInfo?.BuyerEmail ?? null,
            subtotal: Math.round(subtotal * 100) / 100,
            total_tax: Math.round(totalTax * 100) / 100,
            total_shipping: Math.round(totalShipping * 100) / 100,
            total_discounts: Math.round(totalDiscounts * 100) / 100,
            total_amount: totalAmount,
            currency,
            platform_fees: platformFees,
            cogs: 0,
            net_profit: Math.round((totalAmount - platformFees) * 100) / 100,
            item_count: itemCount,
            ordered_at: order.PurchaseDate,
            raw_data: order,
          },
          { onConflict: "org_id,platform,platform_order_id" }
        );

        if (error) console.error("Amazon order upsert error:", error.message);
        else totalSynced++;

        await new Promise((r) => setTimeout(r, 200));
      }

      nextToken = result.nextToken;
      await new Promise((r) => setTimeout(r, 500));
    } while (nextToken);

    await supabase
      .from("channels")
      .update({
        status: "active",
        last_sync_at: new Date().toISOString(),
        last_sync_status: "completed",
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

    let productsSynced = 0;
    try {
      const pr = await syncAmazonInventory(channelId);
      productsSynced = pr.synced;
    } catch (e) {
      console.warn("Amazon inventory sync (non-fatal):", e instanceof Error ? e.message : e);
    }

    return { success: true, synced: totalSynced, productsSynced };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Amazon sync failed:", errorMessage);

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

export async function syncAmazonInventory(channelId: string): Promise<{ synced: number }> {
  const supabase = getServiceClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .single();

  if (!channel || channel.platform !== "amazon" || channel.status === "disconnected") {
    throw new Error(`Channel ${channelId} not found or not amazon`);
  }

  const refreshToken = channel.credentials?.refresh_token;
  if (!refreshToken) throw new Error("No refresh token for channel");

  const marketplaceId = channel.credentials?.marketplace_id ?? "ATVPDKIKX0DER";
  const client = new AmazonClient(refreshToken, marketplaceId);

  let nextToken: string | undefined;
  let total = 0;

  do {
    const result = await client.getInventorySummaries(nextToken);

    for (const inv of result.inventories) {
      const now = new Date().toISOString();
      const fulfillable = inv.inventoryDetails?.fulfillableQuantity ?? inv.totalQuantity;

      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("org_id", channel.org_id)
        .eq("channel_id", channelId)
        .eq("platform", "amazon")
        .eq("platform_product_id", inv.asin)
        .maybeSingle();

      let title = inv.productName || inv.sellerSku || inv.asin;
      let imageUrl: string | null = null;

      if (!existing) {
        try {
          const catalogItem = await client.getCatalogItem(inv.asin);
          if (catalogItem) {
            const summary = catalogItem.summaries?.[0];
            if (summary?.itemName) title = summary.itemName;
            const mainImage = catalogItem.images?.[0]?.images?.find(
              (img) => img.variant === "MAIN"
            );
            if (mainImage?.link) imageUrl = mainImage.link;
          }
        } catch {
          // non-fatal, use defaults
        }
      }

      if (existing?.id) {
        const { error } = await supabase
          .from("products")
          .update({
            title,
            sku: inv.sellerSku || null,
            image_url: imageUrl,
            status: "active",
            inventory_quantity: fulfillable,
            inventory_updated_at: now,
          })
          .eq("id", existing.id);
        if (error) console.error("Amazon product update error:", error.message);
        else total++;
      } else {
        const { error } = await supabase.from("products").insert({
          org_id: channel.org_id,
          channel_id: channelId,
          platform: "amazon",
          platform_product_id: inv.asin,
          title,
          sku: inv.sellerSku || null,
          image_url: imageUrl,
          category: null,
          cogs: 0,
          status: "active",
          inventory_quantity: fulfillable,
          inventory_updated_at: now,
        });
        if (error) console.error("Amazon product insert error:", error.message);
        else total++;
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    nextToken = result.nextToken;
    await new Promise((r) => setTimeout(r, 500));
  } while (nextToken);

  try {
    await generateLowStockAlerts(channel.org_id, supabase);
  } catch (e) {
    console.warn("Low stock alerts:", e instanceof Error ? e.message : e);
  }

  return { synced: total };
}

function mapAmazonStatus(orderStatus: string): string {
  switch (orderStatus) {
    case "Shipped":
      return "shipped";
    case "Delivered":
      return "delivered";
    case "Unshipped":
    case "PartiallyShipped":
      return "paid";
    case "Canceled":
      return "cancelled";
    case "Unfulfillable":
      return "cancelled";
    case "Pending":
    case "PendingAvailability":
      return "pending";
    default:
      return "pending";
  }
}

function mapAmazonFinancialStatus(orderStatus: string): string {
  switch (orderStatus) {
    case "Shipped":
    case "Delivered":
    case "Unshipped":
    case "PartiallyShipped":
      return "paid";
    case "Canceled":
    case "Unfulfillable":
      return "refunded";
    default:
      return "pending";
  }
}
