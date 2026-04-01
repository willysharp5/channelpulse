import { NextResponse } from "next/server";
import crypto from "crypto";
import { getShopifyAuthUrl } from "@/lib/shopify/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop || !/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Generate state with user ID for security
  const state = crypto.randomBytes(16).toString("hex") + ":" + user.id;

  const authUrl = getShopifyAuthUrl(shop, state);
  return NextResponse.redirect(authUrl);
}
