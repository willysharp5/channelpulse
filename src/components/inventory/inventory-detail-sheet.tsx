"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { formatDate, formatNumber } from "@/lib/formatters";
import type { Platform } from "@/types";
import type { InventoryRow } from "@/lib/inventory-list";
import { cn } from "@/lib/utils";

type Props = {
  row: InventoryRow | null;
  onDismiss: () => void;
  criticalThreshold?: number;
  lowThreshold?: number;
};

function stockLevelStyle(qty: number, critical: number, low: number): { label: string; className: string } {
  if (qty > low) return { label: "Healthy", className: "text-emerald-600 dark:text-emerald-400" };
  if (qty > critical) return { label: "Low", className: "text-amber-600 dark:text-amber-400" };
  return { label: "Critical", className: "text-red-600 dark:text-red-400" };
}

export function InventoryDetailSheet({ row, onDismiss, criticalThreshold = 5, lowThreshold = 20 }: Props) {
  const level = row ? stockLevelStyle(row.inventory_quantity, criticalThreshold, lowThreshold) : null;

  return (
    <Sheet
      open={row != null}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      {row && level ? (
        <SheetContent
          side="right"
          showCloseButton
          className={cn("flex w-full flex-col gap-0 overflow-y-auto border-l bg-background p-0 sm:max-w-lg")}
        >
          <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
            <SheetTitle className="pr-10 text-xl font-semibold leading-snug tracking-tight">{row.title}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {row.sku ? `SKU: ${row.sku}` : "No SKU"} · {row.channelName}
            </SheetDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-lg font-semibold tabular-nums">{formatNumber(row.inventory_quantity)}</span>
              <span className="text-sm text-muted-foreground">units in stock</span>
              <span className={cn("text-sm font-semibold", level.className)}>{level.label}</span>
              <Badge
                variant={
                  row.status === "active" ? "secondary" : row.status === "draft" ? "outline" : "destructive"
                }
                className="text-xs capitalize"
              >
                {row.status ?? "—"}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt=""
                  className="mx-auto max-h-[min(360px,50vh)] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                  No image
                </div>
              )}
            </div>

            <dl className="grid gap-4 text-sm">
              <DetailRow label="Channel">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-right font-medium">{row.channelName}</span>
                  {row.platform && row.platform !== "—" ? (
                    <ChannelBadge platform={row.platform as Platform} className="text-[10px]" />
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="On hand">{formatNumber(row.inventory_quantity)}</DetailRow>
              {row.reorder_point != null ? (
                <DetailRow label="Reorder point">{formatNumber(row.reorder_point)}</DetailRow>
              ) : null}
              <DetailRow label="Last inventory update">
                {row.updatedAt ? formatDate(row.updatedAt, "MMM d, yyyy, h:mm a") : "—"}
              </DetailRow>
            </dl>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/80 py-3 last:border-0">
      <dt className="shrink-0 font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}
