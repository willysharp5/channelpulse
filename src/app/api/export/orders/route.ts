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
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("order_number, platform, status, financial_status, customer_name, customer_email, subtotal, total_tax, total_shipping, total_discounts, total_amount, platform_fees, net_profit, currency, item_count, ordered_at")
    .eq("org_id", profile.org_id)
    .gte("ordered_at", since)
    .order("ordered_at", { ascending: false });

  const headers = [
    "Order Number", "Platform", "Status", "Payment Status", "Customer", "Email",
    "Subtotal", "Tax", "Shipping", "Discounts", "Total", "Platform Fees",
    "Net Profit", "Currency", "Items", "Date",
  ];

  const rows = (orders ?? []).map((o) => [
    o.order_number, o.platform, o.status, o.financial_status,
    o.customer_name, o.customer_email, o.subtotal, o.total_tax,
    o.total_shipping, o.total_discounts, o.total_amount, o.platform_fees,
    o.net_profit, o.currency, o.item_count,
    new Date(o.ordered_at).toISOString().split("T")[0],
  ]);

  const csv = toCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  return csvResponse(csv, `channelpulse-orders-${date}.csv`);
}
