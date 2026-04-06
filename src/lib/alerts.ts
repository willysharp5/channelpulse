import type { SupabaseClient } from "@supabase/supabase-js";
import {
  lowStockAlertEmail,
  orderSpikeEmail,
  revenueDropEmail,
  syncErrorEmail,
} from "@/lib/email/templates";
import { sendTransactionalIfEnabled } from "@/lib/email/resolve-transactional-outgoing";

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
  critical_threshold?: number;
  low_threshold?: number;
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
    | "critical_threshold"
    | "low_threshold"
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
  low_stock_threshold: 5,
  critical_threshold: 5,
  low_threshold: 20,
};

export function mergeNotificationPrefs(raw: unknown): typeof DEFAULT_NOTIFICATION_PREFS {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const critical = Math.max(0, Number(o.critical_threshold ?? DEFAULT_NOTIFICATION_PREFS.critical_threshold));
  const low = Math.max(critical + 1, Number(o.low_threshold ?? DEFAULT_NOTIFICATION_PREFS.low_threshold));
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
    low_stock_threshold: critical,
    critical_threshold: critical,
    low_threshold: low,
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function alertDedupeExists(
  supabase: SupabaseClient,
  orgId: string,
  type: string,
  dedupeKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from("alerts")
    .select("id")
    .eq("org_id", orgId)
    .eq("type", type)
    .contains("metadata", { dedupe_key: dedupeKey })
    .maybeSingle();
  return !!data;
}

async function getOrgOwnerEmail(orgId: string, supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("id").eq("org_id", orgId).limit(1).maybeSingle();

  if (!data?.id) return null;

  const { data: authUser } = await supabase.auth.admin.getUserById(data.id);
  return authUser?.user?.email ?? null;
}

/** After daily_stats refresh: revenue drop vs prior day, order spike vs recent median. Idempotent per calendar day. */
export async function generateAnomalyAlerts(orgId: string, supabase: SupabaseClient) {
  const { data: org } = await supabase
    .from("organizations")
    .select("notification_preferences")
    .eq("id", orgId)
    .single();

  const prefs = mergeNotificationPrefs(org?.notification_preferences);
  if (!prefs.revenue_drops && !prefs.order_spikes) return;

  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const priorDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const yStr = utcYmd(yesterday);
  const pStr = utcYmd(priorDay);

  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 9));
  const rangeStartStr = utcYmd(rangeStart);

  const { data: statsRows } = await supabase
    .from("daily_stats")
    .select("date, total_revenue, total_orders")
    .eq("org_id", orgId)
    .gte("date", rangeStartStr)
    .lte("date", yStr);

  const byDate = new Map<string, { rev: number; ord: number }>();
  for (const r of statsRows ?? []) {
    const d = String(r.date);
    const cur = byDate.get(d) ?? { rev: 0, ord: 0 };
    cur.rev += Number(r.total_revenue);
    cur.ord += Number(r.total_orders);
    byDate.set(d, cur);
  }

  const revY = byDate.get(yStr)?.rev ?? 0;
  const revP = byDate.get(pStr)?.rev ?? 0;
  const ordY = byDate.get(yStr)?.ord ?? 0;

  const MIN_REV_BASE = 25;
  const DROP_RATIO = 0.7;

  if (prefs.revenue_drops && revP >= MIN_REV_BASE && revY < revP * DROP_RATIO) {
    const dedupeKey = `revenue_drop:${yStr}`;
    const exists = await alertDedupeExists(supabase, orgId, "revenue_drop", dedupeKey);
    if (!exists) {
      const dropPct = Math.round((1 - revY / revP) * 100);
      const title = `Revenue dropped ${dropPct}%`;
      const message = `Yesterday was $${Math.round(revY).toLocaleString()} vs $${Math.round(revP).toLocaleString()} the prior day.`;
      const ordersQs = `from=${encodeURIComponent(pStr)}&to=${encodeURIComponent(yStr)}`;
      const metadata = {
        dedupe_key: dedupeKey,
        compare_date: yStr,
        yesterday_revenue: revY,
        prior_revenue: revP,
        action_url: `/orders?${ordersQs}`,
        link_label: "View orders",
      };

      if (prefs.in_app) {
        await supabase.from("alerts").insert({
          org_id: orgId,
          type: "revenue_drop",
          severity: "medium",
          title,
          message,
          metadata,
        });
      }

      if (prefs.email) {
        const ownerEmail = await getOrgOwnerEmail(orgId, supabase);
        if (ownerEmail) {
          await sendTransactionalIfEnabled(supabase, "revenue_drop", ownerEmail, () =>
            revenueDropEmail({
              yesterdayLabel: "Yesterday",
              yesterdayRevenue: revY,
              priorRevenue: revP,
              dropPct,
              orderRangeFromYmd: pStr,
              orderRangeToYmd: yStr,
            })
          );
        }
      }
    }
  }

  if (prefs.order_spikes) {
    const priorOrderCounts: number[] = [];
    for (let i = 2; i <= 8; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const ds = utcYmd(d);
      const o = byDate.get(ds)?.ord ?? 0;
      priorOrderCounts.push(o);
    }

    const baseline = median(priorOrderCounts);
    const nonZeroDays = priorOrderCounts.filter((n) => n > 0).length;
    const SPIKE_MULT = 2.5;
    const MIN_ORDERS = 5;

    if (
      nonZeroDays >= 3 &&
      baseline >= 1 &&
      ordY >= MIN_ORDERS &&
      ordY >= baseline * SPIKE_MULT
    ) {
      const dedupeKey = `order_spike:${yStr}`;
      const exists = await alertDedupeExists(supabase, orgId, "order_spike", dedupeKey);
      if (!exists) {
        const title = "Unusual order volume";
        const message = `${ordY} orders yesterday vs a typical recent day (~${Math.round(baseline)}).`;
        const ordersQs = `from=${encodeURIComponent(yStr)}&to=${encodeURIComponent(yStr)}`;
        const metadata = {
          dedupe_key: dedupeKey,
          compare_date: yStr,
          orders: ordY,
          baseline: Math.round(baseline * 10) / 10,
          action_url: `/orders?${ordersQs}`,
          link_label: "View orders",
        };

        if (prefs.in_app) {
          await supabase.from("alerts").insert({
            org_id: orgId,
            type: "order_spike",
            severity: "medium",
            title,
            message,
            metadata,
          });
        }

        if (prefs.email) {
          const ownerEmail = await getOrgOwnerEmail(orgId, supabase);
          if (ownerEmail) {
            await sendTransactionalIfEnabled(supabase, "order_spike", ownerEmail, () =>
              orderSpikeEmail({
                dayLabel: "yesterday",
                orders: ordY,
                baseline: Math.round(baseline * 10) / 10,
                spikeDayYmd: yStr,
              })
            );
          }
        }
      }
    }
  }
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
    const metadata = {
      product_id: p.id,
      sku: p.sku,
      channel_id: p.channel_id,
      quantity: qty,
      threshold,
      action_url: "/inventory?stock=below_threshold",
      link_label: "View inventory",
    };

    if (prefs.in_app) {
      await supabase.from("alerts").insert({
        org_id: orgId,
        type: "low_stock",
        severity: qty <= 0 ? "high" : "medium",
        title: qty <= 0 ? "Out of stock" : "Low stock",
        message: `${p.title}${p.sku ? ` (${p.sku})` : ""} is at ${qty} units (threshold ${threshold}).`,
        metadata,
      });
    }

    newAlertItems.push({ title: p.title, sku: p.sku, quantity: qty, threshold });
  }

  if (newAlertItems.length > 0 && prefs.email) {
    const ownerEmail = await getOrgOwnerEmail(orgId, supabase);
    if (ownerEmail) {
      await sendTransactionalIfEnabled(supabase, "low_stock", ownerEmail, () =>
        lowStockAlertEmail(newAlertItems)
      );
    }
  }
}

export async function sendSyncErrorAlert(
  orgId: string,
  channelName: string,
  technicalError: string,
  supabase: SupabaseClient
) {
  const { data: org } = await supabase
    .from("organizations")
    .select("notification_preferences")
    .eq("id", orgId)
    .single();

  const prefs = mergeNotificationPrefs(org?.notification_preferences);
  if (!prefs.sync_errors) return;

  const metadata = {
    channel_name: channelName,
    technical_error: technicalError,
    action_url: "/settings?tab=channels",
    link_label: "Check channels",
  };

  if (prefs.in_app) {
    await supabase.from("alerts").insert({
      org_id: orgId,
      type: "sync_error",
      severity: "medium",
      title: `Sync issue with ${channelName}`,
      message: `We had trouble syncing data from ${channelName}. We'll retry automatically.`,
      metadata,
    });
  }

  if (prefs.email) {
    const ownerEmail = await getOrgOwnerEmail(orgId, supabase);
    if (ownerEmail) {
      await sendTransactionalIfEnabled(supabase, "sync_error", ownerEmail, () =>
        syncErrorEmail(channelName)
      );
    }
  }
}
