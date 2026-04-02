import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyHmac } from "@/lib/shopify/verify";
import { SHOPIFY_CONFIG } from "@/lib/shopify/config";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  if (!code || !shop || !state || !hmac) {
    console.error("Shopify callback: missing params", { code: !!code, shop: !!shop, state: !!state, hmac: !!hmac });
    return NextResponse.redirect(`${origin}/settings?error=missing_params`);
  }

  // Verify HMAC
  const queryObj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryObj[key] = value;
  });

  if (!verifyHmac(queryObj, SHOPIFY_CONFIG.apiSecret)) {
    console.error("Shopify callback: HMAC verification failed");
    return NextResponse.redirect(`${origin}/settings?error=invalid_hmac`);
  }

  // Extract user ID from state
  const userId = state.split(":")[1];
  if (!userId) {
    console.error("Shopify callback: no userId in state");
    return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CONFIG.apiKey,
        client_secret: SHOPIFY_CONFIG.apiSecret,
        code,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Shopify token exchange failed:", errorText);
    return NextResponse.redirect(`${origin}/settings?error=token_exchange_failed`);
  }

  const { access_token, scope } = await tokenResponse.json();
  console.log("Shopify: got access token for", shop);

  // Use service client to bypass RLS
  const supabase = getServiceClient();

  // Get user's org
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.org_id) {
    console.error("Shopify callback: no profile/org found", profileError);
    return NextResponse.redirect(`${origin}/settings?error=no_org`);
  }

  console.log("Shopify: saving channel for org", profile.org_id);

  // Fetch shop info
  let shopName = shop;
  let shopEmail = "";
  let shopCurrency = "USD";
  try {
    const shopInfoResponse = await fetch(
      `https://${shop}/admin/api/2024-10/shop.json`,
      { headers: { "X-Shopify-Access-Token": access_token } }
    );
    if (shopInfoResponse.ok) {
      const { shop: info } = await shopInfoResponse.json();
      shopName = info.name || shop;
      shopEmail = info.email || "";
      shopCurrency = info.currency || "USD";
    }
  } catch (e) {
    console.warn("Could not fetch shop info:", e);
  }

  // Check if channel already exists
  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("platform", "shopify")
    .eq("platform_store_id", shop)
    .maybeSingle();

  const channelData = {
    org_id: profile.org_id,
    platform: "shopify" as const,
    name: shopName,
    platform_store_id: shop,
    credentials: { access_token, scope },
    status: "active" as const,
    last_sync_at: new Date().toISOString(),
    metadata: { shop_domain: shop, shop_name: shopName, shop_email: shopEmail, currency: shopCurrency },
  };

  let channelId: string | null = existing?.id ?? null;

  if (existing) {
    const { error } = await supabase
      .from("channels")
      .update(channelData)
      .eq("id", existing.id);
    if (error) console.error("Channel update error:", error);
    else console.log("Shopify: updated existing channel", existing.id);
  } else {
    const { data: inserted, error } = await supabase
      .from("channels")
      .insert(channelData)
      .select("id")
      .single();
    if (error) console.error("Channel insert error:", error);
    else {
      channelId = inserted?.id ?? null;
      console.log("Shopify: inserted new channel for", shop);
    }
  }

  if (!channelId) {
    const { data: ch } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", profile.org_id)
      .eq("platform", "shopify")
      .eq("platform_store_id", shop)
      .maybeSingle();
    channelId = ch?.id ?? null;
  }

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("onboarding_completed")
    .eq("id", profile.org_id)
    .single();

  if (channelId && orgRow?.onboarding_completed !== true) {
    return NextResponse.redirect(
      `${origin}/onboarding?syncing=true&channelId=${encodeURIComponent(channelId)}`
    );
  }

  return NextResponse.redirect(`${origin}/settings?success=shopify_connected`);
}
