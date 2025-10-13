import React, { useState } from "react";
import imageCompression from "browser-image-compression";
import { getImageUrl } from "../../utils/image-url";
import ImageCropModal from "../ImageCropModal";

interface ProfileAvatarProps {
  readonly profileImageKey?: string | null;
  readonly displayName?: string;
  readonly size?: "sm" | "md" | "lg" | "xl";
  readonly onClick?: () => void;
  readonly editable?: boolean;
  readonly onImageUpload?: (file: File) => void;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-xl",
};

export function ProfileAvatar({
  profileImageKey,
  displayName,
  size = "md",
  onClick,
  editable = false,
  onImageUpload,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getGradientClass = (name?: string) => {
    if (!name) return "bg-gradient-to-br from-gray-400 to-gray-600";

    const colors = [
      "bg-gradient-to-br from-blue-400 to-blue-600",
      "bg-gradient-to-br from-green-400 to-green-600",
      "bg-gradient-to-br from-purple-400 to-purple-600",
      "bg-gradient-to-br from-pink-400 to-pink-600",
      "bg-gradient-to-br from-indigo-400 to-indigo-600",
      "bg-gradient-to-br from-yellow-400 to-yellow-600",
      "bg-gradient-to-br from-red-400 to-red-600",
      "bg-gradient-to-br from-teal-400 to-teal-600",
    ];

    const hash = name
      .split("")
      .reduce((a, b) => a + (b.codePointAt(0) ?? 0), 0);
    return colors[hash % colors.length];
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImageUpload) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type");
      return;
    }

    // Show crop modal
    setFileToCrop(file);
    setShowCropModal(true);

    // Reset input value to allow selecting the same file again
    event.target.value = "";
  };

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropModal(false);
    setFileToCrop(null);

    if (!onImageUpload) return;

    try {
      // Get dimensions of cropped image
      const img = await createImageBitmap(croppedFile);
      const { width, height } = img;
      img.close();

      // Calculate dimensions so minimum side becomes 96px
      const minSide = Math.min(width, height);
      const scale = 96 / minSide;
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      // Use max dimension as target since maxWidthOrHeight shrinks by largest side
      const maxTarget = Math.max(targetWidth, targetHeight);

      // Compress avatar to 96px minimum side JPEG with EXIF removal
      const compressedFile = await imageCompression(croppedFile, {
        maxWidthOrHeight: maxTarget,
        maxSizeMB: 0.2,
        useWebWorker: true,
        fileType: "image/jpeg",
      });

      onImageUpload(compressedFile);
    } catch (error) {
      console.error("Avatar compression failed:", error);
      // Fallback to cropped file if compression fails
      onImageUpload(croppedFile);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setFileToCrop(null);
  };

  const avatarContent =
    profileImageKey && !imageError ? (
      <img
        src={getImageUrl(profileImageKey)}
        alt={displayName || "Profile"}
        className="w-full h-full object-cover"
        onError={handleImageError}
      />
    ) : (
      <div
        className={`w-full h-full flex items-center justify-center text-white font-semibold ${getGradientClass(displayName)}`}
      >
        {getInitials(displayName)}
      </div>
    );

  const avatarElement =
    onClick && !editable ? (
      <button
        type="button"
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80`}
        onClick={onClick}
      >
        {avatarContent}
      </button>
    ) : (
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${editable ? "relative" : ""}`}
      >
        {avatarContent}
        {editable && onImageUpload && (
          <>
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg
                className="w-1/3 h-1/3 text-white"
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
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>
    );

  return (
    <>
      {avatarElement}
      {showCropModal && fileToCrop && (
        <ImageCropModal
          image={fileToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          showSkip={false}
        />
      )}
    </>
  );
}
