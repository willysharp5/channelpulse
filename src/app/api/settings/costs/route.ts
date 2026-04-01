import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await request.json();

  const { error } = await supabase.from("cost_settings").upsert({
    org_id: profile.org_id,
    platform_fee_percent: body.platform_fee_percent,
    platform_fee_flat: body.platform_fee_flat,
    shipping_cost_percent: body.shipping_cost_percent,
    payment_processing_percent: body.payment_processing_percent,
    advertising_monthly: body.advertising_monthly,
    refund_rate_percent: body.refund_rate_percent,
    other_expenses_monthly: body.other_expenses_monthly,
    default_cogs_percent: body.default_cogs_percent,
    cogs_method: body.cogs_method,
  }, { onConflict: "org_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
