import { NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify/verify";
import { SHOPIFY_CONFIG } from "@/lib/shopify/config";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";

  if (SHOPIFY_CONFIG.apiSecret && !verifyWebhookHmac(body, hmac, SHOPIFY_CONFIG.apiSecret)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const shopDomain = payload.shop_domain;

  if (shopDomain) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Find and clean up all data for this shop
    const { data: channel } = await supabase
      .from("channels")
      .select("id, org_id")
      .eq("platform", "shopify")
      .eq("platform_store_id", shopDomain)
      .single();

    if (channel) {
      // Delete orders, daily_stats, sync_jobs for this channel
      await supabase.from("daily_stats").delete().eq("channel_id", channel.id);
      await supabase.from("sync_jobs").delete().eq("channel_id", channel.id);
      await supabase.from("orders").delete().eq("channel_id", channel.id);
      await supabase.from("channels").delete().eq("id", channel.id);
    }
  }

  console.log("GDPR: shop/redact processed");
  return NextResponse.json({ ok: true });
}
