import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportType } from "./templates";
import { validateMappedRow } from "./validators";
import {
  parseOrderDbRow,
  parseProductDbRow,
  parseInventoryDbRow,
  stableImportProductPlatformId,
} from "./db-map";

const ORDERS_BATCH = 80;

function dedupeOrdersByUpsertKey<
  T extends { org_id: string; platform: string; platform_order_id: string },
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    map.set(`${r.org_id}\0${r.platform}\0${r.platform_order_id}`, r);
  }
  return [...map.values()];
}

export type ImportJobRow = {
  id: string;
  org_id: string;
  channel_id: string;
  import_type: ImportType;
  rows: Record<string, string>[] | unknown;
};

export type ExecuteImportResult = {
  imported: number;
  skipped: number;
  /** Rows that were new (no matching unique key before this run). */
  insertedNew: number;
  /** Rows that matched an existing unique key (upsert/update in place). */
  updatedExisting: number;
  error?: string;
};

function asRows(raw: unknown): Record<string, string>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is Record<string, string> => r !== null && typeof r === "object");
}

export async function executeImportJob(
  sb: SupabaseClient,
  job: ImportJobRow,
  platform: string
): Promise<ExecuteImportResult> {
  const rows = asRows(job.rows);
  const orgId = job.org_id;
  const channelId = job.channel_id;
  const type = job.import_type;

  switch (type) {
    case "orders":
      return executeOrdersImport(sb, orgId, channelId, platform, rows);
    case "products":
      return executeProductsImport(sb, orgId, channelId, platform, rows);
    case "inventory":
      return executeInventoryImport(sb, orgId, channelId, platform, rows);
    default:
      return {
        imported: 0,
        skipped: 0,
        insertedNew: 0,
        updatedExisting: 0,
        error: `Unknown import type: ${type}`,
      };
  }
}

async function executeOrdersImport(
  sb: SupabaseClient,
  orgId: string,
  channelId: string,
  platform: string,
  rows: Record<string, string>[]
): Promise<ExecuteImportResult> {
  const prepared: ReturnType<typeof parseOrderDbRow>[] = [];
  let skipped = 0;

  for (const row of rows) {
    const v = validateMappedRow("orders", row);
    if (!v.valid) {
      skipped++;
      continue;
    }
    prepared.push(parseOrderDbRow(row, orgId, channelId, platform));
  }

  if (prepared.length === 0) {
    return { imported: 0, skipped, insertedNew: 0, updatedExisting: 0, error: "No valid rows to import" };
  }

  const deduped = dedupeOrdersByUpsertKey(prepared);

  let imported = 0;
  let insertedNew = 0;
  let updatedExisting = 0;
  for (let i = 0; i < deduped.length; i += ORDERS_BATCH) {
    const chunk = deduped.slice(i, i + ORDERS_BATCH);
    const ids = [...new Set(chunk.map((r) => r.platform_order_id).filter(Boolean))];
    if (ids.length > 0) {
      const { data: existingRows } = await sb
        .from("orders")
        .select("platform_order_id")
        .eq("org_id", orgId)
        .eq("platform", platform)
        .in("platform_order_id", ids);
      const existingSet = new Set((existingRows ?? []).map((r) => r.platform_order_id));
      for (const row of chunk) {
        if (existingSet.has(row.platform_order_id)) updatedExisting++;
        else insertedNew++;
      }
    } else {
      insertedNew += chunk.length;
    }
    const { error } = await sb.from("orders").upsert(chunk, {
      onConflict: "org_id,platform,platform_order_id",
    });
    if (error) {
      return { imported, skipped, insertedNew, updatedExisting, error: error.message };
    }
    imported += chunk.length;
  }

  return { imported, skipped, insertedNew, updatedExisting };
}

async function executeProductsImport(
  sb: SupabaseClient,
  orgId: string,
  channelId: string,
  platform: string,
  rows: Record<string, string>[]
): Promise<ExecuteImportResult> {
  let imported = 0;
  let skipped = 0;
  let insertedNew = 0;
  let updatedExisting = 0;

  for (const row of rows) {
    const v = validateMappedRow("products", row);
    if (!v.valid) {
      skipped++;
      continue;
    }

    const parsed = parseProductDbRow(row, orgId, channelId, platform);
    if (!parsed.sku) {
      skipped++;
      continue;
    }

    const { data: existing } = await sb
      .from("products")
      .select("id")
      .eq("org_id", orgId)
      .eq("channel_id", channelId)
      .eq("sku", parsed.sku)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await sb
        .from("products")
        .update({
          title: parsed.title,
          category: parsed.category,
          cogs: parsed.cogs,
          status: parsed.status,
          image_url: parsed.image_url,
          inventory_updated_at: parsed.inventory_updated_at,
          import_source_kind: "product_csv",
        })
        .eq("id", existing.id);
      if (error) {
        return { imported, skipped, insertedNew, updatedExisting, error: error.message };
      }
      imported++;
      updatedExisting++;
    } else {
      const { error } = await sb.from("products").insert({
        ...parsed,
        platform_product_id: stableImportProductPlatformId(parsed.sku, channelId),
        import_source_kind: "product_csv",
      });
      if (error) {
        return { imported, skipped, insertedNew, updatedExisting, error: error.message };
      }
      imported++;
      insertedNew++;
    }
  }

  return { imported, skipped, insertedNew, updatedExisting };
}

async function executeInventoryImport(
  sb: SupabaseClient,
  orgId: string,
  channelId: string,
  platform: string,
  rows: Record<string, string>[]
): Promise<ExecuteImportResult> {
  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  let insertedNew = 0;
  let updatedExisting = 0;

  for (const row of rows) {
    const v = validateMappedRow("inventory", row);
    if (!v.valid) {
      skipped++;
      continue;
    }

    const inv = parseInventoryDbRow(row);
    if (!inv.sku) {
      skipped++;
      continue;
    }

    const { data: existing } = await sb
      .from("products")
      .select("id")
      .eq("org_id", orgId)
      .eq("channel_id", channelId)
      .eq("sku", inv.sku)
      .maybeSingle();

    const updatePayload: Record<string, unknown> = {
      inventory_quantity: inv.quantity,
      inventory_updated_at: now,
      import_source_kind: "inventory_csv",
    };
    if (inv.reorder_point !== null) {
      updatePayload.reorder_point = inv.reorder_point;
    }

    if (existing?.id) {
      const { error } = await sb.from("products").update(updatePayload).eq("id", existing.id);
      if (error) {
        return { imported, skipped, insertedNew, updatedExisting, error: error.message };
      }
      imported++;
      updatedExisting++;
    } else {
      const title = inv.title?.trim() || inv.sku;
      const insertPayload: Record<string, unknown> = {
        org_id: orgId,
        channel_id: channelId,
        platform,
        platform_product_id: stableImportProductPlatformId(inv.sku, channelId),
        title,
        sku: inv.sku,
        category: null,
        cogs: 0,
        status: "active",
        image_url: null,
        inventory_quantity: inv.quantity,
        inventory_updated_at: now,
        import_source_kind: "inventory_csv",
      };
      if (inv.reorder_point !== null) {
        insertPayload.reorder_point = inv.reorder_point;
      }
      const { error } = await sb.from("products").insert(insertPayload);
      if (error) {
        return { imported, skipped, insertedNew, updatedExisting, error: error.message };
      }
      imported++;
      insertedNew++;
    }
  }

  return { imported, skipped, insertedNew, updatedExisting };
}
