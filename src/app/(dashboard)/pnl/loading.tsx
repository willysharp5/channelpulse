import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { PnLSkeleton } from "@/components/dashboard/page-skeleton";

export default function PnLLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <PnLSkeleton />
    </div>
  );
}
