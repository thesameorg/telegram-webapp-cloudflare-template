interface LoadingSkeletonProps {
  variant?: "header" | "box" | "list";
  count?: number;
}

export function LoadingSkeleton({
  variant = "box",
  count = 1,
}: LoadingSkeletonProps) {
  if (variant === "header") {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
}
