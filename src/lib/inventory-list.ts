import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeNotificationPrefs } from "@/lib/alerts";
import { resolveOrgScope } from "@/lib/queries";
import {
  buildReportingChannelsFilter,
  rpcChannelIdsParam,
  type ReportingChannelsFilter,
} from "@/lib/reporting-channel-filter";
import { sortPlatformsForUi } from "@/lib/constants";
import { parseTableDateRangeSearchParams, tableDateRangeBounds } from "@/lib/table-date-range";

export type InventoryStockMode =
  | "all"
  | "critical"
  | "low"
  | "healthy"
  | "range"
  /** Matches low-stock alerts: quantity ≤ org notification threshold (Settings). */
  | "below_threshold";

export interface InventoryRow {
  id: string;
  title: string;
  sku: string | null;
  image_url: string | null;
  inventory_quantity: number;
  reorder_point: number | null;
  platform: string;
  channelName: string;
  status: string | null;
  updatedAt?: string | null;
}

export type InventorySourceFilter = "all" | "csv";

export interface InventoryListParams {
  search: string;
  /** Dashboard-style preset; null when all time or custom */
  range: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  channel: string;
  /** `csv` = rows last updated by an inventory CSV import (`import_source_kind` = `inventory_csv`) */
  source: InventorySourceFilter;
  stock: InventoryStockMode;
  smin: number;
  smax: number;
  page: number;
  pageSize: number;
}

const NO_MATCH_PRODUCT_ID = "00000000-0000-0000-0000-000000000001";

export interface InventoryPageResult {
  rows: InventoryRow[];
  totalCount: number;
  histogram: { domainMax: number; counts: number[] };
  platformOptions: string[];
  effectivePage: number;
  alertLowStockThreshold: number;
  criticalThreshold: number;
  lowThreshold: number;
}

function firstParam(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

export function parseInventoryListParams(sp: Record<string, string | string[] | undefined>): InventoryListParams {
  const search = firstParam(sp, "search") ?? "";
  const page = Math.max(1, parseInt(firstParam(sp, "page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(firstParam(sp, "pageSize") ?? "10", 10);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
  const { range, dateFrom, dateTo } = parseTableDateRangeSearchParams(sp);
  const channel = firstParam(sp, "channel") ?? "all";
  const sourceRaw = firstParam(sp, "source") ?? "all";
  const source: InventorySourceFilter = sourceRaw === "csv" ? "csv" : "all";
  const stockRaw = firstParam(sp, "stock") ?? "all";
  const stock = (
    ["all", "critical", "low", "healthy", "range", "below_threshold"].includes(stockRaw)
      ? stockRaw
      : "all"
  ) as InventoryStockMode;
  const smin = parseInt(firstParam(sp, "smin") ?? "0", 10) || 0;
  const smax = parseInt(firstParam(sp, "smax") ?? "0", 10) || 0;
  return { search, range, dateFrom, dateTo, channel, source, stock, smin, smax, page, pageSize };
}

export function parseInventoryParamsFromURLSearchParams(sp: URLSearchParams): InventoryListParams {
  const r: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!(k in r)) r[k] = v;
  });
  return parseInventoryListParams(r);
}

/** Escape `%` and `_` for Postgres ILIKE; caller adds wildcards. */
export function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function resolveChannelIds(
  supabase: SupabaseClient,
  orgId: string,
  input: InventoryListParams
): Promise<{ forPlatform: string[]; forSearch: string[] }> {
  let forPlatform: string[] = [];
  if (input.channel !== "all") {
    const { data } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", input.channel);
    forPlatform = (data ?? []).map((r) => r.id as string).filter(Boolean);
  }

  let forSearch: string[] = [];
  const t = input.search.trim();
  if (t.length > 0) {
    const esc = escapeIlike(t);
    const { data } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .ilike("name", `%${esc}%`);
    forSearch = (data ?? []).map((r) => r.id as string).filter(Boolean);
  }

  return { forPlatform, forSearch };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyInventoryFilters(
  q: any,
  input: InventoryListParams,
  forPlatform: string[],
  forSearch: string[],
  reportFilter: ReportingChannelsFilter,
  alertLowStockThreshold: number,
  lowThreshold?: number
) {
  const searchTrim = input.search.trim();
  if (searchTrim.length > 0) {
    const esc = escapeIlike(searchTrim);
    const pattern = `%${esc}%`;
    const parts = [`title.ilike.${pattern}`, `sku.ilike.${pattern}`];
    if (forSearch.length > 0) {
      parts.push(`channel_id.in.(${forSearch.join(",")})`);
    }
    q = q.or(parts.join(","));
  }

  if (input.channel !== "all") {
    if (forPlatform.length > 0) {
      q = q.or(`channel_id.in.(${forPlatform.join(",")}),platform.eq.${input.channel}`);
    } else {
      q = q.eq("platform", input.channel);
    }
  }

  const { since, until } = tableDateRangeBounds(input.range, input.dateFrom, input.dateTo);
  if (since) {
    q = q.not("inventory_updated_at", "is", null).gte("inventory_updated_at", since);
  }
  if (until) {
    q = q.not("inventory_updated_at", "is", null).lte("inventory_updated_at", until);
  }

  switch (input.stock) {
    case "critical":
    case "below_threshold":
      q = q.lte("inventory_quantity", Math.max(0, alertLowStockThreshold));
      break;
    case "low":
      q = q.gt("inventory_quantity", alertLowStockThreshold).lte("inventory_quantity", lowThreshold ?? 20);
      break;
    case "healthy":
      q = q.gt("inventory_quantity", lowThreshold ?? 20);
      break;
    case "range": {
      let hi = input.smax;
      if (hi <= 0) hi = 2_147_483_647;
      const lo = Math.min(input.smin, hi);
      q = q.gte("inventory_quantity", lo).lte("inventory_quantity", hi);
      break;
    }
    default:
      break;
  }

  if (reportFilter.kind === "include_only") {
    if (reportFilter.channelIds.length === 0) {
      return q.eq("id", NO_MATCH_PRODUCT_ID);
    }
    q = q.in("channel_id", reportFilter.channelIds);
  }

  if (input.source === "csv") {
    q = q.eq("import_source_kind", "inventory_csv");
  }

  return q;
}

function mapRows(
  products: Record<string, unknown>[],
  chMap: Map<string, { platform: string; name: string }>
): InventoryRow[] {
  return products.map((p) => {
    const cid = p.channel_id as string | null | undefined;
    const ch = cid ? chMap.get(cid) : undefined;
    const platform = (ch?.platform || (p.platform as string) || "—") as string;
    const channelName = (ch?.name || "—") as string;
    return {
      id: String(p.id),
      title: String(p.title ?? ""),
      sku: (p.sku as string | null) ?? null,
      image_url: (p.image_url as string | null) ?? null,
      inventory_quantity: Number(p.inventory_quantity ?? 0),
      reorder_point: p.reorder_point != null ? Number(p.reorder_point) : null,
      platform,
      channelName,
      status: (p.status as string | null) ?? null,
      updatedAt: (p.inventory_updated_at as string | null) ?? null,
    };
  });
}

async function getStockThresholds(supabase: SupabaseClient, orgId: string): Promise<{ critical: number; low: number }> {
  const { data } = await supabase
    .from("organizations")
    .select("notification_preferences")
    .eq("id", orgId)
    .maybeSingle();
  const prefs = mergeNotificationPrefs(data?.notification_preferences);
  return { critical: prefs.critical_threshold, low: prefs.low_threshold };
}

function parseHistogramJson(data: unknown): { domainMax: number; counts: number[] } {
  const raw = data as { domain_max?: number; counts?: unknown } | null;
  const domainMax = Math.max(1, Number(raw?.domain_max ?? 1));
  const arr = Array.isArray(raw?.counts) ? raw!.counts.map((n) => Number(n) || 0) : Array(18).fill(0);
  while (arr.length < 18) arr.push(0);
  arr.length = 18;
  return { domainMax, counts: arr };
}

async function loadHistogramFromRpc(
  supabase: SupabaseClient,
  orgId: string,
  input: InventoryListParams,
  reportFilter: ReportingChannelsFilter
): Promise<{ domainMax: number; counts: number[] } | null> {
  if (input.stock === "below_threshold") return null;
  if (input.source === "csv") return null;
  const searchTrim = input.search.trim();
  const { since, until } = tableDateRangeBounds(input.range, input.dateFrom, input.dateTo);

  const { data, error } = await supabase.rpc("inventory_stock_histogram", {
    p_org_id: orgId,
    p_search: searchTrim.length ? searchTrim : null,
    p_cutoff: since,
    p_platform: input.channel !== "all" ? input.channel : null,
    p_cutoff_until: until,
    p_channel_ids: rpcChannelIdsParam(reportFilter),
  });

  if (error) {
    console.warn("inventory_stock_histogram RPC failed (apply migration or use fallback):", error.message);
    return null;
  }
  return parseHistogramJson(data);
}

/** Loads quantities for filtered set and bins in Node (fallback if RPC missing). */
async function loadHistogramClientMatch(
  supabase: SupabaseClient,
  orgId: string,
  input: InventoryListParams,
  forPlatform: string[],
  forSearch: string[],
  reportFilter: ReportingChannelsFilter,
  alertLowStockThreshold: number,
  lowThreshold?: number
): Promise<{ domainMax: number; counts: number[] }> {
  let q = supabase.from("products").select("inventory_quantity").eq("org_id", orgId);
  q = applyInventoryFilters(q, input, forPlatform, forSearch, reportFilter, alertLowStockThreshold, lowThreshold);
  const { data, error } = await q;

  if (error) {
    console.warn("inventory histogram fallback query failed:", error.message);
    return { domainMax: 1, counts: Array(18).fill(0) };
  }

  const quantities = (data ?? []).map((r) => Number((r as { inventory_quantity?: number }).inventory_quantity ?? 0));
  const domainMax = Math.max(1, ...quantities, 1);
  const width = (domainMax + 1) / 18;
  const counts = Array.from({ length: 18 }, () => 0);
  for (const qv of quantities) {
    const i = Math.min(17, Math.floor(qv / width));
    counts[i]++;
  }
  return { domainMax, counts };
}

async function getInventoryPlatformOptionsScoped(orgId: string, supabase: SupabaseClient): Promise<string[]> {
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

export async function getInventoryPlatformOptions(): Promise<string[]> {
  const scope = await resolveOrgScope();
  if (!scope) return [];
  return getInventoryPlatformOptionsScoped(scope.orgId, scope.supabase);
}

export async function getInventoryPage(input: InventoryListParams, demoOrgId?: string | null): Promise<InventoryPageResult> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) {
    return {
      rows: [],
      totalCount: 0,
      histogram: { domainMax: 1, counts: Array(18).fill(0) },
      platformOptions: [],
      effectivePage: 1,
      alertLowStockThreshold: 5,
      criticalThreshold: 5,
      lowThreshold: 20,
    };
  }
  const { orgId, supabase } = scope;
  const thresholds = await getStockThresholds(supabase, orgId);
  const alertLowStockThreshold = thresholds.critical;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      histogram: { domainMax: 1, counts: Array(18).fill(0) },
      platformOptions: [],
      effectivePage: 1,
      alertLowStockThreshold,
      criticalThreshold: thresholds.critical,
      lowThreshold: thresholds.low,
    };
  }

  const { forPlatform, forSearch } = await resolveChannelIds(supabase, orgId, input);

  let countQuery = supabase.from("products").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  countQuery = applyInventoryFilters(countQuery, input, forPlatform, forSearch, reportFilter, alertLowStockThreshold, thresholds.low);
  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("inventory count:", countError.message);
    return {
      rows: [],
      totalCount: 0,
      histogram: { domainMax: 1, counts: Array(18).fill(0) },
      platformOptions: [],
      effectivePage: 1,
      alertLowStockThreshold,
      criticalThreshold: thresholds.critical,
      lowThreshold: thresholds.low,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / input.pageSize));
  const effectivePage = Math.min(Math.max(1, input.page), totalPages);
  const from = (effectivePage - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  let dataQuery = supabase
    .from("products")
    .select("id,title,sku,image_url,inventory_quantity,reorder_point,status,inventory_updated_at,channel_id,platform")
    .eq("org_id", orgId);
  dataQuery = applyInventoryFilters(dataQuery, input, forPlatform, forSearch, reportFilter, alertLowStockThreshold, thresholds.low);
  dataQuery = dataQuery.order("title", { ascending: true }).range(from, to);

  const [platformOptions, histRpc, { data: products, error: dataError }, { data: channels }] = await Promise.all([
    getInventoryPlatformOptionsScoped(orgId, supabase),
    loadHistogramFromRpc(supabase, orgId, input, reportFilter),
    dataQuery,
    supabase.from("channels").select("id,platform,name").eq("org_id", orgId),
  ]);

  const histogram =
    histRpc ??
    (await loadHistogramClientMatch(
      supabase,
      orgId,
      input,
      forPlatform,
      forSearch,
      reportFilter,
      alertLowStockThreshold,
      thresholds.low
    ));

  if (dataError) {
    console.error("inventory list:", dataError.message);
  }

  const chMap = new Map((channels ?? []).map((c) => [c.id as string, { platform: c.platform as string, name: c.name as string }]));
  const rows = mapRows((products ?? []) as Record<string, unknown>[], chMap);

  return {
    rows,
    totalCount,
    histogram,
    platformOptions,
    effectivePage,
    alertLowStockThreshold,
    criticalThreshold: thresholds.critical,
    lowThreshold: thresholds.low,
  };
}

/** Export only; capped for safety. */
export async function fetchInventoryExportRows(
  input: InventoryListParams,
  maxRows = 25_000,
  demoOrgId?: string | null
): Promise<InventoryRow[]> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;
  const thresholds = await getStockThresholds(supabase, orgId);
  const alertLowStockThreshold = thresholds.critical;
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  const { forPlatform, forSearch } = await resolveChannelIds(supabase, orgId, input);
  const { data: channels } = await supabase.from("channels").select("id,platform,name").eq("org_id", orgId);
  const chMap = new Map((channels ?? []).map((c) => [c.id as string, { platform: c.platform as string, name: c.name as string }]));

  const out: InventoryRow[] = [];
  const batch = 1000;
  let offset = 0;

  while (out.length < maxRows) {
    let q = supabase
      .from("products")
      .select("id,title,sku,image_url,inventory_quantity,reorder_point,status,inventory_updated_at,channel_id,platform")
      .eq("org_id", orgId);
    q = applyInventoryFilters(q, input, forPlatform, forSearch, reportFilter, alertLowStockThreshold, thresholds.low);
    q = q.order("title", { ascending: true }).range(offset, offset + batch - 1);
    const { data, error } = await q;
    if (error) {
      console.error("inventory export batch:", error.message);
      break;
    }
    const chunk = (data ?? []) as Record<string, unknown>[];
    if (chunk.length === 0) break;
    out.push(...mapRows(chunk, chMap));
    if (chunk.length < batch) break;
    offset += batch;
  }

  return out;
}
