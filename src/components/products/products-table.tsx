"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X, Check, Loader2, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv-export";
import { Input } from "@/components/ui/input";
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
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  title: string;
  sku: string | null;
  image_url: string | null;
  cogs: number | null;
  category: string | null;
  status: string | null;
}

interface ProductsTableProps {
  products: Product[];
  onCogsUpdate?: (productId: string, newCogs: number) => void;
}

const PAGE_SIZES = [10, 20, 50];

export function ProductsTable({ products, onCogsUpdate }: ProductsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "all";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);

  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v && v !== "all" && v !== "1") sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname]
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    updateUrl({ search: value, status: statusFilter, page: "1" });
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    updateUrl({ search, status: value, page: "1" });
  }

  function handleClearAll() {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
    router.replace(pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    let result = products;
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search.length >= 1) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const hasFilters = search.length > 0 || statusFilter !== "all";

  function highlightMatch(text: string): React.ReactNode {
    if (!search || search.length < 1) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-200 dark:bg-amber-800 text-inherit rounded-sm px-0.5">
          {text.slice(idx, idx + search.length)}
        </mark>
        {text.slice(idx + search.length)}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU, category..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 pr-8 h-9"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v: string | null) => handleStatusChange(v ?? "all")}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={handleClearAll}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1"
            onClick={() => {
              downloadCSV(
                `channelpulse-products-${new Date().toISOString().split("T")[0]}.csv`,
                ["Product", "SKU", "Category", "COGS", "Status"],
                filtered.map((p) => [
                  p.title, p.sku ?? "", p.category ?? "",
                  String(Number(p.cogs ?? 0).toFixed(2)), p.status ?? "",
                ])
              );
            }}
          >
            <Download className="h-3 w-3" /> Export
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <span className="flex items-center justify-end gap-1">
                  COGS
                  <span className="text-[10px] text-muted-foreground font-normal">(Cost of Goods)</span>
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? `No products matching "${search}"` : "No products found"}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium max-w-[250px]">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex-shrink-0" />
                      )}
                      <span className="truncate">{highlightMatch(product.title)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {product.sku ? highlightMatch(product.sku) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category ? highlightMatch(product.category) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCogs productId={product.id} initialCogs={Number(product.cogs ?? 0)} onSave={onCogsUpdate} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === "active" ? "secondary" : product.status === "draft" ? "outline" : "destructive"}
                      className="text-[10px]"
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > PAGE_SIZES[0] && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v: string | null) => { setPageSize(Number(v ?? 10)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableCogs({ productId, initialCogs, onSave }: { productId: string; initialCogs: number; onSave?: (productId: string, newCogs: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initialCogs || ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayValue, setDisplayValue] = useState(initialCogs);

  async function handleSave() {
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
        onSave?.(productId, numValue);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <span className="text-muted-foreground text-xs">$</span>
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          className="h-7 w-20 text-right text-xs tabular-nums"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-500" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(String(displayValue || "")); setEditing(true); }}
      className={`tabular-nums text-right w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors ${
        displayValue > 0 ? "" : "text-muted-foreground/50 italic"
      } ${saved ? "text-emerald-500" : ""}`}
      title="Click to edit COGS (Cost of Goods Sold)"
    >
      {displayValue > 0 ? formatCurrency(displayValue) : "Set cost"}
    </button>
  );
}
