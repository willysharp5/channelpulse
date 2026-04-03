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
    const { role } = await request.json();

    if (!role || !["super_admin", "owner", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (userId === admin.id && role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin access" },
        { status: 400 }
      );
    }

    const sb = createAdminClient();

    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const oldRole = profile?.role ?? "owner";

    await sb
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    await logAuditEvent(admin.id, "change_role", userId, {
      from: oldRole,
      to: role,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
