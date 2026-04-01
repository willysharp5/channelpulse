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
  const customerEmail = payload.customer?.email;

  if (shopDomain && customerEmail) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Redact customer PII from orders
    await supabase
      .from("orders")
      .update({ customer_name: "[REDACTED]", customer_email: "[REDACTED]" })
      .eq("customer_email", customerEmail);
  }

  console.log("GDPR: customers/redact processed");
  return NextResponse.json({ ok: true });
}
