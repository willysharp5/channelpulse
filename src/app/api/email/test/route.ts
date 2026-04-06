import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import {
  lowStockAlertEmail,
  orderSpikeEmail,
  revenueDropEmail,
  syncErrorEmail,
  weeklyDigestEmail,
} from "@/lib/email/templates";

const EMAIL_TYPES = [
  "low_stock",
  "sync_error",
  "weekly_digest",
  "revenue_drop",
  "order_spike",
] as const;

type EmailTestType = (typeof EMAIL_TYPES)[number];

function isEmailTestType(t: string): t is EmailTestType {
  return (EMAIL_TYPES as readonly string[]).includes(t);
}

type DeliverMode = "email" | "in_app" | "both";

function parseDeliver(raw: unknown): DeliverMode {
  if (raw === "in_app" || raw === "both") return raw;
  return "email";
}

function buildTestEmail(type: EmailTestType): { subject: string; html: string } {
  switch (type) {
    case "low_stock":
      return lowStockAlertEmail([
        { title: "Blue Widget — Large", sku: "BW-LG-001", quantity: 3, threshold: 10 },
        { title: "Red T-Shirt", sku: "RT-MD-002", quantity: 0, threshold: 10 },
        { title: "Wireless Earbuds", sku: null, quantity: 5, threshold: 10 },
      ]);
    case "sync_error":
      return syncErrorEmail("Amazon US Store");
    case "weekly_digest":
      return weeklyDigestEmail({
        totalRevenue: 24831,
        revenueChange: 12.4,
        totalOrders: 342,
        ordersChange: 8.2,
        topChannel: "Shopify",
        topChannelRevenue: 15200,
        lowStockCount: 3,
        periodLabel: "Mar 24 – Mar 31, 2026",
      });
    case "revenue_drop":
      return revenueDropEmail({
        yesterdayLabel: "Yesterday (sample)",
        yesterdayRevenue: 420,
        priorRevenue: 1200,
        dropPct: 65,
      });
    case "order_spike":
      return orderSpikeEmail({
        dayLabel: "yesterday (sample)",
        orders: 48,
        baseline: 12,
      });
  }
}

async function insertTestInAppAlert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  type: EmailTestType
): Promise<{ id: string } | { error: string }> {
  const testTag = { test: true, manual_test_at: new Date().toISOString() };

  switch (type) {
    case "weekly_digest":
      return { error: "weekly_digest is email-only" };
    case "sync_error": {
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          org_id: orgId,
          type: "sync_error",
          severity: "medium",
          title: "[Test] Sync issue with Demo Channel",
          message: "Sample alert — we had trouble syncing data from Demo Channel. We'll retry automatically.",
          metadata: {
            ...testTag,
            channel_name: "Demo Channel",
            action_url: "/settings?tab=channels",
            link_label: "Check channels",
          },
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      return { id: data.id };
    }
    case "revenue_drop": {
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          org_id: orgId,
          type: "revenue_drop",
          severity: "medium",
          title: "[Test] Revenue dropped 65%",
          message: "Sample alert — yesterday was $420 vs $1,200 the prior day.",
          metadata: {
            ...testTag,
            dedupe_key: `manual_test:revenue_drop:${Date.now()}`,
            action_url: "/",
            link_label: "View dashboard",
          },
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      return { id: data.id };
    }
    case "order_spike": {
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          org_id: orgId,
          type: "order_spike",
          severity: "medium",
          title: "[Test] Unusual order volume",
          message: "Sample alert — 48 orders yesterday vs a typical recent day (~12).",
          metadata: {
            ...testTag,
            dedupe_key: `manual_test:order_spike:${Date.now()}`,
            action_url: "/orders",
            link_label: "View orders",
          },
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      return { id: data.id };
    }
    case "low_stock": {
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          org_id: orgId,
          type: "low_stock",
          severity: "medium",
          title: "[Test] Low stock",
          message: "Sample alert — Demo SKU is at 3 units (threshold 10).",
          metadata: {
            ...testTag,
            action_url: "/inventory",
            link_label: "View inventory",
          },
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      return { id: data.id };
    }
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message:
      'POST JSON { "type": "<kind>", "deliver": "email" | "in_app" | "both" }. Run one request per kind.',
    deliver: {
      email: "Resend only to your login email (default).",
      in_app: "Insert one sample alert (bell). Requires org.",
      both: "Resend + sample alert.",
    },
    note:
      "Bell list respects Settings → Notifications. Enable In-app and the matching alert type to see test rows.",
    types: [
      { type: "sync_error", email: true, in_app: true },
      { type: "revenue_drop", email: true, in_app: true },
      { type: "order_spike", email: true, in_app: true },
      { type: "low_stock", email: true, in_app: true },
      { type: "weekly_digest", email: true, in_app: false },
    ],
    example: { type: "revenue_drop", deliver: "email" },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; deliver?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawType = body.type;
  const deliver = parseDeliver(body.deliver);

  if (!rawType || !isEmailTestType(rawType)) {
    return NextResponse.json(
      {
        error: "Invalid or missing type",
        allowed: [...EMAIL_TYPES],
      },
      { status: 400 }
    );
  }

  const type = rawType;

  if (type === "weekly_digest" && deliver === "in_app") {
    return NextResponse.json(
      { error: "weekly_digest is email-only — use \"deliver\": \"email\" (or omit deliver)" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();

  if ((deliver === "in_app" || deliver === "both") && type !== "weekly_digest" && !profile?.org_id) {
    return NextResponse.json(
      { error: "No organization on your profile — cannot create in-app test alerts" },
      { status: 400 }
    );
  }

  const emailPayload = buildTestEmail(type);

  let emailPart:
    | { skipped: true; reason?: string }
    | { sent: true; emailId: string; sentTo: string }
    | { sent: false; error: string } = { skipped: true };

  if (deliver === "email" || deliver === "both") {
    const sent = await sendEmail({ to: user.email, subject: emailPayload.subject, html: emailPayload.html });
    if (sent) {
      emailPart = { sent: true, emailId: sent.id, sentTo: user.email };
    } else {
      emailPart = {
        sent: false,
        error: "Resend did not accept the send (check RESEND_API_KEY and Resend dashboard).",
      };
    }
  }

  let inAppPart:
    | { skipped: true; reason?: string }
    | { created: true; alertId: string }
    | { created: false; error: string } = { skipped: true };

  if (deliver === "in_app" || deliver === "both") {
    if (type === "weekly_digest") {
      inAppPart = { skipped: true, reason: "weekly_digest is email-only" };
    } else if (profile?.org_id) {
      const inserted = await insertTestInAppAlert(supabase, profile.org_id, type);
      if ("error" in inserted) {
        inAppPart = { created: false, error: inserted.error };
      } else {
        inAppPart = { created: true, alertId: inserted.id };
      }
    }
  }

  const emailOk = "sent" in emailPart && emailPart.sent === true;
  const inAppOk = "created" in inAppPart && inAppPart.created === true;

  if (deliver === "email" && !emailOk) {
    return NextResponse.json(
      { success: false, type, deliver, email: emailPart, in_app: inAppPart },
      { status: 500 }
    );
  }

  if (deliver === "in_app" && !inAppOk) {
    return NextResponse.json(
      { success: false, type, deliver, email: emailPart, in_app: inAppPart },
      { status: 500 }
    );
  }

  if (deliver === "both") {
    if (type === "weekly_digest") {
      if (!emailOk) {
        return NextResponse.json(
          { success: false, type, deliver, email: emailPart, in_app: inAppPart },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        type,
        deliver,
        email: emailPart,
        in_app: inAppPart,
      });
    }
    if (!emailOk && !inAppOk) {
      return NextResponse.json(
        { success: false, type, deliver, email: emailPart, in_app: inAppPart },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      type,
      deliver,
      partial: !emailOk || !inAppOk,
      email: emailPart,
      in_app: inAppPart,
      hint:
        !emailOk || !inAppOk
          ? "One channel failed — check Resend (email) or DB constraint / RLS (in-app)."
          : undefined,
    });
  }

  return NextResponse.json({
    success: true,
    type,
    deliver,
    email: emailPart,
    in_app: inAppPart,
  });
}
