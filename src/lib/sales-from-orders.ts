/** Aggregate product sales from orders.raw_data (Shopify line items) with fallbacks. */

export interface TopProductSale {
  rank: number;
  title: string;
  sku: string | null;
  platform: string;
  unitsSold: number;
  revenue: number;
}

export interface OrderRow {
  id: string;
  platform: string;
  raw_data: unknown;
  total_amount: number | null;
  item_count: number | null;
}

/** Synthetic line items from demo seed (`raw_data.demo_lines`). */
function parseDemoLineItems(raw: unknown): Array<{ title: string; sku: string | null; quantity: number; revenue: number }> {
  if (!raw || typeof raw !== "object") return [];
  const lines = (raw as { demo_lines?: unknown }).demo_lines;
  if (!Array.isArray(lines)) return [];
  const out: Array<{ title: string; sku: string | null; quantity: number; revenue: number }> = [];
  for (const x of lines) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Item";
    const sku = typeof o.sku === "string" ? o.sku : null;
    const quantity = typeof o.quantity === "number" ? o.quantity : 0;
    const revenue = typeof o.revenue === "number" ? o.revenue : 0;
    if (quantity > 0 && revenue >= 0) {
      out.push({ title, sku, quantity, revenue });
    }
  }
  return out;
}

function parseShopifyLineItems(raw: unknown): Array<{ title: string; sku: string | null; quantity: number; revenue: number }> {
  if (!raw || typeof raw !== "object") return [];
  const lineItems = (raw as { lineItems?: { edges?: Array<{ node: Record<string, unknown> }> } }).lineItems;
  const edges = lineItems?.edges ?? [];
  const out: Array<{ title: string; sku: string | null; quantity: number; revenue: number }> = [];
  for (const e of edges) {
    const n = e.node;
    const title = typeof n.title === "string" ? n.title : "Item";
    const sku = typeof n.sku === "string" ? n.sku : null;
    const quantity = typeof n.quantity === "number" ? n.quantity : 0;
    const money = (n.originalTotalSet as { shopMoney?: { amount?: string } } | undefined)?.shopMoney?.amount;
    const revenue = money != null ? parseFloat(String(money)) : 0;
    if (quantity > 0 || revenue > 0) {
      out.push({ title, sku, quantity, revenue });
    }
  }
  return out;
}

function linesFromOrder(order: OrderRow): Array<{ title: string; sku: string | null; quantity: number; revenue: number; platform: string }> {
  const platform = order.platform || "other";
  if (platform === "shopify") {
    const parsed = parseShopifyLineItems(order.raw_data);
    if (parsed.length > 0) {
      return parsed.map((p) => ({ ...p, platform }));
    }
  }
  const demoParsed = parseDemoLineItems(order.raw_data);
  if (demoParsed.length > 0) {
    return demoParsed.map((p) => ({ ...p, platform }));
  }
  const units = Number(order.item_count ?? 0);
  const total = Number(order.total_amount ?? 0);
  if (units > 0 && total > 0) {
    return [
      {
        title: "Unitemized order lines",
        sku: null,
        quantity: units,
        revenue: total,
        platform,
      },
    ];
  }
  return [];
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Key for matching a catalog product to rollup (prefer SKU). */
export function productSalesLookupKey(product: { sku: string | null; title: string }) {
  return norm(product.sku) ? `sku:${norm(product.sku)}` : `title:${norm(product.title)}`;
}

export function aggregateOrdersToRollup(orders: OrderRow[]) {
  const map = new Map<string, { title: string; sku: string | null; platform: string; unitsSold: number; revenue: number }>();
  for (const order of orders) {
    for (const line of linesFromOrder(order)) {
      const skuPart = norm(line.sku);
      const key = skuPart ? `sku:${skuPart}` : `title:${norm(line.title)}|${line.platform}`;
      const existing = map.get(key) ?? {
        title: line.title,
        sku: line.sku,
        platform: line.platform,
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += line.quantity;
      existing.revenue += line.revenue;
      if (!existing.sku && line.sku) existing.sku = line.sku;
      map.set(key, existing);
    }
  }
  return map;
}

export function topProductsFromOrders(orders: OrderRow[], limit = 10): TopProductSale[] {
  const map = aggregateOrdersToRollup(orders);
  const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  return sorted.slice(0, limit).map((row, i) => ({
    rank: i + 1,
    title: row.title,
    sku: row.sku,
    platform: row.platform,
    unitsSold: row.unitsSold,
    revenue: Math.round(row.revenue * 100) / 100,
  }));
}

export function rollupForProducts(orders: OrderRow[]) {
  const map = aggregateOrdersToRollup(orders);
  const bySku = new Map<string, { unitsSold: number; revenue: number; platform: string }>();
  const byTitle = new Map<string, { unitsSold: number; revenue: number; platform: string }>();
  for (const [, row] of map) {
    if (norm(row.sku)) {
      const k = `sku:${norm(row.sku)}`;
      const ex = bySku.get(k) ?? { unitsSold: 0, revenue: 0, platform: row.platform };
      ex.unitsSold += row.unitsSold;
      ex.revenue += row.revenue;
      ex.platform = row.platform;
      bySku.set(k, ex);
    }
    const tk = `title:${norm(row.title)}`;
    const tex = byTitle.get(tk) ?? { unitsSold: 0, revenue: 0, platform: row.platform };
    tex.unitsSold += row.unitsSold;
    tex.revenue += row.revenue;
    tex.platform = row.platform;
    byTitle.set(tk, tex);
  }
  return { bySku, byTitle };
}

export function lookupProductSales(
  product: { sku: string | null; title: string },
  rollup: ReturnType<typeof rollupForProducts>
) {
  if (norm(product.sku)) {
    const s = rollup.bySku.get(`sku:${norm(product.sku)}`);
    if (s) return { ...s, revenue: Math.round(s.revenue * 100) / 100 };
  }
  const t = rollup.byTitle.get(`title:${norm(product.title)}`);
  if (t) return { ...t, revenue: Math.round(t.revenue * 100) / 100 };
  return { unitsSold: 0, revenue: 0, platform: "" };
}
