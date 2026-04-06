import { Suspense } from "react";
import { CronDashboardClient } from "@/components/admin/cron-dashboard-client";

export const dynamic = "force-dynamic";

export default function AdminCronPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sync &amp; Cron Jobs</h1>
        <p className="text-muted-foreground">
          Monitor automated channel syncs, view recent sync history, and control the cron scheduler.
        </p>
      </div>
      <Suspense
        fallback={<div className="min-h-[280px] animate-pulse rounded-lg bg-muted/30" aria-hidden />}
      >
        <CronDashboardClient />
      </Suspense>
    </div>
  );
}
