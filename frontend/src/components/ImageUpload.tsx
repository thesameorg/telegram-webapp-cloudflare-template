import React, { useState, useRef, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { useToast } from "../hooks/use-toast";
import ImageCropQueue from "./ImageCropQueue";

interface ImageData {
  id: string;
  file: File;
  preview: string;
  compressedFile?: File;
  thumbnailFile?: File;
  width: number;
  height: number;
  uploadOrder: number;
}

interface ImageUploadProps {
  onImagesChange: (images: ImageData[]) => void;
  existingImages?: ImageData[];
  maxImages?: number;
  disabled?: boolean;
}

export default function ImageUpload({
  onImagesChange,
  existingImages = [],
  maxImages = 10,
  disabled = false,
}: ImageUploadProps) {
  const [images, setImages] = useState<ImageData[]>(existingImages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filesToCrop, setFilesToCrop] = useState<File[]>([]);
  const [showCropQueue, setShowCropQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (
    file: File,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src); // Clean up
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Clean up
        reject(new Error("Failed to load image dimensions"));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImage = useCallback(
    async (file: File): Promise<{ compressed: File; thumbnail: File }> => {
      // Get original dimensions
      const dimensions = await getImageDimensions(file);

      // Calculate target so minimum side becomes target size
      // For full size: min side = 1280px
      const fullSizeScale =
        1280 / Math.min(dimensions.width, dimensions.height);
      const fullSizeMax = Math.max(
        Math.round(dimensions.width * fullSizeScale),
        Math.round(dimensions.height * fullSizeScale),
      );

      // For thumbnail: min side = 500px
      const thumbScale = 500 / Math.min(dimensions.width, dimensions.height);
      const thumbMax = Math.max(
        Math.round(dimensions.width * thumbScale),
        Math.round(dimensions.height * thumbScale),
      );

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: fullSizeMax,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      const thumbnailOptions = {
        maxSizeMB: 0.095, // Set to 95KB to ensure we stay under 100KB limit
        maxWidthOrHeight: thumbMax,
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.8, // Start with lower quality for thumbnails
      };

      try {
        const [compressed, thumbnail] = await Promise.all([
          imageCompression(file, options),
          imageCompression(file, thumbnailOptions),
        ]);

        return { compressed, thumbnail };
      } catch (error) {
        console.error("Image compression failed:", error);
        throw new Error(
          "Failed to compress image. Please try a different file.",
        );
      }
    },
    [],
  );

  const validateAndPrepareFiles = (files: FileList | File[]): File[] => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    if (images.length + fileArray.length > maxImages) {
      showToast(`Maximum ${maxImages} images allowed`, "error");
      return [];
    }

    for (const file of fileArray) {
      // Validate file type - block HEIC files
      if (!file.type.startsWith("image/")) {
        showToast(`${file.name} is not a valid image file`, "error");
        continue;
      }

      // Block HEIC files explicitly
      const isHeicFile =
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");
      if (isHeicFile) {
        showToast(
          `HEIC format not supported. Please convert ${file.name} to JPG or PNG first.`,
          "error",
        );
        continue;
      }

      // Validate file size (10MB limit before cropping/compression)
      if (file.size > 10 * 1024 * 1024) {
        showToast(`${file.name} is too large (max 10MB)`, "error");
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  };

  const handleCroppedFiles = useCallback(
    async (croppedFiles: File[]) => {
      setShowCropQueue(false);
      setIsProcessing(true);

      try {
        const newImages: ImageData[] = [];

        for (let i = 0; i < croppedFiles.length; i++) {
          const file = croppedFiles[i];

          try {
            const [preview, dimensions, { compressed, thumbnail }] =
              await Promise.all([
                createImagePreview(file),
                getImageDimensions(file),
                compressImage(file),
              ]);

            const imageData: ImageData = {
              id: `${Date.now()}-${i}`,
              file,
              preview,
              compressedFile: compressed,
              thumbnailFile: thumbnail,
              width: dimensions.width,
              height: dimensions.height,
              uploadOrder: images.length + newImages.length + 1,
            };

            newImages.push(imageData);
          } catch (error) {
            showToast(`Failed to process ${file.name}`, "error");
            console.error("Error processing image:", error);
          }
        }

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);

        if (newImages.length > 0) {
          showToast(
            `${newImages.length} image(s) processed successfully`,
            "success",
          );
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [images, showToast, onImagesChange, compressImage],
  );

  const processImages = useCallback((files: FileList | File[]) => {
    const validFiles = validateAndPrepareFiles(files);

    if (validFiles.length === 0) {
      return;
    }

    // Show crop queue for valid files
    setFilesToCrop(validFiles);
    setShowCropQueue(true);
  }, []);

  const removeImage = (id: string) => {
    const updatedImages = images
      .filter((img) => img.id !== id)
      .map((img, index) => ({ ...img, uploadOrder: index + 1 }));
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [removed] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, removed);

    // Update upload order
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      uploadOrder: index + 1,
    }));

    setImages(reorderedImages);
    onImagesChange(reorderedImages);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || isProcessing) return;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        processImages(files);
      }
    },
    [disabled, isProcessing, processImages],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      processImages(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  const openFileDialog = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const openCameraDialog = () => {
    if (!disabled && !isProcessing) {
      document.getElementById("camera-input")?.click();
    }
  };

  const handleCropCancel = () => {
    setShowCropQueue(false);
    setFilesToCrop([]);
  };

  return (
    <div className="w-full">
      {/* Crop Queue Modal */}
      {showCropQueue && filesToCrop.length > 0 && (
        <ImageCropQueue
          images={filesToCrop}
          onAllCropped={handleCroppedFiles}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Camera Input */}
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Upload Options */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={openFileDialog}
          disabled={disabled || isProcessing}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors
            ${
              disabled || isProcessing
                ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600"
                : "border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer"
            }
          `}
        >
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Gallery
          </span>
        </button>

        <button
          type="button"
          onClick={openCameraDialog}
          disabled={disabled || isProcessing}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors
            ${
              disabled || isProcessing
                ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600"
                : "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer"
            }
          `}
        >
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            Camera
          </span>
        </button>
      </div>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600"
          }
          ${
            disabled || isProcessing
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFileDialog();
          }
        }}
      >
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-gray-600 dark:text-gray-400">
            <p className="text-lg font-medium">
              {isProcessing
                ? "Processing images..."
                : "Drop images here or click to browse"}
            </p>
            <p className="text-sm">
              Support: JPG, PNG, WebP • Max {maxImages} images • Up to 10MB each
            </p>
          </div>
          {images.length > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {images.length} / {maxImages} images selected
            </p>
          )}
        </div>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Images ({images.length}/{maxImages})
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
                >
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />

                  {/* Overlay with controls */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      {/* Move Left */}
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => reorderImages(index, index - 1)}
                          className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                          title="Move left"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"
                        title="Remove image"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>

                      {/* Move Right */}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => reorderImages(index, index + 1)}
                          className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                          title="Move right"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order indicator */}
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {image.uploadOrder}
                  </div>

                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}

                  {/* Image info */}
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                    {image.width}×{image.height}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Images will be compressed to 1280px minimum side with 500px
            thumbnails
          </div>
        </div>
      )}
    </div>
  );
}

export type { ImageData };
