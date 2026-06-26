import { Skeleton } from "@/shared/components/ui/skeleton"

export function MediaCardSkeleton() {
  return (
    <div className="group relative">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
        <Skeleton className="absolute inset-0 h-full w-full" />
      </div>

      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function MediaCardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  )
}
