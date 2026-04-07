const BRAND_COLOR = "#18181b";
const ACCENT_COLOR = "#7c3aed";

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us").replace(/\/$/, "");
}

/** Standard outer shell; use with custom inner HTML from admin overrides. */
export function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
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
        <span style="font-size:18px;font-weight:700;color:${BRAND_COLOR};">ChannelPulse</span>
      </div>
      <div style="padding:28px;">
        ${body}
      </div>
      <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #f0f0f0;">
        <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
          You're receiving this because you have email notifications enabled in ChannelPulse.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function layout(title: string, body: string): string {
  return emailLayout(title, body);
}

interface LowStockItem {
  title: string;
  sku: string | null;
  quantity: number;
  threshold: number;
}

export function lowStockAlertEmail(items: LowStockItem[]): { subject: string; html: string } {
  const outOfStock = items.filter((i) => i.quantity <= 0);
  const lowStock = items.filter((i) => i.quantity > 0);

  const subject = outOfStock.length > 0
    ? `${outOfStock.length} product${outOfStock.length > 1 ? "s" : ""} out of stock`
    : `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low on stock`;

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          <strong style="color:${BRAND_COLOR};font-size:13px;">${item.title}</strong>
          ${item.sku ? `<br><span style="font-size:11px;color:#a1a1aa;">SKU: ${item.sku}</span>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">
          <span style="display:inline-block;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;${
            item.quantity <= 0
              ? "background:#fef2f2;color:#dc2626;"
              : "background:#fffbeb;color:#d97706;"
          }">
            ${item.quantity} left
          </span>
        </td>
      </tr>`
    )
    .join("");

  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 8px;font-size:18px;color:${BRAND_COLOR};">Inventory Alert</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#71717a;">
      ${items.length} product${items.length > 1 ? "s" : ""} ${items.length > 1 ? "are" : "is"} at or below your stock threshold.
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;">
      <thead>
        <tr style="background:#fafafa;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Product</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Stock</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${appBaseUrl()}/inventory?stock=below_threshold"
         style="display:inline-block;padding:10px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
        View Inventory
      </a>
    </div>
    `
  );

  return { subject, html };
}

export function syncErrorEmail(channelName: string): { subject: string; html: string } {
  const subject = `Sync issue with ${channelName}`;

  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 8px;font-size:18px;color:${BRAND_COLOR};">Sync Issue</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#71717a;">
      We had trouble syncing your latest data from <strong>${channelName}</strong>.
    </p>
    <p style="margin:0 0 0;font-size:13px;color:#71717a;">
      Don't worry — we'll retry automatically. If this keeps happening, try reconnecting your account in Settings.
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us"}/settings"
         style="display:inline-block;padding:10px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
        Check Settings
      </a>
    </div>
    `
  );

  return { subject, html };
}

export function revenueDropEmail(params: {
  yesterdayLabel: string;
  yesterdayRevenue: number;
  priorRevenue: number;
  dropPct: number;
  orderRangeFromYmd: string;
  orderRangeToYmd: string;
}): { subject: string; html: string } {
  const subject = `Revenue down ${params.dropPct}% vs prior day`;
  const y = params.yesterdayRevenue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const p = params.priorRevenue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const ordersHref = `${appBaseUrl()}/orders?from=${encodeURIComponent(params.orderRangeFromYmd)}&to=${encodeURIComponent(params.orderRangeToYmd)}`;

  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 8px;font-size:18px;color:${BRAND_COLOR};">Revenue alert</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#71717a;">
      ${params.yesterdayLabel} revenue was <strong>${y}</strong>, compared to <strong>${p}</strong> the day before
      (about <strong style="color:#dc2626;">${params.dropPct}%</strong> lower).
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${ordersHref}"
         style="display:inline-block;padding:10px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
        View recent orders
      </a>
    </div>
    `
  );

  return { subject, html };
}

export function orderSpikeEmail(params: {
  dayLabel: string;
  orders: number;
  baseline: number;
  spikeDayYmd: string;
}): { subject: string; html: string } {
  const subject = `Unusual order volume: ${params.orders} orders today`;
  const ordersHref = `${appBaseUrl()}/orders?from=${encodeURIComponent(params.spikeDayYmd)}&to=${encodeURIComponent(params.spikeDayYmd)}`;
  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 8px;font-size:18px;color:${BRAND_COLOR};">Order spike</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#71717a;">
      On <strong>${params.dayLabel}</strong> you had <strong>${params.orders}</strong> orders — well above your recent typical day
      (around <strong>${params.baseline}</strong>).
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${ordersHref}"
         style="display:inline-block;padding:10px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
        View orders
      </a>
    </div>
    `
  );

  return { subject, html };
}

interface WeeklyDigestData {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  totalUnits: number;
  unitsChange: number;
  netProfit: number;
  profitChange: number;
  topChannel: string;
  topChannelRevenue: number;
  lowStockCount: number;
  periodLabel: string;
  revenueFromYmd: string;
  revenueToYmd: string;
}

export function weeklyDigestEmail(data: WeeklyDigestData): { subject: string; html: string } {
  const revenueFormatted = `$${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const profitFormatted = `$${data.netProfit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const changeColor = data.revenueChange >= 0 ? "#16a34a" : "#dc2626";
  const changeText = `${data.revenueChange >= 0 ? "+" : ""}${data.revenueChange.toFixed(1)}%`;
  const unitsChangeColor = data.unitsChange >= 0 ? "#16a34a" : "#dc2626";
  const unitsChangeText = `${data.unitsChange >= 0 ? "+" : ""}${data.unitsChange.toFixed(1)}%`;
  const profitChangeColor = data.profitChange >= 0 ? "#16a34a" : "#dc2626";
  const profitChangeText = `${data.profitChange >= 0 ? "+" : ""}${data.profitChange.toFixed(1)}%`;

  const subject = `Your ChannelPulse weekly summary: ${revenueFormatted} revenue (${changeText})`;
  const revenueHref = `${appBaseUrl()}/revenue?from=${encodeURIComponent(data.revenueFromYmd)}&to=${encodeURIComponent(data.revenueToYmd)}`;
  const lowStockHref = `${appBaseUrl()}/inventory?stock=below_threshold`;

  const html = layout(
    subject,
    `
    <h2 style="margin:0 0 4px;font-size:18px;color:${BRAND_COLOR};">Weekly Digest</h2>
    <p style="margin:0 0 24px;font-size:13px;color:#a1a1aa;">${data.periodLabel}</p>

    <div style="display:flex;gap:12px;margin-bottom:12px;">
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Revenue</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:${BRAND_COLOR};">${revenueFormatted}</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:${changeColor};">${changeText} vs last week</p>
      </div>
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Orders</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:${BRAND_COLOR};">${data.totalOrders.toLocaleString("en-US")}</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:${data.ordersChange >= 0 ? "#16a34a" : "#dc2626"};">${data.ordersChange >= 0 ? "+" : ""}${data.ordersChange.toFixed(1)}% vs last week</p>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Units sold</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:${BRAND_COLOR};">${data.totalUnits.toLocaleString("en-US")}</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:${unitsChangeColor};">${unitsChangeText} vs last week</p>
      </div>
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Net profit</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:${BRAND_COLOR};">${profitFormatted}</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:${profitChangeColor};">${profitChangeText} vs last week</p>
      </div>
    </div>

    ${data.topChannel ? `
    <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        <span style="display:inline-block;width:18px;height:18px;background:#16a34a;color:#fff;border-radius:50%;text-align:center;line-height:18px;font-size:11px;font-weight:700;margin-right:6px;vertical-align:middle;">&#x2605;</span><strong>${data.topChannel}</strong> was your top channel at <strong>$${data.topChannelRevenue.toLocaleString()}</strong>
      </p>
    </div>` : ""}

    ${data.lowStockCount > 0 ? `
    <div style="padding:12px 16px;background:#fffbeb;border:1px solid #fed7aa;border-radius:8px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <span style="display:inline-block;width:18px;height:18px;background:#d97706;color:#fff;border-radius:50%;text-align:center;line-height:18px;font-size:13px;font-weight:700;margin-right:6px;vertical-align:middle;">!</span><strong>${data.lowStockCount}</strong> product${data.lowStockCount > 1 ? "s" : ""} running low on stock
      </p>
      <p style="margin:8px 0 0;font-size:12px;">
        <a href="${lowStockHref}" style="color:#b45309;font-weight:600;">View low-stock inventory</a>
      </p>
    </div>` : ""}

    <div style="margin-top:24px;text-align:center;">
      <a href="${revenueHref}"
         style="display:inline-block;padding:10px 24px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">
        View this week's revenue
      </a>
    </div>
    `
  );

  return { subject, html };
}
