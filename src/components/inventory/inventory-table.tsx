"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv-export";
import { formatDate } from "@/lib/formatters";
import { ChannelBadge } from "@/components/layout/channel-badge";
import type { Platform } from "@/types";

export interface InventoryRow {
  id: string;
  title: string;
  sku: string | null;
  inventory_quantity: number;
  platform: string;
  channelName: string;
  status: string | null;
  updatedAt?: string | null;
}

function stockStyle(qty: number): { label: string; className: string } {
  if (qty > 20) return { label: "Healthy", className: "text-emerald-600 dark:text-emerald-400 font-medium" };
  if (qty >= 5) return { label: "Low", className: "text-amber-600 dark:text-amber-400 font-medium" };
  return { label: "Critical", className: "text-red-600 dark:text-red-400 font-medium" };
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const platforms = useMemo(
    () => [...new Set(rows.map((r) => r.platform).filter(Boolean))],
    [rows]
  );

  const filtered = useMemo(() => {
    if (platformFilter === "all") return rows;
    return rows.filter((r) => r.platform === platformFilter);
  }, [rows, platformFilter]);

  function exportCsv() {
    downloadCSV(
      `channelpulse-inventory-${new Date().toISOString().split("T")[0]}.csv`,
      ["Product", "SKU", "Stock", "Status", "Channel", "Platform", "Last updated"],
      filtered.map((r) => [
        r.title,
        r.sku ?? "",
        String(r.inventory_quantity),
        stockStyle(r.inventory_quantity).label,
        r.channelName,
        r.platform,
        r.updatedAt ? formatDate(r.updatedAt, "yyyy-MM-dd HH:mm") : "",
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Channel:</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No inventory rows yet. Run a Shopify sync to pull product stock.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const st = stockStyle(r.inventory_quantity);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium max-w-[240px] truncate">{r.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.sku ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.inventory_quantity}</TableCell>
                    <TableCell className={st.className}>{st.label}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{r.channelName}</span>
                        {r.platform && r.platform !== "—" ? (
                          <ChannelBadge platform={r.platform as Platform} className="w-fit text-[10px]" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.updatedAt ? formatDate(r.updatedAt, "MMM d, h:mm a") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
