"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useDebouncedUrlSearch, useSyncEffectivePage } from "@/hooks/use-debounced-url-search";
import { IMPORTED_DATA_TABLE_ID, useScrollToImportedTableWhenFiltered } from "@/hooks/use-scroll-to-imported-table";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  Download,
  Loader2,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultPendingShell } from "@/components/ui/result-pending-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TableDateRangeFilter } from "@/components/layout/table-date-range-filter";
import { ImportedDataFilterBanner } from "@/components/layout/imported-data-filter-banner";
import { isTableDateRangeActive, parseTableDateRangeSearchParams } from "@/lib/table-date-range";
import type { Platform } from "@/types";
import type { OrderListRow } from "@/lib/orders-list";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

function HeaderWithTip({ children, tip, className }: { children: React.ReactNode; tip: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {children}
      <Tooltip>
        <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />} />
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {tip}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

const PAGE_SIZES = [10, 20, 50, 100];

type OrderSortKey = "date" | "amount" | "fees" | "profit" | "items";

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  shipped: { variant: "secondary", label: "Shipped" },
  delivered: { variant: "secondary", label: "Delivered" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  refunded: { variant: "destructive", label: "Refunded" },
};

function normalizeOrdersQuery(pathname: string, cur: URLSearchParams): string {
  const n = new URLSearchParams(cur.toString());
  if (!n.get("search")) n.delete("search");
  if (!n.get("page") || n.get("page") === "1") n.delete("page");
  if (!n.get("pageSize") || n.get("pageSize") === "20") n.delete("pageSize");
  if (!n.get("status") || n.get("status") === "all") n.delete("status");
  if (!n.get("channel") || n.get("channel") === "all") n.delete("channel");
  if (!n.get("source") || n.get("source") === "all") n.delete("source");
  if (!n.get("range")) n.delete("range");
  if (!n.get("date") || n.get("date") === "all") n.delete("date");
  if (!n.get("from")) n.delete("from");
  if (!n.get("to")) n.delete("to");
  const sort = n.get("sort");
  if (!sort || sort === "date") {
    if (sort === "date" && n.get("dir") === "asc") {
      // keep explicit oldest-first
    } else {
      n.delete("sort");
      n.delete("dir");
    }
  } else if (n.get("dir") === "desc") {
    n.delete("dir");
  }
  const qs = n.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

interface OrdersTableProps {
  rows: OrderListRow[];
  totalCount: number;
  totalRevenue: number;
  effectivePage: number;
  requestedPage: number;
  platformOptions: string[];
}

export function OrdersTable({
  rows,
  totalCount,
  totalRevenue,
  effectivePage,
  requestedPage,
  platformOptions,
}: OrdersTableProps) {
  const isDemo = useDemo();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const highlightId = searchParams.get("order") ?? "";

  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const pageSize = PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : 20;
  const statusFilter = searchParams.get("status") ?? "all";
  const dateParamsQs = searchParams.toString();
  const tableDateParams = useMemo(() => {
    const sp = new URLSearchParams(dateParamsQs);
    const r: Record<string, string> = {};
    sp.forEach((v, k) => {
      if (!(k in r)) r[k] = v;
    });
    return parseTableDateRangeSearchParams(r);
  }, [dateParamsQs]);
  const channelFromUrl = searchParams.get("channel") ?? "all";
  const sourceFromUrl = searchParams.get("source") ?? "all";
  useScrollToImportedTableWhenFiltered(sourceFromUrl);
  const searchFromUrl = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(searchFromUrl);
  const [pendingChannel, setPendingChannel] = useState<string | null>(null);
  const channelFilter = pendingChannel ?? channelFromUrl;
  const [detailOrder, setDetailOrder] = useState<OrderListRow | null>(null);

  const [isFilterPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchDraft(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    if (pendingChannel === null) return;
    if (pendingChannel === channelFromUrl) setPendingChannel(null);
  }, [channelFromUrl, pendingChannel]);

  useDebouncedUrlSearch(
    searchDraft,
    searchFromUrl,
    pathname,
    searchParams,
    router,
    normalizeOrdersQuery,
    400,
    startTransition
  );
  useSyncEffectivePage(
    effectivePage,
    requestedPage,
    pathname,
    searchParams,
    router,
    normalizeOrdersQuery,
    startTransition
  );

  const replaceQuery = useCallback(
    (mutate: (n: URLSearchParams) => void) => {
      const n = new URLSearchParams(searchParams.toString());
      mutate(n);
      startTransition(() => {
        router.replace(normalizeOrdersQuery(pathname, n), { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const sortRaw = searchParams.get("sort");
  const orderSortKey: OrderSortKey =
    sortRaw === "amount" || sortRaw === "fees" || sortRaw === "profit" || sortRaw === "items"
      ? sortRaw
      : "date";
  const orderSortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(pageFromUrl, totalPages);
  const hasSortInUrl = searchParams.has("sort") || searchParams.get("dir") === "asc";
  const hasFilters =
    searchFromUrl.length > 0 ||
    statusFilter !== "all" ||
    channelFilter !== "all" ||
    sourceFromUrl === "csv" ||
    isTableDateRangeActive(tableDateParams) ||
    hasSortInUrl;

  const searchTypingPending = searchDraft !== searchFromUrl;
  const showSearchLoader =
    searchTypingPending || (isFilterPending && searchFromUrl.trim().length > 0);

  function highlightMatch(text: string): React.ReactNode {
    const q = searchFromUrl.trim();
    if (!q || q.length < 1) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-800/90">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  function exportCsv() {
    if (isDemo) {
      toast.message("Sign up to export orders", {
        description: "CSV export is available after you create an account.",
      });
      return;
    }
    const qs = searchParams.toString();
    window.location.assign(`/api/orders/export${qs ? `?${qs}` : ""}`);
  }

  function toggleOrderSort(key: OrderSortKey) {
    replaceQuery((n) => {
      const curSort = n.get("sort");
      const curDir = n.get("dir") === "asc" ? "asc" : "desc";

      if (key === "date") {
        if (!curSort || curSort === "date") {
          if (!curSort) {
            n.set("sort", "date");
            n.set("dir", "asc");
          } else if (curDir === "desc") {
            n.set("dir", "asc");
          } else {
            n.delete("sort");
            n.delete("dir");
          }
        } else {
          n.set("sort", "date");
          n.set("dir", "desc");
        }
      } else if (curSort !== key) {
        n.set("sort", key);
        n.set("dir", "desc");
      } else {
        n.set("dir", curDir === "desc" ? "asc" : "desc");
      }
      n.set("page", "1");
    });
  }

  function OrderSortHeader({ column, children }: { column: OrderSortKey; children: React.ReactNode }) {
    const active = orderSortKey === column;
    const dir = orderSortDir;
    return (
      <button
        type="button"
        onClick={() => toggleOrderSort(column)}
        className="inline-flex items-center gap-1 font-medium text-foreground hover:opacity-90"
      >
        {children}
        {!active ? (
          <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground/70" />
        ) : dir === "desc" ? (
          <ArrowDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowUp className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border border-border/80 bg-slate-50/90 p-4 shadow-sm transition-opacity duration-200",
          "dark:bg-muted/25",
          isFilterPending && "opacity-80"
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-6 lg:gap-y-4">
          <div className="min-w-[min(100%,220px)] flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Order #, customer name…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-busy={showSearchLoader || isFilterPending}
                className={cn(
                  "h-9 bg-background pl-8",
                  showSearchLoader && searchDraft ? "pr-16" : showSearchLoader ? "pr-10" : searchDraft ? "pr-8" : "pr-8"
                )}
              />
              {showSearchLoader ? (
                <span
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
                    searchDraft ? "right-9" : "right-3"
                  )}
                  title="Updating results…"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </span>
              ) : null}
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    replaceQuery((n) => {
                      n.delete("search");
                      n.set("page", "1");
                    });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {platformOptions.length > 1 ? (
            <div className="w-full space-y-1.5 sm:w-[160px]">
              <Label className="text-xs font-medium text-muted-foreground">Channel</Label>
              <Select
                value={channelFilter}
                onValueChange={(v: string | null) => {
                  const next = v ?? "all";
                  setPendingChannel(next);
                  replaceQuery((n) => {
                    if (next === "all") n.delete("channel");
                    else n.set("channel", next);
                    n.set("page", "1");
                  });
                }}
              >
                <SelectTrigger className="h-9 w-full bg-background">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {platformOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="w-full space-y-1.5 sm:w-[200px]">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v: string | null) => {
                const next = v ?? "all";
                replaceQuery((n) => {
                  if (next === "all") n.delete("status");
                  else n.set("status", next);
                  n.set("page", "1");
                });
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-1.5 sm:w-[200px]">
            <Label
              className="text-xs font-medium text-muted-foreground"
              title="Imported from file = orders uploaded from the Import page. All records = everything in ChannelPulse."
            >
              Data source
            </Label>
            <Select
              value={sourceFromUrl === "csv" ? "csv" : "all"}
              onValueChange={(v: string | null) => {
                const next = v ?? "all";
                replaceQuery((n) => {
                  if (next === "csv") n.set("source", "csv");
                  else n.delete("source");
                  n.set("page", "1");
                });
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue placeholder="Data source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All records</SelectItem>
                <SelectItem value="csv">Imported from file</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TableDateRangeFilter
            label="Order date"
            searchParams={searchParams}
            replaceQuery={replaceQuery}
            allowAllTime
          />

          <div className="flex flex-wrap gap-2 pb-0.5 lg:ml-auto">
            {hasFilters ? (
              <Button variant="secondary" size="sm" className="h-9" onClick={() => {
                setPendingChannel(null);
                startTransition(() => router.replace(pathname, { scroll: false }));
              }}>
                Reset
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="h-9 gap-1" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <ResultPendingShell pending={isFilterPending} className="space-y-5">
        <div className="rounded-xl border border-border/80 bg-background px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Matching orders</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {totalCount}
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              · {formatCurrency(totalRevenue)} total
            </span>
          </p>
        </div>

        <div id={IMPORTED_DATA_TABLE_ID} className="scroll-mt-20 md:scroll-mt-24">
          <div className="overflow-hidden rounded-md border">
          {sourceFromUrl === "csv" ? (
            <ImportedDataFilterBanner
              entity="orders"
              onShowAll={() =>
                replaceQuery((n) => {
                  n.delete("source");
                  n.set("page", "1");
                })
              }
            />
          ) : null}
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <OrderSortHeader column="amount">
                    <HeaderWithTip tip="Total order amount including tax and shipping.">Amount</HeaderWithTip>
                  </OrderSortHeader>
                </div>
              </TableHead>
              <TableHead className="hidden text-right md:table-cell">
                <div className="flex justify-end">
                  <OrderSortHeader column="fees">
                    <HeaderWithTip tip="Estimated marketplace/payment processing fees. Shopify: 2.9% + $0.30 per order.">
                      Fees
                    </HeaderWithTip>
                  </OrderSortHeader>
                </div>
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                <div className="flex justify-end">
                  <OrderSortHeader column="profit">
                    <HeaderWithTip tip="Order amount minus platform fees. Calculated as: Amount - Fees.">Profit</HeaderWithTip>
                  </OrderSortHeader>
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">
                <OrderSortHeader column="items">Items</OrderSortHeader>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex justify-end">
                  <OrderSortHeader column="date">Date</OrderSortHeader>
                </div>
              </TableHead>
              <TableHead className="w-12 text-center">
                <span className="sr-only">View</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {searchFromUrl ? `No orders matching "${searchFromUrl}"` : "No orders found"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((order) => {
                const statusStyle = STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending;
                const isHighlighted = highlightId === order.id;
                const orderLabel = order.order_number ?? order.id.slice(0, 8);
                return (
                  <TableRow
                    key={order.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/40",
                      isHighlighted ? "bg-amber-50 dark:bg-amber-950/30" : ""
                    )}
                    onClick={() => setDetailOrder(order)}
                  >
                    <TableCell className="font-medium tabular-nums">
                      {highlightMatch(order.order_number ?? order.id.slice(0, 8))}
                    </TableCell>
                    <TableCell>
                      <ChannelBadge platform={order.platform as Platform} className="text-[10px] px-1.5 py-0" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[150px] truncate">
                      {order.customer_name ? highlightMatch(order.customer_name) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(Number(order.total_amount ?? 0))}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums text-muted-foreground">
                      {formatCurrency(Number(order.platform_fees ?? 0))}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums">
                      <span className={Number(order.net_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}>
                        {formatCurrency(Number(order.net_profit ?? 0))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={statusStyle.variant} className="text-[10px]">
                        {statusStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">{order.item_count ?? 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {formatDate(order.ordered_at, "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`View details for order ${orderLabel}`}
                        onClick={() => setDetailOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
          </div>
        </div>
      </ResultPendingShell>

      {totalCount > PAGE_SIZES[0] && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v: string | null) => {
                const ps = Number(v ?? 20);
                replaceQuery((n) => {
                  n.set("pageSize", String(ps));
                  n.set("page", "1");
                });
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage <= 1}
              onClick={() =>
                replaceQuery((n) => {
                  n.set("page", String(Math.max(1, safePage - 1)));
                })
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages}
              onClick={() =>
                replaceQuery((n) => {
                  n.set("page", String(Math.min(totalPages, safePage + 1)));
                })
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailSheet order={detailOrder} onDismiss={() => setDetailOrder(null)} />
    </div>
  );
}
