import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { order } = (await request.json()) as { order: string[] };

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array of IDs" }, { status: 400 });
    }

    await Promise.all(
      order.map((id, index) =>
        sb
          .from("ai_model_presets")
          .update({ sort_order: index, updated_at: new Date().toISOString() })
          .eq("id", id)
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
