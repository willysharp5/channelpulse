import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
      <Skeleton className="h-6 w-6 rounded animate-shimmer" />
      <Skeleton className="h-1 w-px bg-border" />
      <Skeleton className="h-4 w-24 rounded animate-shimmer" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="h-8 w-[200px] rounded-md animate-shimmer hidden md:block" />
        <Skeleton className="h-8 w-28 rounded-md animate-shimmer" />
        <Skeleton className="h-8 w-8 rounded-md animate-shimmer" />
        <Skeleton className="h-8 w-8 rounded-md animate-shimmer" />
        <Skeleton className="h-8 w-8 rounded-full animate-shimmer" />
      </div>
    </div>
  );
}
