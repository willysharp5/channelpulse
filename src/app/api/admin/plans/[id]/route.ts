import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { updatePlan } from "@/lib/plans";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const allowed = [
      "name",
      "price_amount",
      "channels_limit",
      "orders_per_month",
      "history_days",
      "features",
      "is_popular",
      "is_active",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    await updatePlan(id, updates);
    await logAuditEvent(admin.id, "update_plan", undefined, { plan: id, changes: updates });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
