"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { ChannelBadge } from "@/components/layout/channel-badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Platform } from "@/types";

interface Order {
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

interface OrdersTableProps {
  orders: Order[];
}

const PAGE_SIZES = [10, 20, 50, 100];

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  shipped: { variant: "secondary", label: "Shipped" },
  delivered: { variant: "secondary", label: "Delivered" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  refunded: { variant: "destructive", label: "Refunded" },
};

export function OrdersTable({ orders }: OrdersTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "all";
  const initialChannel = searchParams.get("channel") ?? "all";
  const highlightId = searchParams.get("order") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [channelFilter, setChannelFilter] = useState(initialChannel);

  const platforms = [...new Set(orders.map((o) => o.platform))];

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
    updateUrl({ search: value, status: statusFilter, channel: channelFilter });
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    updateUrl({ search, status: value, channel: channelFilter });
  }

  function handleChannelChange(value: string) {
    setChannelFilter(value);
    setPage(1);
    updateUrl({ search, status: statusFilter, channel: value });
  }

  function handleClearAll() {
    setSearch("");
    setStatusFilter("all");
    setChannelFilter("all");
    setPage(1);
    router.replace(pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (channelFilter !== "all") {
      result = result.filter((o) => o.platform === channelFilter);
    }
    if (search.length >= 1) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          (o.order_number && o.order_number.toLowerCase().includes(q)) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          String(o.total_amount ?? "").includes(q)
      );
    }
    return result;
  }, [orders, search, statusFilter, channelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const hasFilters = search.length > 0 || statusFilter !== "all" || channelFilter !== "all";

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
            placeholder="Search by order #, customer name..."
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
        <div className="flex items-center gap-2 flex-wrap">
          {platforms.length > 1 && (
            <Select value={channelFilter} onValueChange={(v: string | null) => handleChannelChange(v ?? "all")}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={(v: string | null) => handleStatusChange(v ?? "all")}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={handleClearAll}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""} · {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell text-right">Fees</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Profit</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Items</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {search ? `No orders matching "${search}"` : "No orders found"}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((order) => {
                const statusStyle = STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending;
                const isHighlighted = highlightId === order.id;
                return (
                  <TableRow key={order.id} className={isHighlighted ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
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
                      <Badge variant={statusStyle.variant} className="text-[10px]">{statusStyle.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">
                      {order.item_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {formatDate(order.ordered_at, "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > PAGE_SIZES[0] && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v: string | null) => { setPageSize(Number(v ?? 20)); setPage(1); }}>
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
