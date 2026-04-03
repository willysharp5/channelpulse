import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { EtsyClient } from "@/lib/etsy/client";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    console.error("Etsy callback: missing params", {
      code: !!code,
      state: !!state,
    });
    return NextResponse.redirect(`${origin}/settings?error=missing_params`);
  }

  const stateParts = state.split(":");
  const userId = stateParts[1];
  const codeVerifier = stateParts.slice(2).join(":");

  if (!userId || !codeVerifier) {
    console.error("Etsy callback: invalid state format");
    return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    const tokens = await EtsyClient.exchangeCodeForTokens(code, codeVerifier);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
  } catch (e) {
    console.error("Etsy token exchange failed:", e);
    return NextResponse.redirect(
      `${origin}/settings?error=token_exchange_failed`
    );
  }

  const supabase = getServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.org_id) {
    console.error("Etsy callback: no profile/org found", profileError);
    return NextResponse.redirect(`${origin}/settings?error=no_org`);
  }

  // The access token contains the user/shop ID: {user_id}.{token}
  const etsyUserId = accessToken.split(".")[0];

  let shopId = "";
  let shopName = "Etsy Shop";
  let currency = "USD";
  try {
    const tempClient = new EtsyClient(refreshToken, etsyUserId);
    const shop = await tempClient.getShop();
    shopId = String(shop.shop_id);
    shopName = shop.shop_name || "Etsy Shop";
    currency = shop.currency_code || "USD";
  } catch (e) {
    console.warn("Could not fetch Etsy shop info:", e);
    shopId = etsyUserId;
  }

  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("platform", "etsy")
    .eq("platform_store_id", shopId)
    .maybeSingle();

  const channelData = {
    org_id: profile.org_id,
    platform: "etsy" as const,
    name: shopName,
    platform_store_id: shopId,
    credentials: {
      access_token: accessToken,
      refresh_token: refreshToken,
      shop_id: shopId,
      etsy_user_id: etsyUserId,
    },
    status: "active" as const,
    last_sync_at: new Date().toISOString(),
    metadata: {
      shop_name: shopName,
      shop_id: shopId,
      currency,
    },
  };

  let channelId: string | null = existing?.id ?? null;

  if (existing) {
    const { error } = await supabase
      .from("channels")
      .update(channelData)
      .eq("id", existing.id);
    if (error) console.error("Etsy channel update error:", error);
    else console.log("Etsy: updated existing channel", existing.id);
  } else {
    const { data: inserted, error } = await supabase
      .from("channels")
      .insert(channelData)
      .select("id")
      .single();
    if (error) console.error("Etsy channel insert error:", error);
    else {
      channelId = inserted?.id ?? null;
      console.log("Etsy: inserted new channel for shop", shopId);
    }
  }

  if (!channelId) {
    const { data: ch } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", profile.org_id)
      .eq("platform", "etsy")
      .eq("platform_store_id", shopId)
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

  return NextResponse.redirect(
    `${origin}/settings?success=etsy_connected`
  );
}
