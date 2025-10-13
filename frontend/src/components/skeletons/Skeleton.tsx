import React from "react";

interface SkeletonProps {
  readonly className?: string;
  readonly width?: string;
  readonly height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  const style = {
    ...(width && { width }),
    ...(height && { height }),
  };

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded ${className}`}
      style={style}
    />
  );
}

export function SkeletonAvatar({ size = "w-10 h-10" }: { size?: string }) {
  return <Skeleton className={`${size} rounded-full`} />;
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => ({
        id: crypto.randomUUID(),
        isLast: i === lines - 1,
      })).map((item) => (
        <Skeleton
          key={item.id}
          className={`h-4 ${item.isLast ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}
    >
      {children || (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <SkeletonAvatar />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <SkeletonText lines={2} />
        </div>
      )}
    </div>
  );
}

export function SkeletonImage({
  className = "",
  aspectRatio = "aspect-square",
}: {
  className?: string;
  aspectRatio?: string;
}) {
  return <Skeleton className={`${aspectRatio} rounded-lg ${className}`} />;
}

export function SkeletonImageGrid({
  count = 1,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const getGridClasses = () => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  const getImageClasses = (index: number) => {
    if (count === 1) return "aspect-video";
    if (count === 2) return "aspect-square";
    if (count === 3 && index === 0) return "col-span-3 aspect-video";
    if (count === 3) return "aspect-square";
    if (count === 4 && index === 0) return "col-span-2 aspect-video";
    return "aspect-square";
  };

  return (
    <div className={`grid gap-1 ${getGridClasses()} ${className}`}>
      {Array.from({ length: Math.min(count, 4) }, (_, i) => ({
        id: crypto.randomUUID(),
        index: i,
      })).map((item) => (
        <SkeletonImage
          key={item.id}
          className={getImageClasses(item.index)}
          aspectRatio=""
        />
      ))}
    </div>
  );
}
