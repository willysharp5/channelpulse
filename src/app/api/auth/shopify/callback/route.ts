import { NextResponse } from "next/server";
import { verifyHmac } from "@/lib/shopify/verify";
import { SHOPIFY_CONFIG } from "@/lib/shopify/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  if (!code || !shop || !state || !hmac) {
    return NextResponse.redirect(`${origin}/settings?error=missing_params`);
  }

  // Verify HMAC
  const queryObj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryObj[key] = value;
  });

  if (!verifyHmac(queryObj, SHOPIFY_CONFIG.apiSecret)) {
    return NextResponse.redirect(`${origin}/settings?error=invalid_hmac`);
  }

  // Extract user ID from state
  const userId = state.split(":")[1];
  if (!userId) {
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

  // Get user's org
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (!profile?.org_id) {
    return NextResponse.redirect(`${origin}/settings?error=no_org`);
  }

  // Fetch shop info for display name
  const shopInfoResponse = await fetch(
    `https://${shop}/admin/api/2024-10/shop.json`,
    {
      headers: { "X-Shopify-Access-Token": access_token },
    }
  );
  const shopInfo = shopInfoResponse.ok
    ? (await shopInfoResponse.json()).shop
    : { name: shop };

  // Upsert channel
  const { error: channelError } = await supabase
    .from("channels")
    .upsert(
      {
        org_id: profile.org_id,
        platform: "shopify",
        name: shopInfo.name || shop,
        platform_store_id: shop,
        credentials: { access_token, scope },
        status: "active",
        last_sync_at: new Date().toISOString(),
        metadata: {
          shop_domain: shop,
          shop_name: shopInfo.name,
          shop_email: shopInfo.email,
          currency: shopInfo.currency,
        },
      },
      { onConflict: "org_id,platform,platform_store_id" }
    );

  if (channelError) {
    console.error("Failed to save channel:", channelError);
    // If upsert with onConflict fails, try finding existing and updating
    const { data: existingChannel } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", profile.org_id)
      .eq("platform", "shopify")
      .eq("platform_store_id", shop)
      .single();

    if (existingChannel) {
      await supabase
        .from("channels")
        .update({
          credentials: { access_token, scope },
          status: "active",
          name: shopInfo.name || shop,
          last_sync_at: new Date().toISOString(),
          metadata: {
            shop_domain: shop,
            shop_name: shopInfo.name,
            shop_email: shopInfo.email,
            currency: shopInfo.currency,
          },
        })
        .eq("id", existingChannel.id);
    } else {
      await supabase.from("channels").insert({
        org_id: profile.org_id,
        platform: "shopify",
        name: shopInfo.name || shop,
        platform_store_id: shop,
        credentials: { access_token, scope },
        status: "active",
        last_sync_at: new Date().toISOString(),
        metadata: {
          shop_domain: shop,
          shop_name: shopInfo.name,
          shop_email: shopInfo.email,
          currency: shopInfo.currency,
        },
      });
    }
  }

  return NextResponse.redirect(`${origin}/settings?success=shopify_connected`);
}
