import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImg, createImagePreview } from "../utils/image-crop";
import { useToast } from "../hooks/use-toast";

interface ImageCropModalProps {
  image: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
  showSkip?: boolean;
}

export default function ImageCropModal({
  image,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  showSkip = false,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  // Load image preview on mount
  React.useEffect(() => {
    createImagePreview(image)
      .then(setImageSrc)
      .catch(() => {
        showToast("Failed to load image", "error");
        onCancel();
      });
  }, [image, onCancel, showToast]);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleDone = useCallback(async () => {
    if (!croppedAreaPixels || !imageSrc) return;

    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        image,
      );
      onCropComplete(croppedFile);
    } catch (error) {
      console.error("Crop failed:", error);
      showToast("Failed to crop image", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, image, onCropComplete, showToast]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && croppedAreaPixels && !isProcessing) {
        handleDone();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [croppedAreaPixels, isProcessing, onCancel, handleDone]);

  const handleSkip = () => {
    onCropComplete(image);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
        <h2 id="crop-modal-title" className="text-lg font-semibold text-white">
          Crop Image: {image.name}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-300 hover:text-white"
          aria-label="Cancel"
        >
          <svg
            className="w-6 h-6"
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
      </div>

      {/* Cropper Area */}
      <div className="flex-1 relative">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={true}
            objectFit="contain"
          />
        )}
      </div>

      {/* Instructions */}
      <div className="bg-black bg-opacity-50 px-4 py-2">
        <p className="text-sm text-gray-300 text-center">
          Pinch to zoom • Drag to position
        </p>
      </div>

      {/* Zoom Slider */}
      <div className="bg-black bg-opacity-50 px-4 py-3">
        <label
          htmlFor="zoom-slider"
          className="block text-sm text-gray-300 mb-2"
        >
          Zoom: {zoom.toFixed(1)}x
        </label>
        <input
          id="zoom-slider"
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 p-4 bg-black bg-opacity-50">
        {showSkip && (
          <button
            onClick={handleSkip}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip Crop
          </button>
        )}
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleDone}
          disabled={isProcessing || !croppedAreaPixels}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Processing..." : "Done"}
        </button>
      </div>
    </div>
  );
}
