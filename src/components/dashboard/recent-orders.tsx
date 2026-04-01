"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChannelBadge } from "@/components/layout/channel-badge";
import { formatCurrency, formatRelativeDate } from "@/lib/formatters";
import Link from "next/link";
import type { Platform } from "@/types";

const STATUS_STYLES: Record<
  string,
  { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  shipped: { variant: "secondary", label: "Shipped" },
  delivered: { variant: "secondary", label: "Delivered" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  refunded: { variant: "destructive", label: "Refunded" },
};

interface RecentOrdersProps {
  orders: Array<{
    id: string;
    platform: string;
    order_number: string | null;
    status: string | null;
    customer_name: string | null;
    total_amount: number | null;
    ordered_at: string;
  }>;
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusStyle =
                STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending;
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium tabular-nums">
                    {order.order_number ?? order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <ChannelBadge
                      platform={order.platform as Platform}
                      className="text-[10px] px-1.5 py-0"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {order.customer_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(Number(order.total_amount ?? 0))}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={statusStyle.variant} className="text-[10px]">
                      {statusStyle.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground text-xs">
                    {formatRelativeDate(order.ordered_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
