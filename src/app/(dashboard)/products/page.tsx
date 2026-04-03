import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth/actions";
import {
  getProductsCatalogSummary,
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
  const [user, catalogSummary, pageData] = await Promise.all([
    getSession(),
    getProductsCatalogSummary(),
    getProductsPage(listParams),
  ]);

  return (
    <>
      <Header title="Products" userEmail={user?.email ?? undefined} />
      <ProductsPageContent
        catalogSummary={catalogSummary}
        pageData={pageData}
        requestedPage={listParams.page}
      />
    </>
  );
}
