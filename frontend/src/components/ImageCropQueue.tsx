import { useState } from "react";
import ImageCropModal from "./ImageCropModal";

interface ImageCropQueueProps {
  readonly images: File[];
  readonly onAllCropped: (croppedFiles: File[]) => void;
  readonly onCancel: () => void;
  readonly aspectRatio?: number;
}

export default function ImageCropQueue({
  images,
  onAllCropped,
  onCancel,
  aspectRatio = 1,
}: ImageCropQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [croppedFiles, setCroppedFiles] = useState<File[]>([]);

  const currentImage = images[currentIndex];
  const totalImages = images.length;
  const isLastImage = currentIndex === totalImages - 1;

  const handleCropComplete = (croppedFile: File) => {
    const updatedCroppedFiles = [...croppedFiles, croppedFile];
    setCroppedFiles(updatedCroppedFiles);

    if (isLastImage) {
      // All images cropped, return results
      onAllCropped(updatedCroppedFiles);
    } else {
      // Move to next image
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkipAll = () => {
    // Return original images without cropping
    onAllCropped(images);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      // Go back to previous image
      setCurrentIndex(currentIndex - 1);
      // Remove last cropped file
      setCroppedFiles(croppedFiles.slice(0, -1));
    }
  };

  return (
    <div className="relative">
      {/* Progress Header Overlay */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-black bg-opacity-75 p-4">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm font-medium">
              Cropping image {currentIndex + 1} of {totalImages}
            </p>
            <div className="w-64 bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${((currentIndex + 1) / totalImages) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex space-x-2">
            {currentIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleSkipAll}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Skip All
            </button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      <ImageCropModal
        image={currentImage}
        onCropComplete={handleCropComplete}
        onCancel={onCancel}
        aspectRatio={aspectRatio}
        showSkip={totalImages > 1}
      />
    </div>
  );
}
