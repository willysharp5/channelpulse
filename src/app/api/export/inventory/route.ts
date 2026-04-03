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
    .select("title, sku, platform, inventory_quantity, inventory_updated_at, channel_id")
    .eq("org_id", profile.org_id)
    .not("inventory_quantity", "is", null)
    .order("inventory_quantity", { ascending: true });

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name")
    .eq("org_id", profile.org_id);

  const channelMap = new Map((channels ?? []).map((c) => [c.id, c.name]));

  const headers = [
    "Product", "SKU", "Platform", "Channel", "Stock", "Status", "Last Updated",
  ];

  const rows = (products ?? []).map((p) => {
    const qty = Number(p.inventory_quantity ?? 0);
    const status = qty <= 0 ? "Out of Stock" : qty <= 10 ? "Low" : "Healthy";
    return [
      p.title, p.sku, p.platform, channelMap.get(p.channel_id) ?? "",
      qty, status,
      p.inventory_updated_at ? new Date(p.inventory_updated_at).toISOString().split("T")[0] : "",
    ];
  });

  const csv = toCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  return csvResponse(csv, `channelpulse-inventory-${date}.csv`);
}
