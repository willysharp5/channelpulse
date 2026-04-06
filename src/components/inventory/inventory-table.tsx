"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useDebouncedUrlSearch, useSyncEffectivePage } from "@/hooks/use-debounced-url-search";
import { IMPORTED_DATA_TABLE_ID, useScrollToImportedTableWhenFiltered } from "@/hooks/use-scroll-to-imported-table";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Eye,
} from "lucide-react";
import { ResultPendingShell } from "@/components/ui/result-pending-shell";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/formatters";
import { ChannelBadge } from "@/components/layout/channel-badge";
import type { Platform } from "@/types";
import { cn } from "@/lib/utils";
import { StockDistributionSlider } from "@/components/inventory/stock-distribution-slider";
import { InventoryDetailSheet } from "@/components/inventory/inventory-detail-sheet";
import type { InventoryRow } from "@/lib/inventory-list";
import { TableDateRangeFilter } from "@/components/layout/table-date-range-filter";
import { ImportedDataFilterBanner } from "@/components/layout/imported-data-filter-banner";
import { isTableDateRangeActive, parseTableDateRangeSearchParams } from "@/lib/table-date-range";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

export type { InventoryRow } from "@/lib/inventory-list";

type StockMode = "all" | "critical" | "low" | "healthy" | "range";

const PAGE_SIZES = [10, 20, 50];

function stockStyle(qty: number): { label: string; className: string } {
  if (qty > 20) return { label: "Healthy", className: "text-emerald-600 dark:text-emerald-400 font-medium" };
  if (qty >= 5) return { label: "Low", className: "text-amber-600 dark:text-amber-400 font-medium" };
  return { label: "Critical", className: "text-red-600 dark:text-red-400 font-medium" };
}

function stockTriggerLabel(mode: StockMode, rangeMin: number, rangeMax: number): string {
  switch (mode) {
    case "all":
      return "All stock levels";
    case "critical":
      return "Critical (<5)";
    case "low":
      return "Low (5–20)";
    case "healthy":
      return "Healthy (>20)";
    case "range":
      return `${rangeMin} – ${rangeMax} units`;
    default:
      return "Stock level";
  }
}

function normalizeQuery(pathname: string, cur: URLSearchParams): string {
  const n = new URLSearchParams(cur.toString());
  if (!n.get("search")) n.delete("search");
  if (!n.get("page") || n.get("page") === "1") n.delete("page");
  if (!n.get("pageSize") || n.get("pageSize") === "10") n.delete("pageSize");
  if (!n.get("range")) n.delete("range");
  if (!n.get("date") || n.get("date") === "all") n.delete("date");
  if (!n.get("from")) n.delete("from");
  if (!n.get("to")) n.delete("to");
  if (!n.get("channel") || n.get("channel") === "all") n.delete("channel");
  if (!n.get("source") || n.get("source") === "all") n.delete("source");
  const st = n.get("stock");
  if (!st || st === "all") {
    n.delete("stock");
    n.delete("smin");
    n.delete("smax");
  } else if (st !== "range") {
    n.delete("smin");
    n.delete("smax");
  }
  const qs = n.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

interface InventoryTableProps {
  rows: InventoryRow[];
  totalCount: number;
  histogram: { domainMax: number; counts: number[] };
  platformOptions: string[];
  effectivePage: number;
  requestedPage: number;
  lastRefreshAt?: string;
}

export function InventoryTable({
  rows,
  totalCount,
  histogram,
  platformOptions,
  effectivePage,
  requestedPage,
  lastRefreshAt,
}: InventoryTableProps) {
  const isDemo = useDemo();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(searchParams.get("pageSize") ?? "10", 10);
  const pageSize = PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : 10;
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
  const rawStock = searchParams.get("stock") ?? "all";
  const stockMode: StockMode = ["all", "critical", "low", "healthy", "range"].includes(rawStock)
    ? (rawStock as StockMode)
    : "all";
  const smin = parseInt(searchParams.get("smin") ?? "0", 10) || 0;
  const smax = parseInt(searchParams.get("smax") ?? "0", 10) || 0;

  const searchFromUrl = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(searchFromUrl);

  const [pendingChannel, setPendingChannel] = useState<string | null>(null);
  const platformFilter = pendingChannel ?? channelFromUrl;

  const [stockPopoverOpen, setStockPopoverOpen] = useState(false);
  const [draftMin, setDraftMin] = useState("0");
  const [draftMax, setDraftMax] = useState(String(histogram.domainMax));

  const [isFilterPending, startTransition] = useTransition();
  const [detailRow, setDetailRow] = useState<InventoryRow | null>(null);

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
    normalizeQuery,
    400,
    startTransition
  );
  useSyncEffectivePage(
    effectivePage,
    requestedPage,
    pathname,
    searchParams,
    router,
    normalizeQuery,
    startTransition
  );

  const replaceQuery = useCallback(
    (mutate: (n: URLSearchParams) => void) => {
      const n = new URLSearchParams(searchParams.toString());
      mutate(n);
      startTransition(() => {
        router.replace(normalizeQuery(pathname, n), { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const rangeMin = stockMode === "range" ? smin : 0;
  const rangeMax = stockMode === "range" && smax > 0 ? smax : histogram.domainMax;

  const histDomainMax = useMemo(
    () => Math.max(1, histogram.domainMax, rangeMin, rangeMax),
    [histogram.domainMax, rangeMin, rangeMax]
  );

  const histCounts = histogram.counts;

  const sliderAxisMin = stockMode === "range" ? rangeMin : 0;
  const sliderAxisMax = stockMode === "range" ? rangeMax : histDomainMax;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(pageFromUrl, totalPages);

  const hasFilters =
    searchFromUrl.length > 0 ||
    isTableDateRangeActive(tableDateParams) ||
    platformFilter !== "all" ||
    sourceFromUrl === "csv" ||
    stockMode !== "all";

  function exportCsv() {
    if (isDemo) {
      toast.message("Sign up to export inventory", {
        description: "CSV export is available after you create an account.",
      });
      return;
    }
    const qs = searchParams.toString();
    window.location.assign(`/api/inventory/export${qs ? `?${qs}` : ""}`);
  }

  const setRangeFromSlider = useCallback(
    (lo: number, hi: number) => {
      replaceQuery((n) => {
        n.set("stock", "range");
        n.set("smin", String(lo));
        n.set("smax", String(hi));
        n.set("page", "1");
      });
    },
    [replaceQuery]
  );

  const onSliderLiveChange = useCallback((lo: number, hi: number) => {
    setDraftMin(String(lo));
    setDraftMax(String(hi));
  }, []);

  function handleReset() {
    setPendingChannel(null);
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  function applyStockPreset(mode: StockMode, r?: { min: number; max: number }) {
    replaceQuery((n) => {
      n.set("page", "1");
      if (mode === "range" && r) {
        n.set("stock", "range");
        n.set("smin", String(r.min));
        n.set("smax", String(r.max));
      } else {
        n.set("stock", mode);
        n.delete("smin");
        n.delete("smax");
      }
    });
    setStockPopoverOpen(false);
  }

  function applyCustomRange() {
    let lo = parseInt(draftMin, 10);
    let hi = parseInt(draftMax, 10);
    if (Number.isNaN(lo)) lo = 0;
    if (Number.isNaN(hi)) hi = histogram.domainMax;
    if (lo > hi) [lo, hi] = [hi, lo];
    lo = Math.max(0, lo);
    hi = Math.max(lo, hi);
    setRangeFromSlider(lo, hi);
    setStockPopoverOpen(false);
  }

  const refreshLabel = lastRefreshAt ? formatDate(lastRefreshAt, "dd/MM/yyyy, HH:mm") : null;

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

  return (
    <div className="space-y-5">
      {refreshLabel ? (
        <p className="text-xs text-muted-foreground">Last refresh: {refreshLabel}</p>
      ) : null}

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
                placeholder="Product, SKU, channel…"
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

          <TableDateRangeFilter
            label="Updated"
            searchParams={searchParams}
            replaceQuery={replaceQuery}
            allowAllTime
          />

          <div className="space-y-1.5 w-full sm:w-[160px]">
            <Label className="text-xs font-medium text-muted-foreground">Channel</Label>
            <Select
              value={platformFilter}
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
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-1.5 sm:w-[200px]">
            <Label
              className="text-xs font-medium text-muted-foreground"
              title="Imported from file = rows last touched by an inventory CSV import. All records = full catalog."
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

          <div className="space-y-1.5 w-full sm:w-[200px]">
            <Label className="text-xs font-medium text-muted-foreground">Stock level</Label>
            <Popover
              open={stockPopoverOpen}
              onOpenChange={(open) => {
                setStockPopoverOpen(open);
                if (open) {
                  setDraftMin(String(rangeMin));
                  setDraftMax(String(stockMode === "range" && smax > 0 ? smax : histogram.domainMax));
                }
              }}
            >
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-between gap-2 rounded-lg border-input bg-background px-3 font-normal shadow-none"
                  />
                }
              >
                <span className="truncate text-left">{stockTriggerLabel(stockMode, rangeMin, rangeMax)}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className="w-[min(100vw-2rem,320px)] gap-3 p-3" align="start">
                <StockDistributionSlider
                  key={`${channelFromUrl}-${tableDateParams.range ?? ""}-${tableDateParams.dateFrom ?? ""}-${tableDateParams.dateTo ?? ""}`}
                  histogramCounts={histCounts}
                  domainMax={histDomainMax}
                  min={sliderAxisMin}
                  max={sliderAxisMax}
                  onLiveChange={onSliderLiveChange}
                  onCommit={setRangeFromSlider}
                  isUpdating={isFilterPending && stockPopoverOpen}
                />
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["all", "All"],
                      ["critical", "Critical"],
                      ["low", "Low"],
                      ["healthy", "Healthy"],
                    ] as const
                  ).map(([mode, label]) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={stockMode === mode ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => applyStockPreset(mode as StockMode)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2 border-t border-border pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Custom range (units)</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="h-8 bg-background"
                      value={draftMin}
                      onChange={(e) => setDraftMin(e.target.value)}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 bg-background"
                      value={draftMax}
                      onChange={(e) => setDraftMax(e.target.value)}
                    />
                  </div>
                  <Button type="button" size="sm" className="w-full" onClick={applyCustomRange}>
                    Apply range
                  </Button>
                  <p className="text-[11px] text-muted-foreground">Popular ranges</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => applyStockPreset("range", { min: 0, max: 4 })}
                    >
                      0 – 4
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => applyStockPreset("range", { min: 5, max: 20 })}
                    >
                      5 – 20
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const lo = 21;
                        const hi = Math.max(lo, histogram.domainMax);
                        applyStockPreset("range", { min: lo, max: hi });
                      }}
                    >
                      21+
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pb-0.5 lg:ml-auto">
            {hasFilters ? (
              <Button variant="secondary" size="sm" className="h-9" onClick={handleReset}>
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

      <InventoryDetailSheet row={detailRow} onDismiss={() => setDetailRow(null)} />

      <ResultPendingShell pending={isFilterPending} className="space-y-5">
        <div className="rounded-xl border border-border/80 bg-background px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Matching SKUs</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{totalCount}</p>
        </div>

        <div id={IMPORTED_DATA_TABLE_ID} className="scroll-mt-20 md:scroll-mt-24">
          <div className="overflow-hidden rounded-md border">
          {sourceFromUrl === "csv" ? (
            <ImportedDataFilterBanner
              entity="inventory"
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
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-9 min-w-0 px-0 text-center">
                  <span className="sr-only">View</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No rows match your filters. Try clearing search or widening the stock range.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const st = stockStyle(r.inventory_quantity);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium max-w-[240px] truncate">
                        {highlightMatch(r.title)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.sku ? highlightMatch(r.sku) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.inventory_quantity}</TableCell>
                      <TableCell className={st.className}>{st.label}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{highlightMatch(r.channelName)}</span>
                          {r.platform && r.platform !== "—" ? (
                            <ChannelBadge platform={r.platform as Platform} className="w-fit text-[10px]" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.updatedAt ? formatDate(r.updatedAt, "MMM d, h:mm a") : "—"}
                      </TableCell>
                      <TableCell className="px-0 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`View details for ${r.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailRow(r);
                          }}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v: string | null) => {
                const ps = Number(v ?? 10);
                replaceQuery((n) => {
                  n.set("pageSize", String(ps));
                  n.set("page", "1");
                });
              }}
            >
              <SelectTrigger className="h-8 w-[72px]">
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
    </div>
  );
}
