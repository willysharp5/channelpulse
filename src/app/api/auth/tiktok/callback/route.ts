import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { TikTokClient } from "@/lib/tiktok/client";

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
    console.error("TikTok callback: missing params", { code: !!code, state: !!state });
    return NextResponse.redirect(`${origin}/settings?error=missing_params`);
  }

  const userId = state.split(":")[1];
  if (!userId) {
    console.error("TikTok callback: no userId in state");
    return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
  }

  let tokens: Awaited<ReturnType<typeof TikTokClient.exchangeCodeForTokens>>;
  try {
    tokens = await TikTokClient.exchangeCodeForTokens(code);
  } catch (e) {
    console.error("TikTok token exchange failed:", e);
    return NextResponse.redirect(`${origin}/settings?error=token_exchange_failed`);
  }

  const supabase = getServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.org_id) {
    console.error("TikTok callback: no profile/org found", profileError);
    return NextResponse.redirect(`${origin}/settings?error=no_org`);
  }

  const shopCipher = searchParams.get("shop_cipher") ?? tokens.open_id;
  const storeName = tokens.seller_name || "TikTok Shop";

  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("platform", "tiktok")
    .eq("platform_store_id", tokens.open_id)
    .maybeSingle();

  const channelData = {
    org_id: profile.org_id,
    platform: "tiktok" as const,
    name: storeName,
    platform_store_id: tokens.open_id,
    credentials: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      shop_cipher: shopCipher,
      open_id: tokens.open_id,
    },
    status: "active" as const,
    last_sync_at: new Date().toISOString(),
    metadata: {
      seller_name: tokens.seller_name,
      open_id: tokens.open_id,
    },
  };

  let channelId: string | null = existing?.id ?? null;

  if (existing) {
    const { error } = await supabase.from("channels").update(channelData).eq("id", existing.id);
    if (error) console.error("TikTok channel update error:", error);
  } else {
    const { data: inserted, error } = await supabase
      .from("channels")
      .insert(channelData)
      .select("id")
      .single();
    if (error) console.error("TikTok channel insert error:", error);
    else channelId = inserted?.id ?? null;
  }

  if (!channelId) {
    const { data: ch } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", profile.org_id)
      .eq("platform", "tiktok")
      .eq("platform_store_id", tokens.open_id)
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

  return NextResponse.redirect(`${origin}/settings?success=tiktok_connected`);
}
