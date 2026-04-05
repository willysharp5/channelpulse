import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveOrgScope } from "@/lib/queries";
import {
  buildReportingChannelsFilter,
  rpcChannelIdsParam,
  type ReportingChannelsFilter,
} from "@/lib/reporting-channel-filter";
import { escapeIlike } from "@/lib/inventory-list";
import { parseDateYmd } from "@/lib/date-ymd";
import { parseTableDateRangeSearchParams, tableDateRangeBounds } from "@/lib/table-date-range";
import { sortPlatformsForUi } from "@/lib/constants";

export interface OrderListRow {
  id: string;
  platform: string;
  order_number: string | null;
  status: string | null;
  financial_status: string | null;
  customer_name: string | null;
  total_amount: number | null;
  subtotal: number | null;
  total_tax: number | null;
  total_shipping: number | null;
  platform_fees: number | null;
  net_profit: number | null;
  currency: string | null;
  item_count: number | null;
  ordered_at: string;
}

export type OrdersSortKey = "date" | "amount" | "fees" | "profit" | "items";

export interface OrdersListParams {
  search: string;
  status: string;
  channel: string;
  /** YYYY-MM-DD from URL `from`, or null */
  dateFrom: string | null;
  /** YYYY-MM-DD from URL `to`, or null */
  dateTo: string | null;
  /** Dashboard-style preset (e.g. 7d); null when all time or custom */
  range: string | null;
  page: number;
  pageSize: number;
  sortKey: OrdersSortKey;
  sortDir: "asc" | "desc";
}

export interface OrdersPageResult {
  rows: OrderListRow[];
  totalCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalFees: number;
  effectivePage: number;
  platformOptions: string[];
}

function firstParam(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

const ORDERS_SORT_KEYS: OrdersSortKey[] = ["date", "amount", "fees", "profit", "items"];

export const parseOrdersDateYmd = parseDateYmd;

/** ISO bounds for ordered_at filtering (same calendar windows as overview `range` / custom). */
export function ordersOrderedAtBounds(input: OrdersListParams): { since: string | null; until: string | null } {
  return tableDateRangeBounds(input.range, input.dateFrom, input.dateTo);
}

export function parseOrdersListParams(sp: Record<string, string | string[] | undefined>): OrdersListParams {
  const search = firstParam(sp, "search") ?? "";
  const status = firstParam(sp, "status") ?? "all";
  const channel = firstParam(sp, "channel") ?? "all";
  const { range, dateFrom, dateTo } = parseTableDateRangeSearchParams(sp);
  const page = Math.max(1, parseInt(firstParam(sp, "page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(firstParam(sp, "pageSize") ?? "20", 10);
  const pageSize = [10, 20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const sortRaw = firstParam(sp, "sort") ?? "";
  const sortKey = ORDERS_SORT_KEYS.includes(sortRaw as OrdersSortKey) ? (sortRaw as OrdersSortKey) : "date";
  const sd = firstParam(sp, "dir") ?? "desc";
  const sortDir = sd === "asc" ? "asc" : "desc";
  return { search, status, channel, dateFrom, dateTo, range, page, pageSize, sortKey, sortDir };
}

function ordersSortColumn(key: OrdersSortKey): string {
  switch (key) {
    case "date":
      return "ordered_at";
    case "amount":
      return "total_amount";
    case "fees":
      return "platform_fees";
    case "profit":
      return "net_profit";
    case "items":
      return "item_count";
    default:
      return "ordered_at";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOrdersSort(q: any, input: OrdersListParams) {
  const col = ordersSortColumn(input.sortKey);
  const ascending = input.sortDir === "asc";
  return q.order(col, { ascending, nullsFirst: false }).order("id", { ascending: true });
}

export function parseOrdersParamsFromURLSearchParams(sp: URLSearchParams): OrdersListParams {
  const r: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!(k in r)) r[k] = v;
  });
  return parseOrdersListParams(r);
}

const NO_MATCH_ORDER_ID = "00000000-0000-0000-0000-000000000001";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOrderFilters(q: any, orgId: string, input: OrdersListParams, reportFilter: ReportingChannelsFilter) {
  q = q.eq("org_id", orgId);
  if (input.status && input.status !== "all") {
    q = q.eq("status", input.status);
  }
  if (input.channel && input.channel !== "all") {
    q = q.eq("platform", input.channel);
  }
  const t = input.search.trim();
  if (t.length > 0) {
    const esc = escapeIlike(t);
    const p = `%${esc}%`;
    const num = Number(t);
    if (!Number.isNaN(num) && t !== "") {
      q = q.or(`order_number.ilike.${p},customer_name.ilike.${p},total_amount.eq.${num}`);
    } else {
      q = q.or(`order_number.ilike.${p},customer_name.ilike.${p}`);
    }
  }
  const { since, until } = ordersOrderedAtBounds(input);
  if (since) {
    q = q.gte("ordered_at", since);
  }
  if (until) {
    q = q.lte("ordered_at", until);
  }
  if (reportFilter.kind === "include_only") {
    if (reportFilter.channelIds.length === 0) {
      return q.eq("id", NO_MATCH_ORDER_ID);
    }
    q = q.in("channel_id", reportFilter.channelIds);
  }
  return q;
}

async function loadOrdersStats(
  supabase: SupabaseClient,
  orgId: string,
  input: OrdersListParams,
  reportFilter: ReportingChannelsFilter
): Promise<{ totalCount: number; totalRevenue: number; totalProfit: number; totalFees: number }> {
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return { totalCount: 0, totalRevenue: 0, totalProfit: 0, totalFees: 0 };
  }

  const searchTrim = input.search.trim();
  const { since: orderedSince, until: orderedUntil } = ordersOrderedAtBounds(input);
  const { data, error } = await supabase.rpc("orders_filtered_stats", {
    p_org_id: orgId,
    p_search: searchTrim.length ? searchTrim : null,
    p_status: input.status === "all" ? null : input.status,
    p_platform: input.channel === "all" ? null : input.channel,
    p_ordered_at_since: orderedSince,
    p_ordered_at_until: orderedUntil,
    p_channel_ids: rpcChannelIdsParam(reportFilter),
  });

  if (!error && data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    return {
      totalCount: Number(o.total_count ?? 0),
      totalRevenue: Number(o.total_revenue ?? 0),
      totalProfit: Number(o.total_profit ?? 0),
      totalFees: Number(o.total_fees ?? 0),
    };
  }

  if (error) {
    console.warn("orders_filtered_stats RPC failed:", error.message);
  }

  let q = supabase.from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  q = applyOrderFilters(q, orgId, input, reportFilter);
  const { count } = await q;
  const totalCount = count ?? 0;

  let sumQ = supabase
    .from("orders")
    .select("total_amount, net_profit, platform_fees")
    .eq("org_id", orgId);
  sumQ = applyOrderFilters(sumQ, orgId, input, reportFilter);
  const { data: rows } = await sumQ.limit(100_000);
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalFees = 0;
  for (const r of rows ?? []) {
    totalRevenue += Number((r as { total_amount?: number }).total_amount ?? 0);
    totalProfit += Number((r as { net_profit?: number }).net_profit ?? 0);
    totalFees += Number((r as { platform_fees?: number }).platform_fees ?? 0);
  }
  return { totalCount, totalRevenue, totalProfit, totalFees };
}

async function getOrdersPlatformOptionsScoped(orgId: string, supabase: SupabaseClient): Promise<string[]> {
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }

  let chQ = supabase.from("channels").select("platform").eq("org_id", orgId);
  let ordQ = supabase.from("orders").select("platform").eq("org_id", orgId);
  if (reportFilter.kind === "include_only") {
    chQ = chQ.in("id", reportFilter.channelIds);
    ordQ = ordQ.in("channel_id", reportFilter.channelIds);
  }

  const [{ data: chRows }, { data: ordRows }] = await Promise.all([chQ, ordQ]);
  const set = new Set<string>();
  for (const r of chRows ?? []) {
    const p = r.platform as string | null;
    if (p) set.add(p);
  }
  for (const r of ordRows ?? []) {
    const p = r.platform as string | null;
    if (p) set.add(p);
  }
  return sortPlatformsForUi([...set]);
}

export async function getOrdersOrgTotalCount(demoOrgId?: string | null): Promise<number> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return 0;
  const { orgId, supabase } = scope;
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return 0;
  }
  let q = supabase.from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if (reportFilter.kind === "include_only") {
    q = q.in("channel_id", reportFilter.channelIds);
  }
  const { count } = await q;
  return count ?? 0;
}

export async function getOrdersPlatformOptions(): Promise<string[]> {
  const scope = await resolveOrgScope();
  if (!scope) return [];
  return getOrdersPlatformOptionsScoped(scope.orgId, scope.supabase);
}

export async function getOrdersPage(input: OrdersListParams, demoOrgId?: string | null): Promise<OrdersPageResult> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) {
    return {
      rows: [],
      totalCount: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalFees: 0,
      effectivePage: 1,
      platformOptions: [],
    };
  }
  const { orgId, supabase } = scope;

  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalFees: 0,
      effectivePage: 1,
      platformOptions: [],
    };
  }

  const [stats, platformOptions] = await Promise.all([
    loadOrdersStats(supabase, orgId, input, reportFilter),
    getOrdersPlatformOptionsScoped(orgId, supabase),
  ]);

  const totalPages = Math.max(1, Math.ceil(stats.totalCount / input.pageSize));
  const effectivePage = Math.min(Math.max(1, input.page), totalPages);
  const from = (effectivePage - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  let dataQuery = supabase
    .from("orders")
    .select(
      "id, platform, order_number, status, financial_status, customer_name, total_amount, subtotal, total_tax, total_shipping, platform_fees, net_profit, currency, item_count, ordered_at"
    )
    .eq("org_id", orgId);
  dataQuery = applyOrderFilters(dataQuery, orgId, input, reportFilter);
  dataQuery = applyOrdersSort(dataQuery, input).range(from, to);

  const { data: orders, error } = await dataQuery;
  if (error) {
    console.error("orders list:", error.message);
  }

  const rows: OrderListRow[] = (orders ?? []).map((o) => mapOrderRow(o as Record<string, unknown>));

  return {
    rows,
    totalCount: stats.totalCount,
    totalRevenue: stats.totalRevenue,
    totalProfit: stats.totalProfit,
    totalFees: stats.totalFees,
    effectivePage,
    platformOptions,
  };
}

function mapOrderRow(o: Record<string, unknown>): OrderListRow {
  return {
    id: String(o.id),
    platform: String(o.platform ?? ""),
    order_number: (o.order_number as string | null) ?? null,
    status: (o.status as string | null) ?? null,
    financial_status: (o.financial_status as string | null) ?? null,
    customer_name: (o.customer_name as string | null) ?? null,
    total_amount: o.total_amount != null ? Number(o.total_amount) : null,
    subtotal: o.subtotal != null ? Number(o.subtotal) : null,
    total_tax: o.total_tax != null ? Number(o.total_tax) : null,
    total_shipping: o.total_shipping != null ? Number(o.total_shipping) : null,
    platform_fees: o.platform_fees != null ? Number(o.platform_fees) : null,
    net_profit: o.net_profit != null ? Number(o.net_profit) : null,
    currency: (o.currency as string | null) ?? null,
    item_count: o.item_count != null ? Number(o.item_count) : null,
    ordered_at: String(o.ordered_at),
  };
}

export async function fetchOrdersExportRows(
  input: OrdersListParams,
  maxRows = 25_000,
  demoOrgId?: string | null
): Promise<OrderListRow[]> {
  const scope = await resolveOrgScope(demoOrgId);
  if (!scope) return [];
  const { orgId, supabase } = scope;
  const reportFilter = await buildReportingChannelsFilter(supabase, orgId);
  if (reportFilter.kind === "include_only" && reportFilter.channelIds.length === 0) {
    return [];
  }
  const out: OrderListRow[] = [];
  let offset = 0;
  const batch = 1000;
  while (out.length < maxRows) {
    let q = supabase
      .from("orders")
      .select(
        "id, platform, order_number, status, financial_status, customer_name, total_amount, subtotal, total_tax, total_shipping, platform_fees, net_profit, currency, item_count, ordered_at"
      )
      .eq("org_id", orgId);
    q = applyOrderFilters(q, orgId, input, reportFilter);
    q = applyOrdersSort(q, input).range(offset, offset + batch - 1);
    const { data, error } = await q;
    if (error || !data?.length) break;
    out.push(...data.map((o) => mapOrderRow(o as Record<string, unknown>)));
    if (data.length < batch) break;
    offset += batch;
  }
  return out.slice(0, maxRows);
}
