import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) return new Response("No org", { status: 400 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const { data: stats } = await supabase
    .from("daily_stats")
    .select("date, channel_id, total_revenue, total_orders, total_units, platform_fees, estimated_cogs, estimated_profit")
    .eq("org_id", profile.org_id)
    .gte("date", since)
    .order("date", { ascending: true });

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, platform")
    .eq("org_id", profile.org_id);

  const channelMap = new Map((channels ?? []).map((c) => [c.id, { name: c.name, platform: c.platform }]));

  const headers = [
    "Date", "Channel", "Platform", "Revenue", "Orders", "Units",
    "Platform Fees", "COGS", "Profit", "Margin %",
  ];

  const rows = (stats ?? []).map((s) => {
    const ch = channelMap.get(s.channel_id);
    const revenue = Number(s.total_revenue);
    const profit = Number(s.estimated_profit);
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
    return [
      s.date, ch?.name ?? "", ch?.platform ?? "",
      revenue.toFixed(2), s.total_orders, s.total_units,
      Number(s.platform_fees).toFixed(2), Number(s.estimated_cogs).toFixed(2),
      profit.toFixed(2), margin,
    ];
  });

  const csv = toCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  return csvResponse(csv, `channelpulse-pnl-${date}.csv`);
}
