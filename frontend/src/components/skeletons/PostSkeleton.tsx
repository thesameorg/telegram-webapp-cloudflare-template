import { useState } from "react";
import {
  SkeletonAvatar,
  SkeletonText,
  Skeleton,
  SkeletonImageGrid,
} from "./Skeleton";

interface PostSkeletonProps {
  readonly withImages?: boolean;
  readonly imageCount?: number;
}

export function PostSkeleton({
  withImages,
  imageCount,
}: PostSkeletonProps = {}) {
  // Use useState with lazy initializer to call Math.random() only once during mount
  // This satisfies React's purity requirements - state initialization is exempt from purity rules
  const [shouldHaveImages] = useState(() => withImages ?? Math.random() < 0.3);

  const [numImages] = useState(
    () =>
      imageCount ?? (shouldHaveImages ? Math.floor(Math.random() * 4) + 1 : 0),
  );

  const [textLines] = useState(() => Math.floor(Math.random() * 3) + 1);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center space-x-3 mb-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="pl-13 space-y-3">
        <SkeletonText lines={textLines} />

        {/* Images */}
        {numImages > 0 && <SkeletonImageGrid count={numImages} />}
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 3 }: { readonly count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }, () => crypto.randomUUID()).map((id) => (
        <PostSkeleton key={id} />
      ))}
    </div>
  );
}
