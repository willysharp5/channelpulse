import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { RevenueSkeleton } from "@/components/dashboard/page-skeleton";

export default function RevenueLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <RevenueSkeleton />
    </div>
  );
}
