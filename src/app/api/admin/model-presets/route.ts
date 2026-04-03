import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("ai_model_presets")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const sb = createAdminClient();
    const body = await request.json();

    const { data: maxOrder } = await sb
      .from("ai_model_presets")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await sb
      .from("ai_model_presets")
      .insert({
        provider: body.provider ?? "openrouter",
        model_id: body.model_id,
        display_name: body.display_name,
        sort_order: (maxOrder?.sort_order ?? -1) + 1,
        is_active: body.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent(admin.id, "create_model_preset", undefined, {
      display_name: body.display_name,
      model_id: body.model_id,
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
