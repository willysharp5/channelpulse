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
  Check,
  Loader2,
  Download,
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
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { ImportedDataFilterBanner } from "@/components/layout/imported-data-filter-banner";
import type { Platform } from "@/types";
import type { ProductTableRow } from "@/lib/products-list";
import { BulkCogsSheet } from "@/components/products/bulk-cogs-sheet";
import { ProductDetailSheet } from "@/components/products/product-detail-sheet";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

const PAGE_SIZES = [10, 20, 50];

function normalizeProductsQuery(pathname: string, cur: URLSearchParams): string {
  const n = new URLSearchParams(cur.toString());
  if (!n.get("search")) n.delete("search");
  if (!n.get("page") || n.get("page") === "1") n.delete("page");
  if (!n.get("pageSize") || n.get("pageSize") === "10") n.delete("pageSize");
  if (!n.get("status") || n.get("status") === "all") n.delete("status");
  if (!n.get("channel") || n.get("channel") === "all") n.delete("channel");
  if (!n.get("source") || n.get("source") === "all") n.delete("source");
  const sort = n.get("sort");
  if (!sort || sort === "none") {
    n.delete("sort");
    n.delete("dir");
  } else if (n.get("dir") === "desc") {
    n.delete("dir");
  }
  const qs = n.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

interface ProductsTableProps {
  rows: ProductTableRow[];
  totalCount: number;
  /** Total rows used for pagination (may cap when sorting large catalogs). */
  pageableTotalCount: number;
  effectivePage: number;
  requestedPage: number;
  platformOptions: string[];
  sortTruncated: boolean;
  onCogsUpdate?: () => void;
}

export function ProductsTable({
  rows,
  totalCount,
  pageableTotalCount,
  effectivePage,
  requestedPage,
  platformOptions,
  sortTruncated,
  onCogsUpdate,
}: ProductsTableProps) {
  const isDemo = useDemo();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageFromUrl = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = parseInt(searchParams.get("pageSize") ?? "10", 10);
  const pageSize = PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : 10;
  const statusFilter = searchParams.get("status") ?? "all";
  const channelFromUrl = searchParams.get("channel") ?? "all";
  const sourceFromUrl = searchParams.get("source") ?? "all";
  useScrollToImportedTableWhenFiltered(sourceFromUrl);
  const sortRaw = searchParams.get("sort") ?? "none";
  const sortKey = sortRaw === "units" || sortRaw === "revenue" ? sortRaw : "none";
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const searchFromUrl = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(searchFromUrl);
  const [pendingChannel, setPendingChannel] = useState<string | null>(null);
  const channelFilter = pendingChannel ?? channelFromUrl;

  const [isFilterPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkCogsOpen, setBulkCogsOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ProductTableRow | null>(null);

  const rowIdsKey = useMemo(() => rows.map((r) => r.id).join(","), [rows]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [rowIdsKey]);

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
    normalizeProductsQuery,
    400,
    startTransition
  );
  useSyncEffectivePage(
    effectivePage,
    requestedPage,
    pathname,
    searchParams,
    router,
    normalizeProductsQuery,
    startTransition
  );

  const replaceQuery = useCallback(
    (mutate: (n: URLSearchParams) => void) => {
      const n = new URLSearchParams(searchParams.toString());
      mutate(n);
      startTransition(() => {
        router.replace(normalizeProductsQuery(pathname, n), { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const totalPages = Math.max(1, Math.ceil(pageableTotalCount / pageSize));
  const safePage = Math.min(pageFromUrl, totalPages);
  const hasFilters =
    searchFromUrl.length > 0 ||
    statusFilter !== "all" ||
    channelFilter !== "all" ||
    sourceFromUrl === "csv" ||
    sortKey !== "none";

  function toggleSort(key: "units" | "revenue") {
    replaceQuery((n) => {
      const current = n.get("sort");
      const currentDir = n.get("dir") === "asc" ? "asc" : "desc";
      if (current !== key) {
        n.set("sort", key);
        n.set("dir", "desc");
      } else {
        n.set("dir", currentDir === "desc" ? "asc" : "desc");
      }
      n.set("page", "1");
    });
  }

  function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
    if (!active) return <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground/70" />;
    return dir === "desc" ? (
      <ArrowDown className="h-3 w-3 shrink-0 text-muted-foreground" />
    ) : (
      <ArrowUp className="h-3 w-3 shrink-0 text-muted-foreground" />
    );
  }

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
      toast.message("Sign up to export your catalog", {
        description: "CSV export is available after you create an account.",
      });
      return;
    }
    const qs = searchParams.toString();
    window.location.assign(`/api/products/export${qs ? `?${qs}` : ""}`);
  }

  const allPageSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const somePageSelected = rows.some((r) => selectedIds.has(r.id));

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function toggleRowSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = selectedIds.size;
  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {sortTruncated ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Sorting uses the first 8,000 matching products. Narrow filters for full-list sort.
        </p>
      ) : null}
      <div
        className={cn(
          "min-w-0 max-w-full rounded-xl border border-border/80 bg-slate-50/90 p-4 shadow-sm transition-opacity duration-200",
          "dark:bg-muted/25",
          isFilterPending && "opacity-80"
        )}
      >
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-6 lg:gap-y-4">
          <div className="min-w-[min(100%,220px)] flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Product, SKU, category…"
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
                {platformOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-1.5 sm:w-[200px]">
            <Label
              className="text-xs font-medium text-muted-foreground"
              title="Imported from file = rows last touched by a product CSV import. All records = your whole catalog."
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

          <div className="flex flex-wrap gap-2 pb-0.5 lg:ml-auto">
            {hasFilters ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-9"
                onClick={() => {
                  setPendingChannel(null);
                  startTransition(() => router.replace(pathname, { scroll: false }));
                }}
              >
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

      <BulkCogsSheet
        open={bulkCogsOpen}
        onOpenChange={setBulkCogsOpen}
        productIds={selectedIdList}
        onApplied={() => {
          onCogsUpdate?.();
          setSelectedIds(new Set());
        }}
      />

      <ProductDetailSheet product={detailProduct} onDismiss={() => setDetailProduct(null)} />

      <ResultPendingShell pending={isFilterPending} className="min-w-0 space-y-5">
        <div className="min-w-0 rounded-xl border border-border/80 bg-background px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Matching products</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{totalCount}</p>
        </div>

        {selectedCount > 0 ? (
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/60 dark:bg-blue-950/35">
            <p className="text-sm font-medium text-foreground">
              {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  if (isDemo) {
                    toast.message("Sign up to edit COGS", {
                      description: "Bulk cost updates are available after you sign up.",
                    });
                    return;
                  }
                  setBulkCogsOpen(true);
                }}
              >
                Edit COGS
              </Button>
            </div>
          </div>
        ) : null}

        <div id={IMPORTED_DATA_TABLE_ID} className="min-w-0 max-w-full scroll-mt-20 md:scroll-mt-24">
          <div className="min-w-0 max-w-full overflow-hidden rounded-md border">
          {sourceFromUrl === "csv" ? (
            <ImportedDataFilterBanner
              entity="products"
              onShowAll={() =>
                replaceQuery((n) => {
                  n.delete("source");
                  n.set("page", "1");
                })
              }
            />
          ) : null}
          <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-9 min-w-0 px-1 pl-0">
                <div className="flex items-center justify-center py-1">
                  <TableCheckbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected && !allPageSelected}
                    ariaLabel="Select all on this page"
                    onToggle={toggleSelectAllPage}
                  />
                </div>
              </TableHead>
              <TableHead className="min-w-0 max-w-0 w-[30%] whitespace-normal">
                Product
              </TableHead>
              <TableHead className="hidden min-w-0 max-w-0 w-[9%] sm:table-cell">SKU</TableHead>
              <TableHead className="min-w-0 max-w-0 w-[14%] whitespace-normal">Channel</TableHead>
              <TableHead className="w-16 min-w-0 px-1 text-right">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-0.5 font-medium leading-tight text-foreground hover:opacity-90"
                    onClick={() => toggleSort("units")}
                  >
                    <span className="sm:hidden">Units</span>
                    <span className="hidden sm:inline">Units sold</span>
                    <SortIcon active={sortKey === "units"} dir={sortDir} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="w-[4.5rem] min-w-0 px-1 text-right sm:w-24">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium text-foreground hover:opacity-90"
                    onClick={() => toggleSort("revenue")}
                  >
                    Revenue
                    <SortIcon active={sortKey === "revenue"} dir={sortDir} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="hidden min-w-0 max-w-0 w-[12%] lg:table-cell whitespace-normal">
                Category
              </TableHead>
              <TableHead
                className="w-[7rem] min-w-[7rem] px-1 text-right sm:w-28"
                title="Cost of Goods Sold (COGS). Values in this column are editable — click a cell to change it."
              >
                <span className="inline-block whitespace-normal border-b border-dotted border-muted-foreground/50 pb-px leading-tight">
                  COGS
                </span>
              </TableHead>
              <TableHead className="w-[4.5rem] min-w-0 px-1 whitespace-normal">Status</TableHead>
              <TableHead className="w-9 min-w-0 px-0 text-center">
                <span className="sr-only">View</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {searchFromUrl ? `No products matching "${searchFromUrl}"` : "No products found"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                <TableRow
                  key={product.id}
                  className={cn(
                    isSelected && "bg-blue-50/50 dark:bg-blue-950/25"
                  )}
                >
                  <TableCell className="relative w-12 p-0 align-middle">
                    {isSelected ? (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm bg-blue-600"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex items-center justify-center py-2 pl-3 pr-1">
                      <TableCheckbox
                        checked={isSelected}
                        ariaLabel={`Select ${product.title}`}
                        onToggle={() => toggleRowSelected(product.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0 max-w-0 font-medium">
                    <div className="flex min-w-0 items-center gap-2">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded bg-muted" />
                      )}
                      <span className="min-w-0 truncate">{highlightMatch(product.title)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden min-w-0 max-w-0 font-mono text-xs text-muted-foreground sm:table-cell">
                    <span className="block truncate">{product.sku ? highlightMatch(product.sku) : "—"}</span>
                  </TableCell>
                  <TableCell className="min-w-0 max-w-0">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-xs text-muted-foreground">
                        {highlightMatch(product.channelLabel)}
                      </span>
                      {product.salesPlatform ? (
                        <ChannelBadge platform={product.salesPlatform as Platform} className="w-fit max-w-full text-[10px]" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-1 text-right tabular-nums text-xs sm:text-sm">
                    {formatNumber(product.unitsSold)}
                  </TableCell>
                  <TableCell className="px-1 text-right text-xs font-medium tabular-nums sm:text-sm">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                  <TableCell className="hidden min-w-0 max-w-0 text-muted-foreground lg:table-cell">
                    <span className="block truncate">
                      {product.category ? highlightMatch(product.category) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-1 text-right">
                    <EditableCogs
                      productId={product.id}
                      initialCogs={Number(product.cogs ?? 0)}
                      onSave={onCogsUpdate}
                    />
                  </TableCell>
                  <TableCell className="px-1">
                    <Badge
                      variant={
                        product.status === "active" ? "secondary" : product.status === "draft" ? "outline" : "destructive"
                      }
                      className="max-w-full truncate text-[10px]"
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-0 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`View details for ${product.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailProduct(product);
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
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}

function TableCheckbox({
  checked,
  indeterminate,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  const showCheck = checked && !indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked || indeterminate
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-muted-foreground/35 bg-background hover:border-blue-500/60"
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2.5 rounded-sm bg-white" aria-hidden />
      ) : showCheck ? (
        <Check className="h-2.5 w-2.5 stroke-[3]" />
      ) : null}
    </button>
  );
}

function EditableCogs({
  productId,
  initialCogs,
  onSave,
}: {
  productId: string;
  initialCogs: number;
  onSave?: () => void;
}) {
  const isDemo = useDemo();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initialCogs || ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayValue, setDisplayValue] = useState(initialCogs);

  useEffect(() => {
    setDisplayValue(initialCogs);
    if (!editing) setValue(String(initialCogs || ""));
  }, [initialCogs, editing]);

  async function handleSave() {
    if (isDemo) {
      toast.message("Sign up to edit COGS", {
        description: "Per-product costs are editable after you connect your stores.",
      });
      return;
    }
    const numValue = parseFloat(value) || 0;
    setSaving(true);
    try {
      const res = await fetch("/api/products/cogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, cogs: numValue }),
      });
      if (res.ok) {
        setDisplayValue(numValue);
        setEditing(false);
        setSaved(true);
        onSave?.();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <span className="text-muted-foreground text-xs">$</span>
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 w-[4.25rem] min-w-0 text-right text-xs tabular-nums sm:w-20"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-500" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isDemo) {
          toast.message("Sign up to edit COGS", {
            description: "Per-product costs are editable after you connect your stores.",
          });
          return;
        }
        setValue(String(displayValue || ""));
        setEditing(true);
      }}
      className="group max-w-full cursor-pointer rounded px-1 py-0.5 text-right transition-colors hover:bg-muted/50"
      title="Click to edit COGS (Cost of Goods Sold)"
    >
      <span
        className={`inline-block max-w-full truncate border-b border-dotted border-muted-foreground/45 pb-px tabular-nums transition-colors group-hover:border-muted-foreground/70 ${
          displayValue > 0 ? "" : "text-muted-foreground/50 italic"
        } ${saved ? "border-emerald-500/60 text-emerald-500" : ""}`}
      >
        {displayValue > 0 ? formatCurrency(displayValue) : "Set cost"}
      </span>
    </button>
  );
}
