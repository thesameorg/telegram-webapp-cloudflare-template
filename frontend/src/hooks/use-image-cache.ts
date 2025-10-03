import { useState, useEffect, useCallback } from "react";
import { imageCache } from "../utils/image-cache";

interface UseImageCacheOptions {
  src: string;
  preload?: boolean; // Whether to preload the image immediately
}

interface UseImageCacheResult {
  isLoaded: boolean;
  hasError: boolean;
  isLoading: boolean;
  onLoad: () => void;
  onError: () => void;
}

export function useImageCache({
  src,
  preload = false,
}: UseImageCacheOptions): UseImageCacheResult {
  const [isLoaded, setIsLoaded] = useState(() => imageCache.isLoaded(src));
  const [hasError, setHasError] = useState(() => imageCache.hasError(src));
  const [isLoading, setIsLoading] = useState(() => imageCache.isLoading(src));

  // Update local state when cache state might have changed
  useEffect(() => {
    setIsLoaded(imageCache.isLoaded(src));
    setHasError(imageCache.hasError(src));
    setIsLoading(imageCache.isLoading(src));
  }, [src]);

  // Preload image if requested
  useEffect(() => {
    if (preload && !imageCache.isLoaded(src) && !imageCache.hasError(src)) {
      setIsLoading(true);
      imageCache.preloadImage(src).finally(() => {
        setIsLoaded(imageCache.isLoaded(src));
        setHasError(imageCache.hasError(src));
        setIsLoading(false);
      });
    }
  }, [src, preload]);

  const onLoad = useCallback(() => {
    imageCache.markAsLoaded(src);
    setIsLoaded(true);
    setHasError(false);
    setIsLoading(false);
  }, [src]);

  const onError = useCallback(() => {
    imageCache.markAsError(src);
    setIsLoaded(false);
    setHasError(true);
    setIsLoading(false);
  }, [src]);

  return {
    isLoaded,
    hasError,
    isLoading,
    onLoad,
    onError,
  };
}
