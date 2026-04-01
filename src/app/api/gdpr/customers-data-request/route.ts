import { NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify/verify";
import { SHOPIFY_CONFIG } from "@/lib/shopify/config";

export async function POST(request: Request) {
  const body = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";

  if (SHOPIFY_CONFIG.apiSecret && !verifyWebhookHmac(body, hmac, SHOPIFY_CONFIG.apiSecret)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // ChannelPulse stores minimal customer data (name/email on orders).
  // We acknowledge the request — data can be provided from orders table.
  console.log("GDPR: customers/data_request received");

  return NextResponse.json({ ok: true });
}
