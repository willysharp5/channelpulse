import { Header } from "@/components/layout/header";
import { ExportButton } from "@/components/export-button";
import { getSession } from "@/lib/auth/actions";
import {
  getProductsCatalogSummary,
  getProductsCogsTemplateRows,
  getProductsPage,
  parseProductsListParams,
} from "@/lib/products-list";
import { ProductsPageContent } from "@/components/products/products-page-content";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const listParams = parseProductsListParams(params);
  const [user, catalogSummary, cogsTemplate, pageData] = await Promise.all([
    getSession(),
    getProductsCatalogSummary(),
    getProductsCogsTemplateRows(),
    getProductsPage(listParams),
  ]);

  return (
    <>
      <Header title="Products" userEmail={user?.email ?? undefined} />
      <div className="flex items-center justify-end px-6 pt-4">
        <ExportButton endpoint="/api/export/products" label="Export Products" />
      </div>
      <ProductsPageContent
        catalogSummary={catalogSummary}
        cogsTemplate={cogsTemplate}
        pageData={pageData}
        requestedPage={listParams.page}
      />
    </>
  );
}
