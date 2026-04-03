import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { lowStockAlertEmail, syncErrorEmail } from "@/lib/email/templates";

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
  const newAlertItems: Array<{ title: string; sku: string | null; quantity: number; threshold: number }> = [];

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

    newAlertItems.push({ title: p.title, sku: p.sku, quantity: qty, threshold });
  }

  if (newAlertItems.length > 0 && prefs.email) {
    const ownerEmail = await getOrgOwnerEmail(orgId, supabase);
    if (ownerEmail) {
      const { subject, html } = lowStockAlertEmail(newAlertItems);
      await sendEmail({ to: ownerEmail, subject, html });
    }
  }
}

export async function sendSyncErrorAlert(
  orgId: string,
  channelName: string,
  technicalError: string,
  supabase: SupabaseClient
) {
  await supabase.from("alerts").insert({
    org_id: orgId,
    type: "sync_error",
    severity: "medium",
    title: `Sync issue with ${channelName}`,
    message: `We had trouble syncing data from ${channelName}. We'll retry automatically.`,
    metadata: { channel_name: channelName, technical_error: technicalError },
  });

  const { data: org } = await supabase
    .from("organizations")
    .select("notification_preferences")
    .eq("id", orgId)
    .single();

  const prefs = mergeNotificationPrefs(org?.notification_preferences);
  if (!prefs.sync_errors || !prefs.email) return;

  const ownerEmail = await getOrgOwnerEmail(orgId, supabase);
  if (!ownerEmail) return;

  const { subject, html } = syncErrorEmail(channelName);
  await sendEmail({ to: ownerEmail, subject, html });
}

async function getOrgOwnerEmail(
  orgId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .single();

  if (!data?.id) return null;

  const { data: authUser } = await supabase.auth.admin.getUserById(data.id);
  return authUser?.user?.email ?? null;
}
