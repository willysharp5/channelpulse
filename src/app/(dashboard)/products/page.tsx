import { Header } from "@/components/layout/header";
import { getProducts } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { ProductsPageContent } from "@/components/products/products-page-content";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [user, products] = await Promise.all([getSession(), getProducts()]);

  return (
    <>
      <Header title="Products" userEmail={user?.email ?? undefined} />
      <ProductsPageContent initialProducts={products} />
    </>
  );
}
