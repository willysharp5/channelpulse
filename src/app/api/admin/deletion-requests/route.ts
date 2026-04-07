import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "50")));

  const sb = createAdminClient();

  let query = sb
    .from("account_deletion_requests")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,business_name.ilike.%${search}%,stripe_customer_id.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pendingCount = status === "pending"
    ? (data ?? []).length
    : ((await sb.from("account_deletion_requests").select("id", { count: "exact", head: true }).eq("status", "pending")).count ?? 0);

  return NextResponse.json({ requests: data ?? [], pendingCount });
}
