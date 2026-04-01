import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ orders: [], products: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ orders: [], products: [] });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ orders: [], products: [] });
  }

  const orgId = profile.org_id;
  const fuzzyPattern = `%${query}%`;

  const [ordersResult, productsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total_amount, platform, status, ordered_at")
      .eq("org_id", orgId)
      .or(`order_number.ilike.${fuzzyPattern},customer_name.ilike.${fuzzyPattern},platform_order_id.ilike.${fuzzyPattern}`)
      .order("ordered_at", { ascending: false })
      .limit(8),

    supabase
      .from("products")
      .select("id, title, sku, category, status")
      .eq("org_id", orgId)
      .or(`title.ilike.${fuzzyPattern},sku.ilike.${fuzzyPattern},category.ilike.${fuzzyPattern}`)
      .order("title", { ascending: true })
      .limit(8),
  ]);

  return NextResponse.json({
    orders: ordersResult.data ?? [],
    products: productsResult.data ?? [],
  });
}
