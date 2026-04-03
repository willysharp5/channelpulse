import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { AmazonClient } from "@/lib/amazon/client";
import { AMAZON_CONFIG } from "@/lib/amazon/config";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("spapi_oauth_code") ?? searchParams.get("code");
  const state = searchParams.get("state");
  const sellingPartnerId = searchParams.get("selling_partner_id");

  if (!code || !state) {
    console.error("Amazon callback: missing params", {
      code: !!code,
      state: !!state,
    });
    return NextResponse.redirect(`${origin}/settings?error=missing_params`);
  }

  const userId = state.split(":")[1];
  if (!userId) {
    console.error("Amazon callback: no userId in state");
    return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    const tokens = await AmazonClient.exchangeCodeForTokens(code);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
  } catch (e) {
    console.error("Amazon token exchange failed:", e);
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
    console.error("Amazon callback: no profile/org found", profileError);
    return NextResponse.redirect(`${origin}/settings?error=no_org`);
  }

  const storeId = sellingPartnerId ?? "amazon-seller";
  const storeName = sellingPartnerId
    ? `Amazon (${sellingPartnerId})`
    : "Amazon Seller Central";
  const marketplaceId = AMAZON_CONFIG.marketplaceId;

  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("platform", "amazon")
    .eq("platform_store_id", storeId)
    .maybeSingle();

  const channelData = {
    org_id: profile.org_id,
    platform: "amazon" as const,
    name: storeName,
    platform_store_id: storeId,
    credentials: {
      access_token: accessToken,
      refresh_token: refreshToken,
      marketplace_id: marketplaceId,
      selling_partner_id: sellingPartnerId,
    },
    status: "active" as const,
    last_sync_at: new Date().toISOString(),
    metadata: {
      marketplace_id: marketplaceId,
      selling_partner_id: sellingPartnerId,
      marketplace_name: "Amazon.com",
    },
  };

  let channelId: string | null = existing?.id ?? null;

  if (existing) {
    const { error } = await supabase
      .from("channels")
      .update(channelData)
      .eq("id", existing.id);
    if (error) console.error("Amazon channel update error:", error);
    else console.log("Amazon: updated existing channel", existing.id);
  } else {
    const { data: inserted, error } = await supabase
      .from("channels")
      .insert(channelData)
      .select("id")
      .single();
    if (error) console.error("Amazon channel insert error:", error);
    else {
      channelId = inserted?.id ?? null;
      console.log("Amazon: inserted new channel");
    }
  }

  if (!channelId) {
    const { data: ch } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", profile.org_id)
      .eq("platform", "amazon")
      .eq("platform_store_id", storeId)
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
    `${origin}/settings?success=amazon_connected`
  );
}
