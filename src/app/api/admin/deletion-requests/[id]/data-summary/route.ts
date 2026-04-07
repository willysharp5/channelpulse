import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createAdminClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: req } = await sb
    .from("account_deletion_requests")
    .select("user_id, org_id")
    .eq("id", id)
    .single();

  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = req.user_id;
  const orgId = req.org_id;

  const tables = [
    { name: "profiles", query: sb.from("profiles").select("id", { count: "exact", head: true }).eq("id", userId) },
    { name: "subscriptions", query: sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId) },
    { name: "chat_threads", query: orgId ? sb.from("chat_threads").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "organizations", query: orgId ? sb.from("organizations").select("id", { count: "exact", head: true }).eq("id", orgId) : null },
    { name: "channels", query: orgId ? sb.from("channels").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "orders", query: orgId ? sb.from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "products", query: orgId ? sb.from("products").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "daily_stats", query: orgId ? sb.from("daily_stats").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "alerts", query: orgId ? sb.from("alerts").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "cost_settings", query: orgId ? sb.from("cost_settings").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "channel_pnl_settings", query: orgId ? sb.from("channel_pnl_settings").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
    { name: "import_jobs", query: orgId ? sb.from("import_jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId) : null },
  ];

  const results = await Promise.all(
    tables.map(async (t) => {
      if (!t.query) return { table: t.name, count: 0 };
      const { count } = await t.query;
      return { table: t.name, count: count ?? 0 };
    })
  );

  return NextResponse.json({
    summary: results.filter((r) => r.count > 0),
    total: results.reduce((acc, r) => acc + r.count, 0),
  });
}
