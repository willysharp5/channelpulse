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
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { Platform } from "@/types";
import type { ProductTableRow } from "@/lib/products-list";
import { cn } from "@/lib/utils";

type Props = {
  product: ProductTableRow | null;
  onDismiss: () => void;
};

export function ProductDetailSheet({ product, onDismiss }: Props) {
  const avgPrice =
    product && product.unitsSold > 0 ? product.revenue / product.unitsSold : null;

  return (
    <Sheet
      open={product != null}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      {product ? (
        <SheetContent
          side="right"
          showCloseButton
          className={cn("flex w-full flex-col gap-0 overflow-y-auto border-l bg-background p-0 sm:max-w-lg")}
        >
          <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
            <SheetTitle className="pr-10 text-xl font-semibold leading-snug tracking-tight">{product.title}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {product.sku ? `SKU: ${product.sku}` : "No SKU"} · {product.channelLabel}
            </SheetDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(product.revenue)}</span>
              <span className="text-sm text-muted-foreground">revenue (range)</span>
              <Badge
                variant={
                  product.status === "active" ? "secondary" : product.status === "draft" ? "outline" : "destructive"
                }
                className="text-xs capitalize"
              >
                {product.status ?? "—"}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
              {product.image_url ? (
                <img
                  src={product.image_url}
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
                  <span className="text-right font-medium">{product.channelLabel}</span>
                  {product.salesPlatform ? (
                    <ChannelBadge platform={product.salesPlatform as Platform} className="text-[10px]" />
                  ) : null}
                </div>
              </DetailRow>
              <DetailRow label="Units sold">{formatNumber(product.unitsSold)}</DetailRow>
              <DetailRow label="Revenue">{formatCurrency(product.revenue)}</DetailRow>
              {avgPrice != null ? (
                <DetailRow label="Avg. selling price">{formatCurrency(avgPrice)}</DetailRow>
              ) : null}
              <DetailRow label="COGS (per unit)">{formatCurrency(Number(product.cogs ?? 0))}</DetailRow>
              <DetailRow label="Category">{product.category ?? "—"}</DetailRow>
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
