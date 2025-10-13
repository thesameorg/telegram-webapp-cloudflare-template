import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import GalleryImageItem, { type ImageUrlData } from "./GalleryImageItem";
import { getImageUrl } from "../utils/image-url";

interface ImageGalleryProps {
  readonly images: ImageUrlData[];
  readonly className?: string;
  readonly maxThumbnails?: number;
  readonly onImageDelete?: (imageId: number) => void;
  readonly canDelete?: boolean;
  readonly showInfo?: boolean;
}

export default function ImageGallery({
  images,
  className = "",
  maxThumbnails = 4,
  onImageDelete,
  canDelete = false,
  showInfo = false,
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const sortedImages = [...images].sort(
    (a, b) => a.uploadOrder - b.uploadOrder,
  );
  const displayImages = sortedImages.slice(0, maxThumbnails);
  const remainingCount = Math.max(0, sortedImages.length - maxThumbnails);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxSlides = sortedImages.map((image) => ({
    src: getImageUrl(image.imageKey),
    alt: image.originalName,
    width: image.width,
    height: image.height,
  }));

  if (images.length === 0) {
    return null;
  }

  const getGridClasses = () => {
    const count = Math.min(displayImages.length, maxThumbnails);
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  const getImageClasses = (index: number) => {
    const count = Math.min(displayImages.length, maxThumbnails);
    if (count === 1) return "aspect-video";
    if (count === 2) return "aspect-square";
    if (count === 3 && index === 0) return "col-span-3 aspect-video";
    if (count === 3) return "aspect-square";
    if (count === 4 && index === 0) return "col-span-2 aspect-video";
    return "aspect-square";
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`grid gap-1 ${getGridClasses()}`}>
        {displayImages.map((image, index) => (
          <GalleryImageItem
            key={image.id}
            image={image}
            imageClasses={getImageClasses(index)}
            remainingCount={remainingCount}
            isLast={index === displayImages.length - 1}
            canDelete={canDelete}
            showInfo={showInfo}
            onClick={() => handleImageClick(index)}
            onDelete={onImageDelete}
          />
        ))}
      </div>

      {/* Image count info */}
      {images.length > 1 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          {images.length} image{images.length !== 1 ? "s" : ""}
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
          buttons: ["close"],
        }}
        render={{
          slide: ({ slide }) => (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={slide.src}
                alt={slide.alt}
                className="max-w-full max-h-full object-contain"
                style={{
                  maxWidth: "90vw",
                  maxHeight: "90vh",
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
