import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const sb = createAdminClient();
    const body = await request.json();

    const allowed = [
      "icon_name",
      "title",
      "description",
      "prompt",
      "accent_class",
      "sort_order",
      "is_active",
    ];

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { error } = await sb
      .from("suggested_reports")
      .update(updates)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent(admin.id, "update_suggested_report", undefined, {
      report_id: id,
      changes: updates,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const sb = createAdminClient();

    const { error } = await sb
      .from("suggested_reports")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent(admin.id, "delete_suggested_report", undefined, {
      report_id: id,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
