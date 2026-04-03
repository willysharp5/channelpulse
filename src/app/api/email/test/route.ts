import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { lowStockAlertEmail, syncErrorEmail, weeklyDigestEmail } from "@/lib/email/templates";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await request.json();

  let subject: string;
  let html: string;

  switch (type) {
    case "low_stock": {
      const result = lowStockAlertEmail([
        { title: "Blue Widget — Large", sku: "BW-LG-001", quantity: 3, threshold: 10 },
        { title: "Red T-Shirt", sku: "RT-MD-002", quantity: 0, threshold: 10 },
        { title: "Wireless Earbuds", sku: null, quantity: 5, threshold: 10 },
      ]);
      subject = result.subject;
      html = result.html;
      break;
    }
    case "sync_error": {
      const result = syncErrorEmail(
        "Amazon US Store",
        "SP-API getOrders failed: 403 Access to Orders API denied. Check your developer profile roles."
      );
      subject = result.subject;
      html = result.html;
      break;
    }
    case "weekly_digest": {
      const result = weeklyDigestEmail({
        totalRevenue: 24831,
        revenueChange: 12.4,
        totalOrders: 342,
        ordersChange: 8.2,
        topChannel: "Shopify",
        topChannelRevenue: 15200,
        lowStockCount: 3,
        periodLabel: "Mar 24 – Mar 31, 2026",
      });
      subject = result.subject;
      html = result.html;
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid type. Use: low_stock, sync_error, weekly_digest" }, { status: 400 });
  }

  const result = await sendEmail({ to: user.email, subject, html });

  if (!result) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ success: true, emailId: result.id, sentTo: user.email });
}
