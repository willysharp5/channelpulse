/** IDs for notification emails built in `lib/email/templates.ts` (not DB `email_templates`). */

export const TRANSACTIONAL_EMAIL_TEST_TYPES = [
  "low_stock",
  "sync_error",
  "weekly_digest",
  "revenue_drop",
  "order_spike",
] as const;

export type TransactionalEmailTestType = (typeof TRANSACTIONAL_EMAIL_TEST_TYPES)[number];

export function isTransactionalEmailTestType(t: string): t is TransactionalEmailTestType {
  return (TRANSACTIONAL_EMAIL_TEST_TYPES as readonly string[]).includes(t);
}

export const TRANSACTIONAL_EMAIL_LABELS: Record<
  TransactionalEmailTestType,
  { title: string; description: string; whatItIs: string }
> = {
  low_stock: {
    title: "Low stock",
    description: "Inventory at or below threshold (generateLowStockAlerts)",
    whatItIs:
      "At/below threshold (incl. OOS) after inventory sync or admin alert run. Item list + filtered inventory link. Same SKU: one email / 24h max.",
  },
  sync_error: {
    title: "Sync error",
    description: "Channel sync failure (sendSyncErrorAlert)",
    whatItIs: "Store data pull failed (API/auth). Names the channel; link to Settings.",
  },
  weekly_digest: {
    title: "Weekly digest",
    description: "Scheduled weekly summary email",
    whatItIs:
      "Weekly cron if enabled: ~7d revenue, orders, units, profit vs prior week, top channel, optional low-stock line. Links use the same window.",
  },
  revenue_drop: {
    title: "Revenue drop",
    description: "Yesterday vs prior day anomaly (generateAnomalyAlerts)",
    whatItIs:
      "Yesterday revenue drops hard vs prior day (min amounts apply). Once/org/day. Link: Orders for those two days.",
  },
  order_spike: {
    title: "Order spike",
    description: "Unusual order volume vs recent days (generateAnomalyAlerts)",
    whatItIs:
      "One day's orders spike vs recent baseline (needs history + volume). Once/org/day; org must enable order spikes. Link: Orders that day.",
  },
};
