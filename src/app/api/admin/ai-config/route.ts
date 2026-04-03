import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("ai_config")
      .select("*")
      .limit(1)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const sb = createAdminClient();
    const body = await request.json();

    const allowed = [
      "provider",
      "model_id",
      "model_display_name",
      "temperature",
      "max_tokens",
      "system_prompt",
    ];

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data: existing } = await sb
      .from("ai_config")
      .select("id")
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "No config found" }, { status: 404 });
    }

    const { error } = await sb
      .from("ai_config")
      .update(updates)
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent(admin.id, "update_ai_config", undefined, { changes: updates });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
