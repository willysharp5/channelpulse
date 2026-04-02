import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: userId } = await params;
    const { plan } = await request.json();

    if (!plan) {
      return NextResponse.json({ error: "Plan required" }, { status: 400 });
    }

    const sb = createAdminClient();

    const { data: existing } = await sb
      .from("subscriptions")
      .select("id, plan")
      .eq("user_id", userId)
      .single();

    const oldPlan = existing?.plan ?? "free";

    if (existing) {
      await sb
        .from("subscriptions")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await sb.from("subscriptions").insert({
        user_id: userId,
        plan,
        status: "active",
        amount: 0,
      });
    }

    await logAuditEvent(admin.id, "change_plan", userId, {
      from: oldPlan,
      to: plan,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
