import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationPreferences = {
  sync_errors?: boolean;
  revenue_drops?: boolean;
  low_stock?: boolean;
  order_spikes?: boolean;
  weekly_digest?: boolean;
  monthly_report?: boolean;
  channel_summary?: boolean;
  email?: boolean;
  in_app?: boolean;
  browser_push?: boolean;
  low_stock_threshold?: number;
};

export const DEFAULT_NOTIFICATION_PREFS: Required<
  Pick<
    NotificationPreferences,
    | "sync_errors"
    | "revenue_drops"
    | "low_stock"
    | "order_spikes"
    | "weekly_digest"
    | "monthly_report"
    | "channel_summary"
    | "email"
    | "in_app"
    | "browser_push"
    | "low_stock_threshold"
  >
> = {
  sync_errors: true,
  revenue_drops: true,
  low_stock: true,
  order_spikes: false,
  weekly_digest: false,
  monthly_report: false,
  channel_summary: false,
  email: true,
  in_app: true,
  browser_push: false,
  low_stock_threshold: 10,
};

export function mergeNotificationPrefs(raw: unknown): typeof DEFAULT_NOTIFICATION_PREFS {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    sync_errors: o.sync_errors !== false,
    revenue_drops: o.revenue_drops !== false,
    low_stock: o.low_stock !== false,
    order_spikes: o.order_spikes === true,
    weekly_digest: o.weekly_digest === true,
    monthly_report: o.monthly_report === true,
    channel_summary: o.channel_summary === true,
    email: o.email !== false,
    in_app: o.in_app !== false,
    browser_push: o.browser_push === true,
    low_stock_threshold: Math.max(0, Number(o.low_stock_threshold ?? DEFAULT_NOTIFICATION_PREFS.low_stock_threshold)),
  };
}

/** Create low-stock alerts after inventory sync (service client). */
export async function generateLowStockAlerts(orgId: string, supabase: SupabaseClient) {
  const { data: org } = await supabase
    .from("organizations")
    .select("notification_preferences")
    .eq("id", orgId)
    .single();

  const prefs = mergeNotificationPrefs(org?.notification_preferences);
  if (!prefs.low_stock) return;

  const threshold = prefs.low_stock_threshold;

  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, sku, inventory_quantity, channel_id")
    .eq("org_id", orgId)
    .lte("inventory_quantity", threshold);

  if (error || !products?.length) return;

  const dayAgo = new Date(Date.now() - 86400000).toISOString();

  for (const p of products) {
    if (p.inventory_quantity == null) continue;

    const { data: dup } = await supabase
      .from("alerts")
      .select("id")
      .eq("org_id", orgId)
      .eq("type", "low_stock")
      .gte("created_at", dayAgo)
      .contains("metadata", { product_id: p.id })
      .maybeSingle();

    if (dup) continue;

    const qty = Number(p.inventory_quantity);
    await supabase.from("alerts").insert({
      org_id: orgId,
      type: "low_stock",
      severity: qty <= 0 ? "high" : "medium",
      title: qty <= 0 ? "Out of stock" : "Low stock",
      message: `${p.title}${p.sku ? ` (${p.sku})` : ""} is at ${qty} units (threshold ${threshold}).`,
      metadata: {
        product_id: p.id,
        sku: p.sku,
        channel_id: p.channel_id,
        quantity: qty,
        threshold,
      },
    });
  }
}
