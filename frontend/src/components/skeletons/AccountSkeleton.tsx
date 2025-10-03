import { SkeletonCard, Skeleton } from "./Skeleton";

export function AccountInfoSkeleton() {
  return (
    <SkeletonCard>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <div className="space-y-3">
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-2/3" />
          </div>
          <div>
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div>
            <Skeleton className="h-3 w-14 mb-1" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <div>
            <Skeleton className="h-3 w-18 mb-1" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

export function SessionInfoSkeleton() {
  return (
    <SkeletonCard>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2 mb-4" />
        <div className="space-y-3">
          <div>
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-5 w-full" />
          </div>
          <div>
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

export function AppInfoSkeleton() {
  return (
    <SkeletonCard>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <div className="space-y-3">
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <div>
            <Skeleton className="h-3 w-14 mb-1" />
            <Skeleton className="h-5 w-1/5" />
          </div>
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-5 w-1/6" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

export function AccountPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <Skeleton className="h-6 w-20" />
      </div>

      <div className="p-4 space-y-6">
        <AccountInfoSkeleton />
        <SessionInfoSkeleton />
        <AppInfoSkeleton />
      </div>
    </div>
  );
}
