import { Skeleton } from '../skeletons/Skeleton';

export function ProfileSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header with avatar and basic info */}
      <div className="flex items-start space-x-4">
        <Skeleton className="w-24 h-24 rounded-full" />

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>

          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Contact information skeleton */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <Skeleton className="h-6 w-40 mb-4" />

        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div>
            <Skeleton className="h-4 w-12 mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}