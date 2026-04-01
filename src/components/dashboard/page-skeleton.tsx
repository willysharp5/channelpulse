import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function KPISkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24 animate-shimmer" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 animate-shimmer" />
            <Skeleton className="h-3 w-20 mt-2 animate-shimmer" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40 animate-shimmer" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] sm:h-[300px] w-full rounded-lg animate-shimmer" />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-32 animate-shimmer" />
        <Skeleton className="h-8 w-20 animate-shimmer" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-9 w-full max-w-sm animate-shimmer" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 w-full animate-shimmer"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24 animate-shimmer" />
          <Skeleton className="h-8 w-32 animate-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <KPISkeletons />
      <ChartSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <TableSkeleton rows={5} />
      </div>
      <TableSkeleton />
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <KPISkeletons />
      <TableSkeleton rows={10} />
    </div>
  );
}

export function ProductsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 animate-shimmer" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 animate-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}

export function ChannelsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48 animate-shimmer" />
          <Skeleton className="h-4 w-64 mt-2 animate-shimmer" />
        </div>
        <Skeleton className="h-9 w-36 animate-shimmer" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg animate-shimmer" />
                <div>
                  <Skeleton className="h-5 w-32 animate-shimmer" />
                  <Skeleton className="h-4 w-20 mt-1 animate-shimmer" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="text-center">
                    <Skeleton className="h-6 w-16 mx-auto animate-shimmer" />
                    <Skeleton className="h-3 w-12 mx-auto mt-1 animate-shimmer" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function RevenueSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <KPISkeletons />
      <ChartSkeleton />
      <TableSkeleton rows={4} />
    </div>
  );
}

export function PnLSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 animate-shimmer" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 animate-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56 animate-shimmer" />
        </CardHeader>
        <CardContent className="space-y-3 max-w-2xl">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-6 w-full animate-shimmer"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
