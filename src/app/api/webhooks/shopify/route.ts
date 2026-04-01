import { NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify/verify";
import { SHOPIFY_CONFIG } from "@/lib/shopify/config";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = request.headers.get("X-Shopify-Topic") ?? "";
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain") ?? "";

  // Verify webhook authenticity
  if (!verifyWebhookHmac(body, hmacHeader, SHOPIFY_CONFIG.apiSecret)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const supabase = getServiceClient();

  // Find the channel for this shop
  const { data: channel } = await supabase
    .from("channels")
    .select("id, org_id")
    .eq("platform", "shopify")
    .eq("platform_store_id", shopDomain)
    .single();

  if (!channel) {
    console.warn(`No channel found for shop: ${shopDomain}`);
    return NextResponse.json({ ok: true });
  }

  try {
    switch (topic) {
      case "orders/create":
      case "orders/updated":
        await handleOrderWebhook(supabase, channel, payload);
        break;
      case "orders/cancelled":
        await handleOrderCancelled(supabase, channel, payload);
        break;
      case "app/uninstalled":
        await handleAppUninstalled(supabase, channel);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Webhook handler error for ${topic}:`, error);
  }

  return NextResponse.json({ ok: true });
}

async function handleOrderWebhook(
  supabase: ReturnType<typeof getServiceClient>,
  channel: { id: string; org_id: string },
  order: Record<string, unknown>
) {
  const totalAmount = parseFloat(String(order.total_price ?? 0));
  const platformFees = totalAmount * 0.029 + 0.3;

  await supabase.from("orders").upsert(
    {
      org_id: channel.org_id,
      channel_id: channel.id,
      platform: "shopify",
      platform_order_id: String(order.id),
      order_number: String(order.name ?? ""),
      status: mapWebhookStatus(order),
      financial_status: String(order.financial_status ?? "pending"),
      customer_name: order.customer
        ? `${(order.customer as Record<string, string>).first_name ?? ""} ${(order.customer as Record<string, string>).last_name ?? ""}`.trim()
        : null,
      subtotal: parseFloat(String(order.subtotal_price ?? 0)),
      total_tax: parseFloat(String(order.total_tax ?? 0)),
      total_shipping: parseFloat(
        String(
          (order.total_shipping_price_set as Record<string, Record<string, string>>)?.shop_money?.amount ?? 0
        )
      ),
      total_discounts: parseFloat(String(order.total_discounts ?? 0)),
      total_amount: totalAmount,
      currency: String(order.currency ?? "USD"),
      platform_fees: Math.round(platformFees * 100) / 100,
      net_profit: Math.round((totalAmount - platformFees) * 100) / 100,
      item_count: Array.isArray(order.line_items) ? order.line_items.length : 0,
      ordered_at: String(order.created_at),
    },
    { onConflict: "org_id,platform,platform_order_id" }
  );
}

async function handleOrderCancelled(
  supabase: ReturnType<typeof getServiceClient>,
  channel: { id: string; org_id: string },
  order: Record<string, unknown>
) {
  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("org_id", channel.org_id)
    .eq("platform", "shopify")
    .eq("platform_order_id", String(order.id));
}

async function handleAppUninstalled(
  supabase: ReturnType<typeof getServiceClient>,
  channel: { id: string; org_id: string }
) {
  await supabase
    .from("channels")
    .update({ status: "disconnected", credentials: {} })
    .eq("id", channel.id);
}

function mapWebhookStatus(order: Record<string, unknown>): string {
  if (order.cancelled_at) return "cancelled";
  const fulfillment = String(order.fulfillment_status ?? "");
  if (fulfillment === "fulfilled") return "delivered";
  if (fulfillment === "partial") return "shipped";
  return "paid";
}
