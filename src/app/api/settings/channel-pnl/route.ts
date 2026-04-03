import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RowIn = {
  channelId: string;
  platform_fee_percent: number | null;
  platform_fee_flat: number | null;
  marketing_monthly: number | null;
  shipping_cost_percent: number | null;
  payment_processing_percent: number | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();

  if (!profile?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = (await request.json()) as { rows?: RowIn[] };
  const rows = body.rows ?? [];
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const orgId = profile.org_id;

  const { data: orgChannels, error: chErr } = await supabase
    .from("channels")
    .select("id")
    .eq("org_id", orgId);

  if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

  const allowed = new Set((orgChannels ?? []).map((c) => c.id as string));

  for (const r of rows) {
    if (!allowed.has(r.channelId)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }

    const pct = r.platform_fee_percent;
    const flat = r.platform_fee_flat;
    const mkt = r.marketing_monthly;
    const ship = r.shipping_cost_percent;
    const proc = r.payment_processing_percent;
    const allUnset =
      pct == null && flat == null && mkt == null && ship == null && proc == null;

    if (allUnset) {
      await supabase.from("channel_pnl_settings").delete().eq("channel_id", r.channelId).eq("org_id", orgId);
    } else {
      const { error } = await supabase.from("channel_pnl_settings").upsert(
        {
          channel_id: r.channelId,
          org_id: orgId,
          platform_fee_percent: pct,
          platform_fee_flat: flat,
          marketing_monthly: mkt,
          shipping_cost_percent: ship,
          payment_processing_percent: proc,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "channel_id" }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
