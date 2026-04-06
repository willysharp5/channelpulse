import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

const LAYOUT_WRAPPER = (title: string, body: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="padding:24px 28px 20px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:18px;font-weight:700;color:#18181b;">ChannelPulse</span>
      </div>
      <div style="padding:28px;">
        ${body}
      </div>
      <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #f0f0f0;">
        <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
          This is a test email from ChannelPulse Admin.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  low_stock: {
    count: "3",
    items: `<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;"><strong style="color:#18181b;font-size:13px;">Blue Widget — Large</strong><br><span style="font-size:11px;color:#a1a1aa;">SKU: BW-LG-001</span></td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="display:inline-block;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;background:#fffbeb;color:#d97706;">3 left</span></td></tr><tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;"><strong style="color:#18181b;font-size:13px;">Red T-Shirt</strong><br><span style="font-size:11px;color:#a1a1aa;">SKU: RT-MD-002</span></td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="display:inline-block;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;background:#fef2f2;color:#dc2626;">0 left</span></td></tr>`,
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? "https://channelpulse.vercel.app",
  },
  sync_error: {
    channel_name: "Amazon US Store",
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? "https://channelpulse.vercel.app",
  },
  weekly_digest: {
    revenue: "$24,831",
    change: "+12.4%",
    change_color: "#16a34a",
    orders: "342",
    orders_change: "+8.2%",
    orders_change_color: "#16a34a",
    units: "1,240",
    units_change: "+5.1%",
    units_change_color: "#16a34a",
    net_profit: "$8,420",
    profit_change: "+3.2%",
    profit_change_color: "#16a34a",
    period: "Mar 24 – Mar 31, 2026",
    highlights: `<div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:16px;"><p style="margin:0;font-size:13px;color:#166534;">🏆 <strong>Shopify</strong> was your top channel at <strong>$15,200</strong></p></div>`,
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? "https://channelpulse.vercel.app",
  },
};

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const sb = createAdminClient();
    const { templateId, recipientEmail } = await request.json();

    if (!templateId || !recipientEmail) {
      return NextResponse.json({ error: "templateId and recipientEmail required" }, { status: 400 });
    }

    const { data: template } = await sb
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const vars = SAMPLE_VARS[template.slug] ?? {};
    const subject = replaceVars(template.subject, vars);
    const bodyHtml = replaceVars(template.body_html, vars);
    const html = LAYOUT_WRAPPER(subject, bodyHtml);

    const result = await sendEmail({ to: recipientEmail, subject: `[TEST] ${subject}`, html });

    if (!result) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    const { data: { user: adminUser } } = await sb.auth.admin.getUserById(admin.id);

    return NextResponse.json({
      success: true,
      emailId: result.id,
      sentTo: recipientEmail,
      template: template.slug,
      adminEmail: adminUser?.email,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
