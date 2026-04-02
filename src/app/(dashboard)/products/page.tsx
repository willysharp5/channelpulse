import { Header } from "@/components/layout/header";
import { getProductsWithSales } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { ProductsPageContent } from "@/components/products/products-page-content";
import { rangeToDays } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const dateParams = { days: rangeToDays(params.range ?? null) };
  const [user, products] = await Promise.all([getSession(), getProductsWithSales(dateParams)]);

  return (
    <>
      <Header title="Products" userEmail={user?.email ?? undefined} />
      <ProductsPageContent initialProducts={products} />
    </>
  );
}
