import { Skeleton } from '@/shared/components/ui/skeleton';

export function MediaCardSkeleton() {
  return (
    <div className="group relative">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
        <Skeleton className="absolute inset-0 h-full w-full" />
      </div>

      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function MediaCardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MediaListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border/50"
        >
          <Skeleton className="flex-shrink-0 w-10 h-14 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="flex-shrink-0 h-5 w-20 rounded-full" />
          <Skeleton className="flex-shrink-0 h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
