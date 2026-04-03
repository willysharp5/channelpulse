import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await request.json();

  // Bulk: same COGS for many product IDs (org-scoped)
  if (Array.isArray(body.productIds) && body.cogs != null) {
    const cogs = Number(body.cogs);
    if (Number.isNaN(cogs) || cogs < 0) {
      return NextResponse.json({ error: "Invalid cogs" }, { status: 400 });
    }
    const ids = (body.productIds as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No product IDs" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("products")
      .update({ cogs })
      .eq("org_id", profile.org_id)
      .in("id", ids)
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, updated: data?.length ?? 0 });
  }

  // Single product update
  if (body.productId) {
    const { error } = await supabase
      .from("products")
      .update({ cogs: Number(body.cogs ?? 0) })
      .eq("id", body.productId)
      .eq("org_id", profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Batch update: array of { sku, cogs } or { title, cogs }
  if (Array.isArray(body.updates)) {
    let updated = 0;
    let errors: string[] = [];

    for (const item of body.updates) {
      const cogs = Number(item.cogs ?? item.cost ?? 0);
      if (cogs < 0) continue;

      let query = supabase
        .from("products")
        .update({ cogs })
        .eq("org_id", profile.org_id);

      if (item.sku) {
        query = query.eq("sku", item.sku);
      } else if (item.title) {
        query = query.eq("title", item.title);
      } else if (item.id) {
        query = query.eq("id", item.id);
      } else {
        errors.push(`Row skipped: no sku, title, or id provided`);
        continue;
      }

      const { error, count } = await query;
      if (error) {
        errors.push(`${item.sku ?? item.title}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated, errors: errors.length > 0 ? errors : undefined });
  }

  return NextResponse.json({ error: "Provide productId+cogs or updates[]" }, { status: 400 });
}
