import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateAnomalyAlerts,
  generateLowStockAlerts,
  mergeNotificationPrefs,
  sendSyncErrorAlert,
} from "@/lib/alerts";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachUtcDateInclusive(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${fromYmd}T12:00:00.000Z`);
  const end = new Date(`${toYmd}T12:00:00.000Z`);
  while (cur <= end) {
    out.push(utcYmd(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function simulationAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_ALERT_SIMULATION === "true" ||
    process.env.ALLOW_ALERT_SIMULATION === "1"
  );
}

type DailyStatRow = {
  org_id: string;
  channel_id: string;
  date: string;
  total_revenue: number;
  total_orders: number;
  total_units: number;
  avg_order_value: number;
  platform_fees: number;
  estimated_cogs: number;
  estimated_profit: number;
};

function statRow(orgId: string, channelId: string, date: string, revenue: number, orders: number): DailyStatRow {
  const o = Math.max(0, orders);
  const r = Math.max(0, revenue);
  return {
    org_id: orgId,
    channel_id: channelId,
    date,
    total_revenue: r,
    total_orders: o,
    total_units: o,
    avg_order_value: o > 0 ? r / o : 0,
    platform_fees: 0,
    estimated_cogs: 0,
    estimated_profit: r,
  };
}

type RecentAlertRow = { id: string; type: string; title: string; created_at: string };

async function fetchRecentAlerts(
  sb: ReturnType<typeof createAdminClient>,
  orgId: string,
  started: number
): Promise<RecentAlertRow[]> {
  const { data } = await sb
    .from("alerts")
    .select("id, type, title, created_at")
    .eq("org_id", orgId)
    .gte("created_at", new Date(started - 2000).toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []) as RecentAlertRow[];
}

async function deleteDedupedAlert(
  sb: ReturnType<typeof createAdminClient>,
  orgId: string,
  type: string,
  dedupeKey: string
) {
  await sb
    .from("alerts")
    .delete()
    .eq("org_id", orgId)
    .eq("type", type)
    .contains("metadata", { dedupe_key: dedupeKey });
}

export async function GET() {
  if (!simulationAllowed()) {
    return NextResponse.json({ error: "Alert simulation is disabled in this environment." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    message:
      "POST JSON { scenario: \"revenue_drop\" | \"order_spike\" | \"low_stock\" | \"sync_error\" }. Uses real alert code + your org data; restores stats/inventory after.",
    gate: "Enabled when NODE_ENV=development or ALLOW_ALERT_SIMULATION=true (and SUPABASE_SERVICE_ROLE_KEY set).",
    scenarios: {
      revenue_drop: {
        prefs: "Turn on Revenue drops (+ Email / In-app as desired).",
        data: "Temporarily replaces org daily_stats for yesterday + prior UTC day on all channels for those dates, then restores.",
      },
      order_spike: {
        prefs: "Turn on Order spikes (off by default in settings).",
        data: "Temporarily replaces ~9 days of org daily_stats (UTC), then restores.",
      },
      low_stock: {
        prefs: "Turn on Low stock (+ Email / In-app).",
        data: "Temporarily sets one product inventory below your threshold, then restores.",
      },
      sync_error: {
        prefs: "Turn on Sync errors (+ Email / In-app).",
        data: "Calls sendSyncErrorAlert only (no order/stats changes).",
      },
    },
  });
}

type Scenario = "revenue_drop" | "order_spike" | "low_stock" | "sync_error";

export async function POST(request: Request) {
  if (!simulationAllowed()) {
    return NextResponse.json({ error: "Alert simulation is disabled in this environment." }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required for simulation (service client + auth.admin email lookup)." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization on profile" }, { status: 400 });
  }

  const orgId = profile.org_id;

  let body: { scenario?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenario = body.scenario as Scenario;
  if (scenario !== "revenue_drop" && scenario !== "order_spike" && scenario !== "low_stock" && scenario !== "sync_error") {
    return NextResponse.json(
      { error: "Invalid scenario", allowed: ["revenue_drop", "order_spike", "low_stock", "sync_error"] },
      { status: 400 }
    );
  }

  const sb = createAdminClient();
  const started = Date.now();

  const { data: orgRow } = await sb.from("organizations").select("notification_preferences").eq("id", orgId).single();
  const prefs = mergeNotificationPrefs(orgRow?.notification_preferences);

  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const priorDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const yStr = utcYmd(yesterday);
  const pStr = utcYmd(priorDay);
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 9));
  const rangeStartStr = utcYmd(rangeStart);

  try {
    if (scenario === "sync_error") {
      await sendSyncErrorAlert(orgId, "Simulation — test channel", "Synthetic failure for notification drill", sb);
      const { data: recent } = await sb
        .from("alerts")
        .select("id, type, title, created_at")
        .eq("org_id", orgId)
        .gte("created_at", new Date(started - 2000).toISOString())
        .order("created_at", { ascending: false })
        .limit(3);

      return NextResponse.json({
        success: true,
        scenario,
        prefs_hint: {
          sync_errors: prefs.sync_errors,
          email: prefs.email,
          in_app: prefs.in_app,
        },
        note: prefs.sync_errors
          ? "If email/in-app are on, you should see a sync_error alert."
          : "sync_errors is off — no alert or email will be sent.",
        recent_alerts: recent ?? [],
      });
    }

    const { data: channel } = await sb
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .neq("status", "disconnected")
      .limit(1)
      .maybeSingle();

    if (!channel?.id) {
      return NextResponse.json(
        { error: "No connected channel found — connect a store first for stats/inventory simulation." },
        { status: 400 }
      );
    }

    const channelId = channel.id;

    if (scenario === "revenue_drop") {
      const { data: backup } = await sb
        .from("daily_stats")
        .select("*")
        .eq("org_id", orgId)
        .in("date", [yStr, pStr]);

      let recent: RecentAlertRow[] = [];
      try {
        await sb.from("daily_stats").delete().eq("org_id", orgId).in("date", [yStr, pStr]);

        await sb.from("daily_stats").upsert(
          [
            statRow(orgId, channelId, pStr, 500, 10),
            statRow(orgId, channelId, yStr, 50, 2),
          ],
          { onConflict: "channel_id,date" }
        );

        await deleteDedupedAlert(sb, orgId, "revenue_drop", `revenue_drop:${yStr}`);
        await generateAnomalyAlerts(orgId, sb);

        recent = await fetchRecentAlerts(sb, orgId, started);
      } finally {
        await sb.from("daily_stats").delete().eq("org_id", orgId).in("date", [yStr, pStr]);
        if (backup?.length) {
          await sb.from("daily_stats").insert(backup as Record<string, unknown>[]);
        }
      }

      return NextResponse.json({
        success: true,
        scenario,
        restored: "daily_stats for " + yStr + " and " + pStr,
        prefs_hint: {
          revenue_drops: prefs.revenue_drops,
          email: prefs.email,
          in_app: prefs.in_app,
        },
        note: prefs.revenue_drops
          ? "Threshold: prior day ≥ $25 and yesterday < 70% of prior — synthetic data met this."
          : "revenue_drops is off — generator skipped; no email or in-app row.",
        recent_alerts: recent,
      });
    }

    if (scenario === "order_spike") {
      const dates = eachUtcDateInclusive(rangeStartStr, yStr);
      const { data: backup } = await sb
        .from("daily_stats")
        .select("*")
        .eq("org_id", orgId)
        .gte("date", rangeStartStr)
        .lte("date", yStr);

      let recent: RecentAlertRow[] = [];
      try {
        await sb.from("daily_stats").delete().eq("org_id", orgId).gte("date", rangeStartStr).lte("date", yStr);

        const rows: DailyStatRow[] = dates.map((d) =>
          d === yStr ? statRow(orgId, channelId, d, 900, 30) : statRow(orgId, channelId, d, 40, 2)
        );
        await sb.from("daily_stats").upsert(rows, { onConflict: "channel_id,date" });

        await deleteDedupedAlert(sb, orgId, "order_spike", `order_spike:${yStr}`);
        await generateAnomalyAlerts(orgId, sb);

        recent = await fetchRecentAlerts(sb, orgId, started);
      } finally {
        await sb.from("daily_stats").delete().eq("org_id", orgId).gte("date", rangeStartStr).lte("date", yStr);
        if (backup?.length) {
          await sb.from("daily_stats").insert(backup as Record<string, unknown>[]);
        }
      }

      return NextResponse.json({
        success: true,
        scenario,
        restored: `daily_stats from ${rangeStartStr} through ${yStr}`,
        prefs_hint: {
          order_spikes: prefs.order_spikes,
          email: prefs.email,
          in_app: prefs.in_app,
        },
        note: prefs.order_spikes
          ? "Threshold: yesterday ≥ 5 orders and ≥ 2.5× median of prior 7 UTC days — synthetic series met this."
          : "order_spikes is off by default — enable it in Settings → Notifications, then run again.",
        recent_alerts: recent,
      });
    }

    // low_stock
    const threshold = prefs.low_stock_threshold;

    const { data: product } = await sb
      .from("products")
      .select("id, title, inventory_quantity")
      .eq("org_id", orgId)
      .not("inventory_quantity", "is", null)
      .limit(1)
      .maybeSingle();

    if (!product?.id || product.inventory_quantity == null) {
      return NextResponse.json(
        { error: "No product with inventory found — sync products from a channel first." },
        { status: 400 }
      );
    }

    const prevQty = Number(product.inventory_quantity);
    const targetQty = Math.min(threshold, 3);

    let recent: RecentAlertRow[] = [];
    try {
      await sb.from("products").update({ inventory_quantity: targetQty }).eq("id", product.id);

      await sb
        .from("alerts")
        .delete()
        .eq("org_id", orgId)
        .eq("type", "low_stock")
        .contains("metadata", { product_id: product.id });

      await generateLowStockAlerts(orgId, sb);

      recent = await fetchRecentAlerts(sb, orgId, started);
    } finally {
      await sb.from("products").update({ inventory_quantity: prevQty }).eq("id", product.id);
    }

    return NextResponse.json({
      success: true,
      scenario,
      restored: `product ${product.id} inventory_quantity → ${prevQty}`,
      product_title: product.title,
      prefs_hint: {
        low_stock: prefs.low_stock,
        threshold,
        email: prefs.email,
        in_app: prefs.in_app,
      },
      note: prefs.low_stock
        ? `Set inventory to ${targetQty} (threshold ${threshold}), ran generateLowStockAlerts, then restored.`
        : "low_stock is off — generator skipped; no email or in-app row.",
      recent_alerts: recent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "simulation failed";
    console.error("[alerts/simulate]", msg);
    return NextResponse.json({ success: false, error: msg, scenario }, { status: 500 });
  }
}
