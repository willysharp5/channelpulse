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
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import type { Platform } from "@/types";
import type { OrderListRow } from "@/lib/orders-list";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  shipped: { variant: "secondary", label: "Shipped" },
  delivered: { variant: "secondary", label: "Delivered" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  refunded: { variant: "destructive", label: "Refunded" },
};

type Props = {
  order: OrderListRow | null;
  onDismiss: () => void;
};

function money(order: OrderListRow, value: number | null | undefined): string {
  if (value == null) return "—";
  return formatCurrency(Number(value), order.currency ?? "USD");
}

export function OrderDetailSheet({ order, onDismiss }: Props) {
  return (
    <Sheet
      open={order != null}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      {order ? (
        <SheetContent
          side="right"
          showCloseButton
          className={cn("flex w-full flex-col gap-0 overflow-y-auto border-l bg-background p-0 sm:max-w-lg")}
        >
          <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
            <SheetTitle className="pr-10 text-xl font-semibold leading-snug tracking-tight">
              Order {order.order_number ?? order.id.slice(0, 8)}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {order.customer_name ?? "No customer name"} · {formatDate(order.ordered_at, "MMM d, yyyy · h:mm a")}
            </SheetDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-lg font-semibold tabular-nums">{money(order, order.total_amount)}</span>
              <span className="text-sm text-muted-foreground">total</span>
              <Badge
                variant={(STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending).variant}
                className="text-xs capitalize"
              >
                {(STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending).label}
              </Badge>
            </div>
          </SheetHeader>

          <div className="px-6 py-6">
            <dl className="grid gap-4 text-sm">
              <DetailRow label="Line items">{formatNumber(order.item_count ?? 0)}</DetailRow>
              <DetailRow label="Channel">
                <ChannelBadge platform={order.platform as Platform} className="text-[10px]" />
              </DetailRow>
              <DetailRow label="Order ID">
                <span className="font-mono text-xs">{order.id}</span>
              </DetailRow>
              <DetailRow label="Customer">{order.customer_name ?? "—"}</DetailRow>
              <DetailRow label="Financial status">
                {order.financial_status ? (
                  <span className="capitalize">{order.financial_status.replace(/_/g, " ")}</span>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Subtotal">{money(order, order.subtotal)}</DetailRow>
              <DetailRow label="Tax">{money(order, order.total_tax)}</DetailRow>
              <DetailRow label="Shipping">{money(order, order.total_shipping)}</DetailRow>
              <DetailRow label="Platform fees">{money(order, order.platform_fees)}</DetailRow>
              <DetailRow label="Net profit">
                <span className={Number(order.net_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}>
                  {money(order, order.net_profit)}
                </span>
              </DetailRow>
              <DetailRow label="Currency">{order.currency ?? "—"}</DetailRow>
              <DetailRow label="Ordered at">{formatDate(order.ordered_at, "MMM d, yyyy · h:mm a")}</DetailRow>
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
