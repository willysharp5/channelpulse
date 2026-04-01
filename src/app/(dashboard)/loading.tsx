import { OverviewSkeleton } from "@/components/dashboard/page-skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
        <div className="h-6 w-6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
      <OverviewSkeleton />
    </div>
  );
}
