"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ChannelBadge } from "@/components/layout/channel-badge";
import { mockOrders } from "@/lib/mock-data";
import { formatCurrency, formatRelativeDate } from "@/lib/formatters";
import Link from "next/link";

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  pending: { variant: "outline", label: "Pending" },
  paid: { variant: "default", label: "Paid" },
  shipped: { variant: "secondary", label: "Shipped" },
  delivered: { variant: "secondary", label: "Delivered" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  refunded: { variant: "destructive", label: "Refunded" },
};

export function RecentOrders() {
  const recentOrders = mockOrders.slice(0, 8);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Orders
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs gap-1" render={<Link href="/orders" />}>
          View All <ArrowRight className="h-3 w-3" />
        </Button>
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
              <TableHead className="hidden lg:table-cell text-right">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map((order) => {
              const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium tabular-nums">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <ChannelBadge
                      platform={order.platform}
                      className="text-[10px] px-1.5 py-0"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {order.customerName}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={statusStyle.variant} className="text-[10px]">
                      {statusStyle.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-muted-foreground text-xs">
                    {formatRelativeDate(order.orderedAt)}
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
