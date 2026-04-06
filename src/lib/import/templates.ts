/**
 * CSV import templates: canonical fields, types, synonyms for auto-mapping, example rows.
 */

export type ImportType = "orders" | "products" | "inventory";

export type FieldType = "string" | "number" | "integer" | "date" | "platform";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Extra header aliases (normalized matching is also applied in mapper) */
  synonyms?: string[];
}

export const ORDERS_FIELDS: TemplateField[] = [
  { key: "order_number", label: "Order number", type: "string", required: true, synonyms: ["order id", "orderid", "order no", "order#"] },
  { key: "platform", label: "Platform", type: "platform", required: false, synonyms: ["channel", "marketplace"] },
  { key: "status", label: "Status", type: "string", required: false, synonyms: ["order status", "fulfillment status"] },
  { key: "customer_name", label: "Customer name", type: "string", required: false, synonyms: ["customer", "buyer name", "name"] },
  { key: "customer_email", label: "Customer email", type: "string", required: false, synonyms: ["email", "buyer email"] },
  { key: "subtotal", label: "Subtotal", type: "number", required: false },
  { key: "total_tax", label: "Total tax", type: "number", required: false, synonyms: ["tax", "tax total"] },
  { key: "total_shipping", label: "Total shipping", type: "number", required: false, synonyms: ["shipping", "shipping cost"] },
  { key: "total_discounts", label: "Total discounts", type: "number", required: false, synonyms: ["discount", "discounts"] },
  { key: "total_amount", label: "Total amount", type: "number", required: true, synonyms: ["total", "amount", "order total", "revenue"] },
  { key: "currency", label: "Currency", type: "string", required: false },
  { key: "platform_fees", label: "Platform fees", type: "number", required: false, synonyms: ["fees", "marketplace fees"] },
  { key: "item_count", label: "Item count", type: "integer", required: false, synonyms: ["items", "line items", "quantity items"] },
  { key: "ordered_at", label: "Ordered at", type: "date", required: true, synonyms: ["order date", "date", "created at", "purchase date"] },
];

export const PRODUCTS_FIELDS: TemplateField[] = [
  { key: "title", label: "Title", type: "string", required: true, synonyms: ["product title", "name", "product name"] },
  { key: "sku", label: "SKU", type: "string", required: true, synonyms: ["sku code", "item sku"] },
  { key: "category", label: "Category", type: "string", required: false },
  { key: "status", label: "Status", type: "string", required: false, synonyms: ["product status"] },
  { key: "cogs", label: "COGS", type: "number", required: false, synonyms: ["cost", "unit cost"] },
  { key: "image_url", label: "Image URL", type: "string", required: false, synonyms: ["image", "photo url", "thumbnail"] },
];

export const INVENTORY_FIELDS: TemplateField[] = [
  { key: "sku", label: "SKU", type: "string", required: true },
  { key: "title", label: "Title", type: "string", required: false, synonyms: ["product title", "name"] },
  { key: "platform", label: "Platform", type: "platform", required: false },
  { key: "quantity", label: "Quantity", type: "integer", required: true, synonyms: ["qty", "stock", "on hand", "inventory"] },
  { key: "reorder_point", label: "Reorder point", type: "integer", required: false, synonyms: ["reorder", "min stock", "minimum"] },
];

export function fieldsForType(type: ImportType): TemplateField[] {
  switch (type) {
    case "orders":
      return ORDERS_FIELDS;
    case "products":
      return PRODUCTS_FIELDS;
    case "inventory":
      return INVENTORY_FIELDS;
    default:
      return [];
  }
}

/** Example rows for template download (2 rows each). */
export function exampleRowsForType(type: ImportType): Record<string, string>[] {
  switch (type) {
    case "orders":
      return [
        {
          order_number: "1001",
          platform: "shopify",
          status: "paid",
          customer_name: "Alex Rivera",
          customer_email: "alex@example.com",
          subtotal: "89.00",
          total_tax: "7.12",
          total_shipping: "5.99",
          total_discounts: "0",
          total_amount: "102.11",
          currency: "USD",
          platform_fees: "3.25",
          item_count: "2",
          ordered_at: "2025-03-15T14:30:00Z",
        },
        {
          order_number: "1002",
          platform: "amazon",
          status: "shipped",
          customer_name: "Jordan Lee",
          customer_email: "jordan@example.com",
          subtotal: "45.50",
          total_tax: "3.64",
          total_shipping: "0",
          total_discounts: "5.00",
          total_amount: "44.14",
          currency: "USD",
          platform_fees: "6.62",
          item_count: "1",
          ordered_at: "2025-03-16T09:00:00Z",
        },
      ];
    case "products":
      return [
        {
          title: "Organic Cotton Tee",
          sku: "TEE-ORG-S",
          category: "Apparel",
          status: "active",
          cogs: "12.50",
          image_url: "https://example.com/images/tee.jpg",
        },
        {
          title: "Ceramic Mug 12oz",
          sku: "MUG-12-WHT",
          category: "Home",
          status: "active",
          cogs: "4.00",
          image_url: "",
        },
      ];
    case "inventory":
      return [
        { sku: "TEE-ORG-S", title: "Organic Cotton Tee", platform: "shopify", quantity: "120", reorder_point: "20" },
        { sku: "MUG-12-WHT", title: "Ceramic Mug 12oz", platform: "shopify", quantity: "45", reorder_point: "10" },
      ];
    default:
      return [];
  }
}

export function templateFilename(type: ImportType): string {
  return `channelpulse-import-${type}-template.csv`;
}

/** Build CSV string with header + example rows */
export function buildTemplateCsv(type: ImportType): string {
  const fields = fieldsForType(type);
  const headers = fields.map((f) => f.key);
  const examples = exampleRowsForType(type);
  const lines = [headers.join(",")];
  for (const row of examples) {
    const cells = headers.map((h) => {
      const v = row[h] ?? "";
      const s = String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    });
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}
