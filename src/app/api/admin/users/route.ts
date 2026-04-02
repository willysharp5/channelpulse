import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getAdminUsers } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const plan = searchParams.get("plan") ?? undefined;

    const users = await getAdminUsers(search, status, plan);
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
