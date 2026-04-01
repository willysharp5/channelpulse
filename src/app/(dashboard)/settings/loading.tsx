import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <Skeleton className="h-10 w-80 animate-shimmer" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40 animate-shimmer" />
            <Skeleton className="h-4 w-60 mt-1 animate-shimmer" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
