import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { order } = await request.json() as { order: string[] };

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array of IDs" }, { status: 400 });
    }

    const updates = order.map((id, index) =>
      sb.from("suggested_reports").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id)
    );

    await Promise.all(updates);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
