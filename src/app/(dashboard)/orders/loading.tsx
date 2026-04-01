import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { OrdersSkeleton } from "@/components/dashboard/page-skeleton";

export default function OrdersLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <OrdersSkeleton />
    </div>
  );
}
