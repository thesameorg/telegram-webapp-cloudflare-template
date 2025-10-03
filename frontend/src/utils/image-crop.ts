import { Area } from "react-easy-crop";

/**
 * Creates a cropped image from the source image and crop area
 * @param imageSrc - Source image as data URL or blob URL
 * @param pixelCrop - Crop area in pixels from react-easy-crop
 * @param originalFile - Original file to preserve name and type
 * @returns Promise resolving to cropped File object
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  originalFile: File,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Set canvas size to crop dimensions
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw the cropped portion of the image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob from canvas"));
            return;
          }

          // Create File from blob, preserving original filename
          const file = new File([blob], originalFile.name, {
            type: originalFile.type,
            lastModified: Date.now(),
          });

          resolve(file);
        },
        originalFile.type,
        1, // Maximum quality
      );
    };

    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    image.src = imageSrc;
  });
}

/**
 * Creates a preview URL from a File object
 * @param file - File to create preview from
 * @returns Promise resolving to data URL string
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
