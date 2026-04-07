import {
  lowStockAlertEmail,
  orderSpikeEmail,
  revenueDropEmail,
  syncErrorEmail,
  weeklyDigestEmail,
} from "@/lib/email/templates";
import type { TransactionalEmailTestType } from "@/lib/email/transactional-email-meta";

const ACCOUNT_EMAIL_STYLE = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;';
const AMBER_BUTTON = 'display: inline-block; background-color: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;';

/** Fixed sample data — same HTML as production alert emails from `templates.ts`. */
export function buildTransactionalTestEmail(type: TransactionalEmailTestType): {
  subject: string;
  html: string;
} {
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
        totalUnits: 1240,
        unitsChange: 5.1,
        netProfit: 8420,
        profitChange: 3.2,
        topChannel: "Shopify",
        topChannelRevenue: 15200,
        lowStockCount: 3,
        periodLabel: "Mar 24 – Mar 31, 2026",
        revenueFromYmd: "2026-03-24",
        revenueToYmd: "2026-03-31",
      });
    case "revenue_drop":
      return revenueDropEmail({
        yesterdayLabel: "Yesterday (sample)",
        yesterdayRevenue: 420,
        priorRevenue: 1200,
        dropPct: 65,
        orderRangeFromYmd: "2026-04-03",
        orderRangeToYmd: "2026-04-04",
      });
    case "order_spike":
      return orderSpikeEmail({
        dayLabel: "yesterday (sample)",
        orders: 48,
        baseline: 12,
        spikeDayYmd: "2026-04-04",
      });
    case "email_verification":
      return {
        subject: "Confirm your ChannelPulse account",
        html: `<div style="${ACCOUNT_EMAIL_STYLE}"><h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Confirm your email</h2><p style="color: #4b5563; font-size: 15px; line-height: 1.6;">Thanks for signing up for ChannelPulse! Click the button below to confirm your email address and activate your account.</p><div style="text-align: center; margin: 32px 0;"><a href="#" style="${AMBER_BUTTON}">Confirm my account</a></div><p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">This link expires in 24 hours. If you didn't create a ChannelPulse account, you can safely ignore this email.</p></div>`,
      };
    case "deletion_scheduled":
      return {
        subject: "Your ChannelPulse account is scheduled for deletion",
        html: `<div style="${ACCOUNT_EMAIL_STYLE}"><h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Account deletion scheduled</h2><p style="color: #4b5563; font-size: 15px; line-height: 1.6;">We received your request to delete your ChannelPulse account. Your account has been deactivated and is scheduled for <strong>permanent deletion on Sunday, April 12, 2026</strong>.</p><p style="color: #4b5563; font-size: 15px; line-height: 1.6;">If you change your mind, you can recover your account within the next 5 days:</p><div style="text-align: center; margin: 32px 0;"><a href="#" style="${AMBER_BUTTON}">Keep my account</a></div><p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">If you didn't request this, please contact us at support@channelpulse.us.</p></div>`,
      };
    case "deletion_cancelled":
      return {
        subject: "Your ChannelPulse account has been recovered",
        html: `<div style="${ACCOUNT_EMAIL_STYLE}"><h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Account recovered</h2><p style="color: #4b5563; font-size: 15px; line-height: 1.6;">Your ChannelPulse account deletion has been cancelled. Your account is fully active again — you can sign in at any time.</p><div style="text-align: center; margin: 32px 0;"><a href="#" style="${AMBER_BUTTON}">Sign in</a></div><p style="color: #9ca3af; font-size: 13px;">All your data remains intact. Welcome back!</p></div>`,
      };
    case "deletion_completed":
      return {
        subject: "Your ChannelPulse account has been permanently deleted",
        html: `<div style="${ACCOUNT_EMAIL_STYLE}"><h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Account deleted</h2><p style="color: #4b5563; font-size: 15px; line-height: 1.6;">Your ChannelPulse account and all associated data have been permanently deleted. This action cannot be undone.</p><p style="color: #4b5563; font-size: 15px; line-height: 1.6;">If you'd like to use ChannelPulse again in the future, you're welcome to create a new account at any time.</p><p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">Questions? Contact support@channelpulse.us.</p></div>`,
      };
  }
}
