/**
 * Static OpenUI Lang + markdown matched to product examples (system-prompt shape).
 * Used only by the landing Remotion preview — not live chat.
 */
export const LANDING_DEMO_MARKDOWN = `Over the last 30 days, revenue was **$20.7K** (down 53%), orders were **253** (down 7.3%), AOV was **$81.77** (down 49.3%), and profit was **$11.97K** (up 41.1%).`;

function marLabels(): string[] {
  const out: string[] = [];
  for (let d = 6; d <= 30; d++) {
    out.push(`Mar ${d}`);
  }
  return out;
}

/** Shopify daily revenue — flat-ish then spike on last day (illustrative). */
function shopifySeries(): number[] {
  const base = [
    820, 840, 810, 860, 880, 835, 890, 905, 870, 920, 880, 900, 915, 890, 905, 930, 910, 895, 920, 940, 925, 910, 935, 950, 5280,
  ];
  return base;
}

const labels = marLabels();
const series = shopifySeries();
const labelsJson = JSON.stringify(labels);
const seriesJson = JSON.stringify(series);

export const LANDING_DEMO_OPENUI = `
root = Dashboard([kpis, chart1, followups])
kpis = KPIRow([k1, k2, k3, k4])
k1 = KPI("Revenue", "$20.7K", -53.0)
k2 = KPI("Orders", "253", -7.3)
k3 = KPI("AOV", "$81.77", -49.3)
k4 = KPI("Profit", "$11.97K", 41.1)
chart1 = ChartCard([h1, c1])
h1 = CardHeader("Daily Revenue by Channel", "Last 30 days")
c1 = AreaChart(${labelsJson}, [s1])
s1 = Series("Shopify", ${seriesJson})
followups = FollowUpBlock([f1, f2, f3])
f1 = FollowUp("What factors contributed to the profit increase despite lower revenue?")
f2 = FollowUp("Show me the top products by revenue for the last 30 days.")
f3 = FollowUp("Can you break down revenue and profit by channel for the last 30 days?")
`.trim();
