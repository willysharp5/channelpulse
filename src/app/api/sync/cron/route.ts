import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncShopifyOrders } from "@/lib/shopify/sync";
import { syncAmazonOrders } from "@/lib/amazon/sync";
import { syncEtsyOrders } from "@/lib/etsy/sync";
import { syncTikTokOrders } from "@/lib/tiktok/sync";
import { sendSyncErrorAlert } from "@/lib/alerts";

const SYNC_MAP: Record<string, (channelId: string) => Promise<{ success: boolean; error?: string }>> = {
  shopify: syncShopifyOrders,
  amazon: syncAmazonOrders,
  etsy: syncEtsyOrders,
  tiktok: syncTikTokOrders,
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const channelId = body.channel_id;

  if (!channelId) {
    return NextResponse.json({ error: "channel_id required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data: channel } = await sb
    .from("channels")
    .select("id, platform, name, org_id, status")
    .eq("id", channelId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (channel.status === "disconnected") {
    return NextResponse.json({ skipped: true, reason: "disconnected" });
  }

  if (channel.status === "syncing") {
    return NextResponse.json({ skipped: true, reason: "already syncing" });
  }

  const syncFn = SYNC_MAP[channel.platform];
  if (!syncFn) {
    return NextResponse.json({ skipped: true, reason: `unsupported platform: ${channel.platform}` });
  }

  try {
    const result = await syncFn(channelId);

    if (!result.success && result.error) {
      await sendSyncErrorAlert(channel.org_id, channel.name, result.error, sb);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await sendSyncErrorAlert(channel.org_id, channel.name, message, sb);
    } catch {
      console.error("Failed to send sync error alert:", message);
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
