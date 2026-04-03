import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) return new Response("No org", { status: 400 });

  const { data: products } = await supabase
    .from("products")
    .select("title, sku, platform, status, cogs, inventory_quantity, inventory_updated_at")
    .eq("org_id", profile.org_id)
    .order("title", { ascending: true });

  const headers = [
    "Title", "SKU", "Platform", "Status", "COGS", "Stock", "Stock Updated",
  ];

  const rows = (products ?? []).map((p) => [
    p.title, p.sku, p.platform, p.status, p.cogs, p.inventory_quantity,
    p.inventory_updated_at ? new Date(p.inventory_updated_at).toISOString().split("T")[0] : "",
  ]);

  const csv = toCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  return csvResponse(csv, `channelpulse-products-${date}.csv`);
}
