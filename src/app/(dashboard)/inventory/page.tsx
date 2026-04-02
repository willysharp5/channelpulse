import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/actions";
import { getInventoryRows } from "@/lib/queries";
import { InventoryTable } from "@/components/inventory/inventory-table";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [user, rows] = await Promise.all([getSession(), getInventoryRows()]);

  return (
    <>
      <Header title="Inventory" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Stock levels</h2>
          <p className="text-sm text-muted-foreground">
            Read-only view from your connected stores. Green &gt; 20, yellow 5–20, red &lt; 5 units.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Catalog inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
