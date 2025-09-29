import React, { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';
import { useToast } from '../hooks/use-toast';

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
  disabled = false
}: ImageUploadProps) {
  const [images, setImages] = useState<ImageData[]>(existingImages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImage = async (file: File): Promise<{ compressed: File; thumbnail: File }> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/jpeg',
      quality: 0.9,
    };

    const thumbnailOptions = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 300,
      useWebWorker: true,
      fileType: 'image/jpeg',
      quality: 0.8,
    };

    try {
      const [compressed, thumbnail] = await Promise.all([
        imageCompression(file, options),
        imageCompression(file, thumbnailOptions),
      ]);

      return { compressed, thumbnail };
    } catch (error) {
      console.error('Image compression failed:', error);
      throw new Error('Failed to compress image. Please try a different file.');
    }
  };

  const processImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    if (images.length + fileArray.length > maxImages) {
      showToast(`Maximum ${maxImages} images allowed`, 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const newImages: ImageData[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          showToast(`${file.name} is not a valid image file`, 'error');
          continue;
        }

        // Convert HEIC files to JPEG
        let processedFile = file;
        const isHeicFile = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';

        if (isHeicFile) {
          try {
            showToast('Converting HEIC image...', 'info');
            const convertedBlob = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.9
            });

            // heic2any can return Blob or Blob[], handle both cases
            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg',
              lastModified: file.lastModified
            });
            showToast('HEIC image converted successfully', 'success');
          } catch (conversionError) {
            console.error('HEIC conversion failed:', conversionError);
            showToast('Failed to convert HEIC image. Please convert to JPG manually.', 'error');
            continue;
          }
        }

        // Validate file size (10MB limit before compression)
        if (processedFile.size > 10 * 1024 * 1024) {
          showToast(`${processedFile.name} is too large (max 10MB)`, 'error');
          continue;
        }

        try {
          const [preview, dimensions, { compressed, thumbnail }] = await Promise.all([
            createImagePreview(processedFile),
            getImageDimensions(processedFile),
            compressImage(processedFile),
          ]);

          const imageData: ImageData = {
            id: `${Date.now()}-${i}`,
            file: processedFile,
            preview,
            compressedFile: compressed,
            thumbnailFile: thumbnail,
            width: dimensions.width,
            height: dimensions.height,
            uploadOrder: images.length + newImages.length + 1,
          };

          newImages.push(imageData);
        } catch (error) {
          showToast(`Failed to process ${processedFile.name}`, 'error');
          console.error('Error processing image:', error);
        }
      }

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages);

      if (newImages.length > 0) {
        showToast(`${newImages.length} image(s) processed successfully`, 'success');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [images, maxImages, showToast, onImagesChange]);

  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id)
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
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isProcessing) return;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      processImages(files);
    }
  }, [disabled, isProcessing, processImages]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      processImages(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const openFileDialog = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
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

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600'
          }
          ${disabled || isProcessing
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
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
              {isProcessing ? 'Processing images...' : 'Drop images here or click to browse'}
            </p>
            <p className="text-sm">
              Support: JPG, PNG, WebP, HEIC • Max {maxImages} images • Up to 10MB each
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

          {/* Summary */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Images will be compressed to ≤1MB each with 300px thumbnails
          </div>
        </div>
      )}
    </div>
  );
}

export type { ImageData };