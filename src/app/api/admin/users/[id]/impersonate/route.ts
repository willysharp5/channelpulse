import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { startImpersonation } from "@/lib/admin/impersonate";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: targetUserId } = await params;
    await startImpersonation(admin.id, targetUserId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
