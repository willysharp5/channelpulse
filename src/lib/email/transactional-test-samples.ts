import {
  lowStockAlertEmail,
  orderSpikeEmail,
  revenueDropEmail,
  syncErrorEmail,
  weeklyDigestEmail,
} from "@/lib/email/templates";
import type { TransactionalEmailTestType } from "@/lib/email/transactional-email-meta";

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
  }
}
