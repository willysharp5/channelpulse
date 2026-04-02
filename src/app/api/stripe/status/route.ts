import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ plan: "free", synced: false });
    }

    const sb = createAdminClient();
    const { data: sub } = await sb
      .from("subscriptions")
      .select("plan, status, stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("stripe_subscription_id", "is", null)
      .single();

    if (sub) {
      return NextResponse.json({ plan: sub.plan, synced: true });
    }

    return NextResponse.json({ plan: "free", synced: false });
  } catch {
    return NextResponse.json({ plan: "free", synced: false });
  }
}
