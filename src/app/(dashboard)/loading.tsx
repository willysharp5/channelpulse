import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { OverviewSkeleton } from "@/components/dashboard/page-skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <OverviewSkeleton />
    </div>
  );
}
