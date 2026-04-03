import { Header } from "@/components/layout/header";
import { ExportButton } from "@/components/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/actions";
import { getInventoryPage, parseInventoryListParams } from "@/lib/inventory-list";
import { InventoryTable } from "@/components/inventory/inventory-table";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseInventoryListParams(sp);
  const lastRefreshAt = new Date().toISOString();
  const [user, data] = await Promise.all([getSession(), getInventoryPage(params)]);

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
            <InventoryTable
              rows={data.rows}
              totalCount={data.totalCount}
              histogram={data.histogram}
              platformOptions={data.platformOptions}
              effectivePage={data.effectivePage}
              requestedPage={params.page}
              lastRefreshAt={lastRefreshAt}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
