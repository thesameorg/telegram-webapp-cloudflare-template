/**
 * Centralized image loading cache to prevent re-downloading images
 * when components re-render or re-mount during navigation/scrolling
 */
class ImageCache {
  private loadedImages = new Set<string>();
  private errorImages = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  isLoaded(url: string): boolean {
    return this.loadedImages.has(url);
  }

  hasError(url: string): boolean {
    return this.errorImages.has(url);
  }

  isLoading(url: string): boolean {
    return this.loadingPromises.has(url);
  }

  async preloadImage(url: string): Promise<void> {
    // Return existing promise if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Return immediately if already loaded or errored
    if (this.loadedImages.has(url) || this.errorImages.has(url)) {
      return;
    }

    // Create loading promise
    const loadingPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages.add(url);
        this.loadingPromises.delete(url);
        resolve();
      };

      img.onerror = () => {
        this.errorImages.add(url);
        this.loadingPromises.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });

    this.loadingPromises.set(url, loadingPromise);

    try {
      await loadingPromise;
    } catch {
      // Swallow error, it's tracked in errorImages set
    }
  }

  markAsLoaded(url: string): void {
    this.loadedImages.add(url);
    this.errorImages.delete(url);
    this.loadingPromises.delete(url);
  }

  markAsError(url: string): void {
    this.errorImages.add(url);
    this.loadedImages.delete(url);
    this.loadingPromises.delete(url);
  }

  clear(): void {
    this.loadedImages.clear();
    this.errorImages.clear();
    this.loadingPromises.clear();
  }

  // For debugging
  getStats() {
    return {
      loaded: this.loadedImages.size,
      errored: this.errorImages.size,
      loading: this.loadingPromises.size
    };
  }
}

// Global singleton instance
export const imageCache = new ImageCache();