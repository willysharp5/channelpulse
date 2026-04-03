import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { weeklyDigestEmail } from "@/lib/email/templates";
import { mergeNotificationPrefs } from "@/lib/alerts";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

  const { data: orgs } = await sb.from("organizations").select("id, notification_preferences");
  if (!orgs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const org of orgs) {
    const prefs = mergeNotificationPrefs(org.notification_preferences);
    if (!prefs.weekly_digest || !prefs.email) continue;

    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("org_id", org.id)
      .limit(1)
      .single();

    if (!profile?.id) continue;

    const { data: authUser } = await sb.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (!email) continue;

    const [thisWeek, lastWeek, lowStock, channels] = await Promise.all([
      sb
        .from("daily_stats")
        .select("total_revenue, total_orders, channel_id")
        .eq("org_id", org.id)
        .gte("date", weekAgoStr),
      sb
        .from("daily_stats")
        .select("total_revenue, total_orders")
        .eq("org_id", org.id)
        .gte("date", twoWeeksAgoStr)
        .lt("date", weekAgoStr),
      sb
        .from("products")
        .select("id")
        .eq("org_id", org.id)
        .lte("inventory_quantity", prefs.low_stock_threshold),
      sb
        .from("channels")
        .select("id, name, platform")
        .eq("org_id", org.id)
        .eq("status", "active"),
    ]);

    const thisRevenue = (thisWeek.data ?? []).reduce((s, r) => s + Number(r.total_revenue), 0);
    const thisOrders = (thisWeek.data ?? []).reduce((s, r) => s + Number(r.total_orders), 0);
    const lastRevenue = (lastWeek.data ?? []).reduce((s, r) => s + Number(r.total_revenue), 0);
    const lastOrders = (lastWeek.data ?? []).reduce((s, r) => s + Number(r.total_orders), 0);

    const revenueChange = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const ordersChange = lastOrders > 0 ? ((thisOrders - lastOrders) / lastOrders) * 100 : 0;

    const channelRevMap = new Map<string, number>();
    for (const row of thisWeek.data ?? []) {
      channelRevMap.set(
        row.channel_id,
        (channelRevMap.get(row.channel_id) ?? 0) + Number(row.total_revenue)
      );
    }

    let topChannelName = "";
    let topChannelRevenue = 0;
    for (const [chId, rev] of channelRevMap) {
      if (rev > topChannelRevenue) {
        topChannelRevenue = rev;
        topChannelName = channels.data?.find((c) => c.id === chId)?.name ?? "";
      }
    }

    const digestData = {
      totalRevenue: thisRevenue,
      revenueChange,
      totalOrders: thisOrders,
      ordersChange,
      topChannel: topChannelName,
      topChannelRevenue,
      lowStockCount: lowStock.data?.length ?? 0,
      periodLabel: `${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };

    const { subject, html } = weeklyDigestEmail(digestData);
    await sendEmail({ to: email, subject, html });
    sent++;
  }

  return NextResponse.json({ sent });
}
