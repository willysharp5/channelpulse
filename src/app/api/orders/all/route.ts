import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return NextResponse.json([]);

  const { data: orders } = await supabase
    .from("orders")
    .select("id, platform, platform_order_id, order_number, status, financial_status, customer_name, customer_email, total_amount, subtotal, total_tax, total_shipping, total_discounts, platform_fees, net_profit, currency, item_count, ordered_at")
    .eq("org_id", profile.org_id)
    .order("ordered_at", { ascending: false });

  return NextResponse.json(orders ?? []);
}
