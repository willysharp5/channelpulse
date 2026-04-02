import { NextResponse } from "next/server";
import { requireAdmin, getAdminDashboardStats } from "@/lib/admin/queries";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getAdminDashboardStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
