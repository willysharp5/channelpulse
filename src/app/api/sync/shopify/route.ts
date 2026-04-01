import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncShopifyOrders } from "@/lib/shopify/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await request.json();

  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  // Verify the channel belongs to the user's org
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data: channel } = await supabase
    .from("channels")
    .select("id, org_id")
    .eq("id", channelId)
    .single();

  if (!channel || channel.org_id !== profile?.org_id) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  try {
    const result = await syncShopifyOrders(channelId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
