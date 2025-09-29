import { useState, useRef, useEffect } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface ImageUrlData {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  originalName: string;
  fileSize: number;
  uploadOrder: number;
}

interface ImageGalleryProps {
  images: ImageUrlData[];
  className?: string;
  maxThumbnails?: number;
  onImageDelete?: (imageId: number) => void;
  canDelete?: boolean;
  showInfo?: boolean;
}

export default function ImageGallery({
  images,
  className = '',
  maxThumbnails = 4,
  onImageDelete,
  canDelete = false,
  showInfo = false
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sortedImages = [...images].sort((a, b) => a.uploadOrder - b.uploadOrder);
  const displayImages = sortedImages.slice(0, maxThumbnails);
  const remainingCount = Math.max(0, sortedImages.length - maxThumbnails);

  // Intersection Observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target.querySelector('img') as HTMLImageElement;
            if (img && img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleImageLoad = (imageId: number) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  };

  const handleImageError = (imageId: number) => {
    setErrorImages(prev => new Set([...prev, imageId]));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const lightboxSlides = sortedImages.map(image => ({
    src: image.imageUrl,
    alt: image.originalName,
    width: image.width,
    height: image.height,
  }));

  if (images.length === 0) {
    return null;
  }

  const getGridClasses = () => {
    const count = Math.min(displayImages.length, maxThumbnails);
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  const getImageClasses = (index: number) => {
    const count = Math.min(displayImages.length, maxThumbnails);
    if (count === 1) return 'aspect-video';
    if (count === 2) return 'aspect-square';
    if (count === 3 && index === 0) return 'col-span-3 aspect-video';
    if (count === 3) return 'aspect-square';
    if (count === 4 && index === 0) return 'col-span-2 aspect-video';
    return 'aspect-square';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`grid gap-1 ${getGridClasses()}`}>
        {displayImages.map((image, index) => (
          <div
            key={image.id}
            role="button"
            tabIndex={0}
            className={`relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${getImageClasses(index)}`}
            data-image-id={image.id}
            ref={(el) => {
              if (el && observerRef.current) {
                observerRef.current.observe(el);
              }
            }}
            onClick={() => handleImageClick(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleImageClick(index);
              }
            }}
            aria-label={`View image: ${image.originalName}`}
          >
            {/* Loading placeholder */}
            {!loadedImages.has(image.id) && !errorImages.has(image.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Error placeholder */}
            {errorImages.has(image.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.958-.833-2.728 0L4.086 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-xs">Failed to load</p>
                </div>
              </div>
            )}

            {/* Image */}
            <img
              data-src={image.thumbnailUrl}
              alt={image.originalName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onLoad={() => handleImageLoad(image.id)}
              onError={() => handleImageError(image.id)}
            />

            {/* Overlay for remaining images count */}
            {index === displayImages.length - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  +{remainingCount}
                </span>
              </div>
            )}

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                {/* Zoom icon */}
                <div className="p-1.5 bg-black bg-opacity-50 rounded-full">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </div>

                {/* Delete icon */}
                {canDelete && onImageDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageDelete(image.id);
                    }}
                    className="p-1.5 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-full transition-colors"
                    title="Delete image"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Image info */}
              {showInfo && (
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {image.width}×{image.height} • {formatFileSize(image.fileSize)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image count info */}
      {images.length > 1 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          {images.length} image{images.length !== 1 ? 's' : ''}
          {remainingCount > 0 && ` • ${remainingCount} more`}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxSlides}
        animation={{ fade: 300 }}
        controller={{ closeOnBackdropClick: true }}
        toolbar={{
          buttons: [
            'close'
          ],
        }}
        render={{
          slide: ({ slide }) => (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={slide.src}
                alt={slide.alt}
                className="max-w-full max-h-full object-contain"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                }}
              />
            </div>
          ),
        }}
        carousel={{
          finite: true,
          preload: 1,
        }}
        on={{
          view: ({ index }) => setLightboxIndex(index),
        }}
      />
    </div>
  );
}

export type { ImageUrlData };