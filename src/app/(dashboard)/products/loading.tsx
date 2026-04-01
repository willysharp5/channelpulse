import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { ProductsSkeleton } from "@/components/dashboard/page-skeleton";

export default function ProductsLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <ProductsSkeleton />
    </div>
  );
}
