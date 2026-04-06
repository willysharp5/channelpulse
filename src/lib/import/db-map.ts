import { createHash } from "crypto";
import type { ImportType } from "./templates";

export function stableImportOrderId(orgId: string, channelId: string, orderNumber: string): string {
  const h = createHash("sha256")
    .update(`${orgId}|${channelId}|${orderNumber.trim()}`)
    .digest("hex")
    .slice(0, 40);
  return `csv-${h}`;
}

export function stableImportProductPlatformId(sku: string, channelId: string): string {
  const h = createHash("sha256")
    .update(`${channelId}|${sku.trim()}`)
    .digest("hex")
    .slice(0, 32);
  return `csv-${h}`;
}

function normalizeOrderStatus(s: string | undefined): string {
  const raw = (s ?? "paid").toLowerCase().trim().replace(/\s+/g, "_");
  const allowed = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];
  if (allowed.includes(raw)) return raw;
  if (raw.includes("ship")) return "shipped";
  if (raw.includes("deliver")) return "delivered";
  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("refund")) return "refunded";
  if (raw.includes("pending")) return "pending";
  return "paid";
}

function financialFromStatus(status: string): string {
  if (status === "refunded") return "refunded";
  if (status === "cancelled") return "pending";
  return "paid";
}

function num(s: string | undefined, fallback = 0): number {
  if (s === undefined || s === "") return fallback;
  const n = Number(String(s).replace(/[$€£,]/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function int(s: string | undefined, fallback = 0): number {
  return Math.round(num(s, fallback));
}

export function parseOrderDbRow(
  row: Record<string, string>,
  orgId: string,
  channelId: string,
  platform: string
) {
  const order_number = String(row.order_number ?? "").trim();
  const status = normalizeOrderStatus(row.status);
  const financial_status = financialFromStatus(status);
  const total_amount = num(row.total_amount);
  const platform_fees = num(row.platform_fees, 0);
  const cogs = 0;
  const net_profit = Math.round((total_amount - platform_fees - cogs) * 100) / 100;
  const orderedRaw = String(row.ordered_at ?? "").trim();
  const ordered_at = orderedRaw ? new Date(orderedRaw).toISOString() : new Date().toISOString();

  return {
    org_id: orgId,
    channel_id: channelId,
    platform,
    platform_order_id: stableImportOrderId(orgId, channelId, order_number),
    order_number,
    status,
    financial_status,
    customer_name: row.customer_name?.trim() || null,
    customer_email: row.customer_email?.trim() || null,
    subtotal: num(row.subtotal, total_amount),
    total_tax: num(row.total_tax, 0),
    total_shipping: num(row.total_shipping, 0),
    total_discounts: num(row.total_discounts, 0),
    total_amount,
    currency: (row.currency?.trim() || "USD").slice(0, 8),
    platform_fees,
    cogs,
    net_profit,
    item_count: Math.max(1, int(row.item_count, 1)),
    ordered_at,
    raw_data: { source: "csv_import", type: "orders" as ImportType, row },
  };
}

function normalizeProductStatus(s: string | undefined): "active" | "archived" | "draft" {
  const x = (s ?? "active").toLowerCase().trim();
  if (x === "archived" || x === "inactive") return "archived";
  if (x === "draft") return "draft";
  return "active";
}

export function parseProductDbRow(
  row: Record<string, string>,
  orgId: string,
  channelId: string,
  platform: string
) {
  const sku = String(row.sku ?? "").trim();
  const title = String(row.title ?? "").trim();
  return {
    org_id: orgId,
    channel_id: channelId,
    platform,
    platform_product_id: stableImportProductPlatformId(sku, channelId),
    title,
    sku: sku || null,
    category: row.category?.trim() || null,
    cogs: num(row.cogs, 0),
    status: normalizeProductStatus(row.status),
    image_url: row.image_url?.trim() || null,
    inventory_quantity: 0,
    inventory_updated_at: new Date().toISOString(),
  };
}

export function parseInventoryDbRow(row: Record<string, string>) {
  const sku = String(row.sku ?? "").trim();
  const title = row.title?.trim() || null;
  const quantity = int(row.quantity, 0);
  const reorderRaw = row.reorder_point?.trim();
  const reorder_point =
    reorderRaw === undefined || reorderRaw === "" ? null : int(reorderRaw, 0);
  return { sku, title, quantity, reorder_point };
}
