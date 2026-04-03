import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("suggested_reports")
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
      .from("suggested_reports")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await sb
      .from("suggested_reports")
      .insert({
        icon_name: body.icon_name ?? "BarChart3",
        title: body.title,
        description: body.description,
        prompt: body.prompt,
        accent_class: body.accent_class ?? "bg-blue-500/10 text-blue-500",
        sort_order: (maxOrder?.sort_order ?? -1) + 1,
        is_active: body.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent(admin.id, "create_suggested_report", undefined, {
      title: body.title,
    });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
