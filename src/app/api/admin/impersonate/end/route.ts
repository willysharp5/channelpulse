import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { endImpersonation } from "@/lib/admin/impersonate";

export async function POST() {
  try {
    const admin = await requireAdmin();
    await endImpersonation(admin.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
