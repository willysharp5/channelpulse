import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sb = createAdminClient();

    const { data: profile } = await sb
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profile?.org_id) {
      await sb.from("channels").delete().eq("org_id", profile.org_id);
      await sb.from("orders").delete().eq("org_id", profile.org_id);
      await sb.from("daily_stats").delete().eq("org_id", profile.org_id);
      await sb.from("products").delete().eq("org_id", profile.org_id);
      await sb.from("cost_settings").delete().eq("org_id", profile.org_id);
      await sb.from("organizations").delete().eq("id", profile.org_id);
    }

    await sb.from("subscriptions").delete().eq("user_id", user.id);
    await sb.from("profiles").delete().eq("id", user.id);

    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("Failed to delete auth user:", error);
    }

    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
