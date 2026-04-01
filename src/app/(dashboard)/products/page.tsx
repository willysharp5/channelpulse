import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getProducts } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [user, products] = await Promise.all([
    getSession(),
    getProducts(),
  ]);

  const totalProducts = products.length;
  const totalCogs = products.reduce((s, p) => s + Number(p.cogs ?? 0), 0);

  return (
    <>
      <Header title="Products" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter((p) => p.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total COGS Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(totalCogs)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">All Products</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Products will appear once you connect a channel and sync data.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {product.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {product.sku ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(product.cogs ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.status === "active" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
