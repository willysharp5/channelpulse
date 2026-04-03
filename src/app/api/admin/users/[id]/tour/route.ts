import { NextResponse } from "next/server";
import { requireAdmin, logAuditEvent } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

/** Super admin: set `has_seen_dashboard_tour` for a user's profile (controls Overview guided tour). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: userId } = await params;
    const body = await request.json().catch(() => ({}));
    const seen = body.has_seen_dashboard_tour;

    if (typeof seen !== "boolean") {
      return NextResponse.json(
        { error: "Body must include has_seen_dashboard_tour: boolean" },
        { status: 400 }
      );
    }

    const sb = createAdminClient();
    const { error } = await sb
      .from("profiles")
      .update({ has_seen_dashboard_tour: seen })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent(admin.id, "dashboard_tour_flag", userId, {
      has_seen_dashboard_tour: seen,
    });

    return NextResponse.json({ ok: true, has_seen_dashboard_tour: seen });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
