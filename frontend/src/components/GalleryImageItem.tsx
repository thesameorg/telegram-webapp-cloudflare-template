import { useImageCache } from '../hooks/use-image-cache';
import { formatFileSize } from '../utils/format';

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

interface GalleryImageItemProps {
  image: ImageUrlData;
  imageClasses: string;
  remainingCount: number;
  isLast: boolean;
  canDelete: boolean;
  showInfo: boolean;
  onClick: () => void;
  onDelete?: (imageId: number) => void;
}

export default function GalleryImageItem({
  image,
  imageClasses,
  remainingCount,
  isLast,
  canDelete,
  showInfo,
  onClick,
  onDelete,
}: GalleryImageItemProps) {
  const { isLoaded, hasError, onLoad, onError } = useImageCache({ src: image.thumbnailUrl });

  return (
    <div
      key={image.id}
      role="button"
      tabIndex={0}
      className={`relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${imageClasses}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View image: ${image.originalName}`}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.958-.833-2.728 0L4.086 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}

      {/* Image - displays the thumbnail URL from backend */}
      <img
        src={image.thumbnailUrl}
        alt={image.originalName}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onLoad={onLoad}
        onError={onError}
      />

      {/* Overlay for remaining images count */}
      {isLast && remainingCount > 0 && (
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
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(image.id);
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
  );
}

export type { ImageUrlData };