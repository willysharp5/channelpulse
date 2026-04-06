import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveOrgScope, getDateRange, type DateParams } from "@/lib/queries";
import {
  buildReportingChannelsFilter,
  rpcChannelIdsParam,
  type ReportingChannelsFilter,
} from "@/lib/reporting-channel-filter";
import { escapeIlike } from "@/lib/inventory-list";
import { lookupProductSales, rollupForProducts, type OrderRow } from "@/lib/sales-from-orders";
import { rangeToDays, sortPlatformsForUi } from "@/lib/constants";

const MAX_SORT_SCAN = 8000;
const NO_MATCH_PRODUCT_ID = "00000000-0000-0000-0000-000000000001";

export interface ProductTableRow {
  id: string;
  title: string;
  sku: string | null;
  image_url: string | null;
  cogs: number | null;
  category: string | null;
  status: string | null;
  unitsSold: number;
  revenue: number;
  channelLabel: string;
  salesPlatform: string;
}

export type ProductsSourceFilter = "all" | "csv";

export interface ProductsListParams {
  rangeKey: string | null;
  search: string;
  status: string;
  channel: string;
  /** `csv` = rows last updated by a product CSV import (`import_source_kind` = `product_csv`) */
  source: ProductsSourceFilter;
  page: number;
  pageSize: number;
  sortKey: "none" | "units" | "revenue";
  sortDir: "asc" | "desc";
}

export interface ProductsPageResult {
  rows: ProductTableRow[];
  totalCount: number;
  /** Row count used for pagination (caps at MAX_SORT_SCAN when sorting a large catalog). */
  pageableTotalCount: number;
  effectivePage: number;
  platformOptions: string[];
  sortTruncated: boolean;
}

export interface ProductsCatalogSummary {
  total: number;
  active: number;
  draft: number;
  archived: number;
  totalCogs: number;
}

function firstParam(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

export function parseProductsListParams(sp: Record<string, string | string[] | undefined>): ProductsListParams {
  const rangeKey = firstParam(sp, "range") ?? null;
  const search = firstParam(sp, "search") ?? "";
  const status = firstParam(sp, "status") ?? "all";
  const channel = firstParam(sp, "channel") ?? "all";
  const sourceRaw = firstParam(sp, "source") ?? "all";
  const source: ProductsSourceFilter = sourceRaw === "csv" ? "csv" : "all";
  const page = Math.max(1, parseInt(firstParam(sp, "page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(firstParam(sp, "pageSize") ?? "10", 10);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
  const sk = firstParam(sp, "sort") ?? "none";
  const sortKey = sk === "units" || sk === "revenue" ? sk : "none";
  const sd = firstParam(sp, "dir") ?? "desc";
  const sortDir = sd === "asc" ? "asc" : "desc";
  return { rangeKey, search, status, channel, source, page, pageSize, sortKey, sortDir };
}

export function parseProductsParamsFromURLSearchParams(sp: URLSearchParams): ProductsListParams {
  const r: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!(k in r)) r[k] = v;
  });
  return parseProductsListParams(r);
}

async function resolveChannelIds(
  supabase: SupabaseClient,
  orgId: string,
  input: ProductsListParams
): Promise<{ forPlatform: string[]; forSearch: string[] }> {
  let forPlatform: string[] = [];
  if (input.channel !== "all") {
    const { data } = await supabase.from("channels").select("id").eq("org_id", orgId).eq("platform", input.channel);
    forPlatform = (data ?? []).map((r) => r.id as string).filter(Boolean);
  }
  let forSearch: string[] = [];
  const t = input.search.trim();
  if (t.length > 0) {
    const esc = escapeIlike(t);
    const { data } = await supabase.from("channels").select("id").eq("org_id", orgId).ilike("name", `%${esc}%`);
    forSearch = (data ?? []).map((r) => r.id as string).filter(Boolean);
  }
  return { forPlatform, forSearch };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProductFilters(
  q: any,
  orgId: string,
  input: ProductsListParams,
  forPlatform: string[],
  forSearch: string[],
  reportFilter: ReportingChannelsFilter
) {
  q = q.eq("org_id", orgId);
  const t = input.search.trim();
  if (t.length > 0) {
    const esc = escapeIlike(t);
    const p = `%${esc}%`;
    const parts = [`title.ilike.${p}`, `sku.ilike.${p}`, `category.ilike.${p}`];
    if (forSearch.length > 0) {
      parts.push(`channel_id.in.(${forSearch.join(",")})`);
    }
    q = q.or(parts.join(","));
  }
  if (input.status !== "all") {
    q = q.eq("status", input.status);
  }
  if (input.channel !== "all") {
    if (forPlatform.length > 0) {
      q = q.or(`channel_id.in.(${forPlatform.join(",")}),platform.eq.${input.channel}`);
    } else {
      q = q.eq("platform", input.channel);
    }
  }
  if (input.source === "csv") {
    q = q.eq("import_source_kind", "product_csv");
  }
  if (reportFilter.kind === "include_only") {
    if (reportFilter.channelIds.length === 0) {
      return q.eq("id", NO_MATCH_PRODUCT_ID);
    }
    q = q.in("channel_id", reportFilter.channelIds);
  }
  return q;
}

async function getProductsPlatformOptionsScoped(orgId: string, supabase: SupabaseClient): Promise<string[]> {
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let chQ = supabase.from("channels").select("platform").eq("org_id", orgId);
  let prQ = supabase.from("products").select("platform").eq("org_id", orgId).not("platform", "is", null);
  if (reportFilter.kind === "include_only") {
    chQ = chQ.in("id", reportFilter.channelIds);
    prQ = prQ.in("channel_id", reportFilter.channelIds);
  }
  const [{ data: ch }, { data: platRows }] = await Promise.all([chQ, prQ]);
  const set = new Set<string>();
  for (const row of ch ?? []) {
    const p = row.platform as string | null;
    if (p) set.add(p);
  }
  for (const row of platRows ?? []) {
    const p = row.platform as string | null;
    if (p) set.add(p);
  }
  return sortPlatformsForUi([...set]);
}

export async function getProductsPlatformOptions(): Promise<string[]> {
  const scope = await resolveOrgScope();
  if (!scope) return [];
  return getProductsPlatformOptionsScoped(scope.orgId, scope.supabase);
}

async function loadCatalogSummary(
  supabase: SupabaseClient,
  orgId: string,
  reportFilter: ReportingChannelsFilter
): Promise<ProductsCatalogSummary> {
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return { total: 0, active: 0, draft: 0, archived: 0, totalCogs: 0 };
  }

  const { data, error } = await supabase.rpc("products_catalog_summary", {
    p_org_id: orgId,
    p_channel_ids: rpcChannelIdsParam(reportFilter),
  });
  if (!error && data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    return {
      total: Number(o.total ?? 0),
      active: Number(o.active ?? 0),
      draft: Number(o.draft ?? 0),
      archived: Number(o.archived ?? 0),
      totalCogs: Number(o.total_cogs ?? 0),
    };
  }
  if (error) console.warn("products_catalog_summary RPC failed:", error.message);
  let fb = supabase.from("products").select("status, cogs").eq("org_id", orgId).limit(100_000);
  if (reportFilter.kind === "include_only") {
    fb = fb.in("channel_id", reportFilter.channelIds);
  }
  const { data: rows } = await fb;
  let total = 0;
  let active = 0;
  let draft = 0;
  let archived = 0;
  let totalCogs = 0;
  for (const r of rows ?? []) {
    total++;
    const st = r.status as string | null;
    if (st === "active") active++;
    else if (st === "draft") draft++;
    else if (st === "archived") archived++;
    totalCogs += Number((r as { cogs?: number }).cogs ?? 0);
  }
  return { total, active, draft, archived, totalCogs };
}

function mapProductToRow(
  p: Record<string, unknown>,
  chMap: Map<string, { platform: string; name: string }>,
  rollup: ReturnType<typeof rollupForProducts>
): ProductTableRow {
  const cid = p.channel_id as string | null | undefined;
  const ch = cid ? chMap.get(cid) : undefined;
  const channelPlatform = (ch?.platform || (p.platform as string) || "") as string;
  const channelName = (ch?.name || "") as string;
  const sales = lookupProductSales({ sku: (p.sku as string | null) ?? null, title: String(p.title ?? "") }, rollup);
  return {
    id: String(p.id),
    title: String(p.title ?? ""),
    sku: (p.sku as string | null) ?? null,
    image_url: (p.image_url as string | null) ?? null,
    cogs: p.cogs != null ? Number(p.cogs) : null,
    category: (p.category as string | null) ?? null,
    status: (p.status as string | null) ?? null,
    unitsSold: sales.unitsSold,
    revenue: sales.revenue,
    salesPlatform: sales.platform || channelPlatform,
    channelLabel: channelName || channelPlatform || "—",
  };
}

export async function getProductsCatalogSummary(demoOrgId?: string | null): Promise<ProductsCatalogSummary> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) {
    return { total: 0, active: 0, draft: 0, archived: 0, totalCogs: 0 };
  }
  const { orgId, supabase } = scope;
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  return loadCatalogSummary(supabase, orgId, reportFilter);
}

export async function getProductsCogsTemplateRows(): Promise<Array<{ id: string; title: string; sku: string | null; cogs: number | null }>> {
  const scope = await resolveOrgScope();
  if (!scope) return [];
  const { orgId, supabase } = scope;
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }
  let q = supabase.from("products").select("id, title, sku, cogs").eq("org_id", orgId).order("title", { ascending: true });
  if (reportFilter.kind === "include_only") {
    q = q.in("channel_id", reportFilter.channelIds);
  }
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    sku: (r.sku as string | null) ?? null,
    cogs: r.cogs != null ? Number(r.cogs) : null,
  }));
}

export async function getProductsPage(input: ProductsListParams, demoOrgId?: string | null): Promise<ProductsPageResult> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) {
    return {
      rows: [],
      totalCount: 0,
      pageableTotalCount: 0,
      effectivePage: 1,
      platformOptions: [],
      sortTruncated: false,
    };
  }
  const { orgId, supabase } = scope;

  const days = rangeToDays(input.rangeKey);
  const dateParams: DateParams = { days };
  const { fromStr, toStr } = getDateRange(dateParams);
  const fromIso = `${fromStr}T00:00:00.000Z`;
  const toIso = `${toStr}T23:59:59.999Z`;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      pageableTotalCount: 0,
      effectivePage: 1,
      platformOptions: [],
      sortTruncated: false,
    };
  }

  let orderQ = supabase
    .from("orders")
    .select("id, platform, raw_data, total_amount, item_count")
    .eq("org_id", orgId)
    .gte("ordered_at", fromIso)
    .lte("ordered_at", toIso)
    .neq("status", "cancelled");
  if (reportFilter.kind === "include_only") {
    orderQ = orderQ.in("channel_id", reportFilter.channelIds);
  }

  const [{ data: orders }, { forPlatform, forSearch }, platformOptions, { data: channels }] = await Promise.all([
    orderQ,
    resolveChannelIds(supabase, orgId, input),
    getProductsPlatformOptionsScoped(orgId, supabase),
    supabase.from("channels").select("id, platform, name").eq("org_id", orgId),
  ]);

  const rollup = rollupForProducts((orders ?? []) as OrderRow[]);
  const chMap = new Map((channels ?? []).map((c) => [c.id as string, { platform: c.platform as string, name: c.name as string }]));

  let countQuery = supabase.from("products").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  countQuery = applyProductFilters(countQuery, orgId, input, forPlatform, forSearch, reportFilter);
  const { count, error: cErr } = await countQuery;
  if (cErr) console.error("products count:", cErr.message);
  const totalCount = count ?? 0;

  let sortTruncated = false;
  let listLengthForPaging = totalCount;
  if (input.sortKey !== "none" && totalCount > MAX_SORT_SCAN) {
    sortTruncated = true;
    listLengthForPaging = MAX_SORT_SCAN;
  }

  const totalPages = Math.max(1, Math.ceil(listLengthForPaging / input.pageSize));
  const effectivePage = Math.min(Math.max(1, input.page), totalPages);
  const from = (effectivePage - 1) * input.pageSize;

  let rows: ProductTableRow[] = [];

  if (input.sortKey === "none") {
    const to = from + input.pageSize - 1;
    let dataQuery = supabase
      .from("products")
      .select("id,title,sku,image_url,cogs,category,status,channel_id,platform")
      .eq("org_id", orgId);
    dataQuery = applyProductFilters(dataQuery, orgId, input, forPlatform, forSearch, reportFilter);
    dataQuery = dataQuery.order("title", { ascending: true }).range(from, to);
    const { data: products, error } = await dataQuery;
    if (error) console.error("products list:", error.message);
    rows = (products ?? []).map((p) => mapProductToRow(p as Record<string, unknown>, chMap, rollup));
  } else {
    const scanLimit = Math.min(totalCount, MAX_SORT_SCAN);
    let dataQuery = supabase
      .from("products")
      .select("id,title,sku,image_url,cogs,category,status,channel_id,platform")
      .eq("org_id", orgId);
    dataQuery = applyProductFilters(dataQuery, orgId, input, forPlatform, forSearch, reportFilter);
    dataQuery = dataQuery.order("title", { ascending: true }).limit(scanLimit);
    const { data: products, error } = await dataQuery;
    if (error) console.error("products sort scan:", error.message);
    const mapped = (products ?? []).map((p) => mapProductToRow(p as Record<string, unknown>, chMap, rollup));
    mapped.sort((a, b) => {
      if (input.sortKey === "units") {
        return input.sortDir === "desc" ? b.unitsSold - a.unitsSold : a.unitsSold - b.unitsSold;
      }
      return input.sortDir === "desc" ? b.revenue - a.revenue : a.revenue - b.revenue;
    });
    rows = mapped.slice(from, from + input.pageSize);
  }

  return {
    rows,
    totalCount,
    pageableTotalCount: listLengthForPaging,
    effectivePage,
    platformOptions,
    sortTruncated,
  };
}

export async function fetchProductsExportRows(
  input: ProductsListParams,
  maxRows = 25_000,
  demoOrgId?: string | null
): Promise<ProductTableRow[]> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;
  const days = rangeToDays(input.rangeKey);
  const { fromStr, toStr } = getDateRange({ days });
  const fromIso = `${fromStr}T00:00:00.000Z`;
  const toIso = `${toStr}T23:59:59.999Z`;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let exportOrderQ = supabase
    .from("orders")
    .select("id, platform, raw_data, total_amount, item_count")
    .eq("org_id", orgId)
    .gte("ordered_at", fromIso)
    .lte("ordered_at", toIso)
    .neq("status", "cancelled");
  if (reportFilter.kind === "include_only") {
    exportOrderQ = exportOrderQ.in("channel_id", reportFilter.channelIds);
  }

  const [{ data: orders }, { forPlatform, forSearch }, { data: channels }] = await Promise.all([
    exportOrderQ,
    resolveChannelIds(supabase, orgId, input),
    supabase.from("channels").select("id, platform, name").eq("org_id", orgId),
  ]);
  const rollup = rollupForProducts((orders ?? []) as OrderRow[]);
  const chMap = new Map((channels ?? []).map((c) => [c.id as string, { platform: c.platform as string, name: c.name as string }]));

  const out: ProductTableRow[] = [];
  let offset = 0;
  const batch = 1000;
  while (out.length < maxRows) {
    let q = supabase
      .from("products")
      .select("id,title,sku,image_url,cogs,category,status,channel_id,platform")
      .eq("org_id", orgId);
    q = applyProductFilters(q, orgId, input, forPlatform, forSearch, reportFilter);
    q = q.order("title", { ascending: true }).range(offset, offset + batch - 1);
    const { data, error } = await q;
    if (error || !data?.length) break;
    out.push(...data.map((p) => mapProductToRow(p as Record<string, unknown>, chMap, rollup)));
    if (data.length < batch) break;
    offset += batch;
  }
  return out.slice(0, maxRows);
}
