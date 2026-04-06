import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeNotificationPrefs } from "@/lib/alerts";

/** Only same-origin paths (prevents open redirects). */
function safeInternalPath(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//")) return null;
  if (t.includes("://")) return null;
  return t.slice(0, 500);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const ALERT_TYPES = ["import_complete", "import_failed", "import_stalled"] as const;
  type ClientAlertType = (typeof ALERT_TYPES)[number];

  let body: {
    type?: string;
    title?: string;
    message?: string;
    action_url?: string;
    link_label?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!ALERT_TYPES.includes(body.type as ClientAlertType)) {
    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  }

  const alertType = body.type as ClientAlertType;

  const title = String(body.title ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (!title || !message) {
    return NextResponse.json({ error: "title and message required" }, { status: 400 });
  }

  const actionPath = safeInternalPath(body.action_url);
  const linkLabel = String(body.link_label ?? "").trim().slice(0, 80);
  const metadata: Record<string, string> = {};
  if (actionPath) metadata.action_url = actionPath;
  if (linkLabel) metadata.link_label = linkLabel;

  /** Prefer high / medium / info (matches server-side alerts); DB also allows error / warning / low / critical. */
  const severity =
    alertType === "import_failed" ? "high" : alertType === "import_stalled" ? "medium" : "info";

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      org_id: profile.org_id,
      type: alertType,
      severity,
      title,
      message,
      metadata: Object.keys(metadata).length ? metadata : {},
    })
    .select("id, type, severity, title, message, created_at, is_read, metadata")
    .single();

  if (error) {
    console.error("[alerts POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: data });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(notification_preferences)")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) return NextResponse.json({ alerts: [], unreadCount: 0 });

  const orgRaw = profile.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { notification_preferences?: unknown } | null;
  const prefs = mergeNotificationPrefs(org?.notification_preferences);

  if (!prefs.in_app) {
    return NextResponse.json({ alerts: [], unreadCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));

  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("id, type, severity, title, message, metadata, is_read, is_dismissed, created_at")
    .eq("org_id", profile.org_id)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[alerts GET]", error.message);
    return NextResponse.json({ alerts: [], unreadCount: 0 });
  }

  const list = (alerts ?? []).filter((a) => {
    switch (a.type) {
      case "sync_error":
        return prefs.sync_errors;
      case "revenue_drop":
        return prefs.revenue_drops;
      case "order_spike":
        return prefs.order_spikes;
      case "low_stock":
        return prefs.low_stock;
      default:
        return true;
    }
  });
  const unreadCount = list.filter((a) => !a.is_read).length;

  return NextResponse.json({ alerts: list, unreadCount });
}
