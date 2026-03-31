"use client";

import { useState } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/layout/channel-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockProducts } from "@/lib/mock-data";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";

export default function ProductsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header title="Products" />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockProducts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(
                  mockProducts.reduce((s, p) => s + p.totalRevenue, 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {Math.round(
                  mockProducts.reduce((s, p) => s + p.profitMargin, 0) /
                    mockProducts.length
                )}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              All Products
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-[200px] pl-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const isPositive = product.trend >= 0;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {product.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {product.sku}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {product.channels.map((ch) => (
                            <ChannelBadge
                              key={ch}
                              platform={ch}
                              className="text-[10px] px-1.5 py-0"
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(product.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(product.totalUnitsSold)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(product.avgPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="tabular-nums">
                          {product.profitMargin}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isPositive ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatPercent(product.trend)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
