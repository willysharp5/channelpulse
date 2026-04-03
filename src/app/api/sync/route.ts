import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncShopifyOrders } from "@/lib/shopify/sync";
import { syncAmazonOrders } from "@/lib/amazon/sync";
import { syncEtsyOrders } from "@/lib/etsy/sync";
import { syncTikTokOrders } from "@/lib/tiktok/sync";

const SYNC_MAP: Record<string, (channelId: string) => Promise<{ success: boolean; synced?: number; productsSynced?: number; error?: string }>> = {
  shopify: syncShopifyOrders,
  amazon: syncAmazonOrders,
  etsy: syncEtsyOrders,
  tiktok: syncTikTokOrders,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await request.json();

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data: channel } = await supabase
    .from("channels")
    .select("id, org_id, platform")
    .eq("id", channelId)
    .single();

  if (!channel || channel.org_id !== profile?.org_id) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const syncFn = SYNC_MAP[channel.platform];
  if (!syncFn) {
    return NextResponse.json(
      { error: `Sync not supported for ${channel.platform}` },
      { status: 400 }
    );
  }

  try {
    const result = await syncFn(channelId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
