import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useCreatePost } from "../hooks/use-create-post";
import ImageUpload, { ImageData } from "./ImageUpload";
import { useToast } from "../hooks/use-toast";
import { useTelegramMainButton } from "../hooks/use-telegram-main-button";
import { config } from "../config";
import type { Post } from "../types/post";
import WebApp from "@twa-dev/sdk";
import CloseIcon from "./icons/close.svg";

interface PostFormModalProps {
  readonly mode: "create" | "edit";
  readonly post?: Post; // Required for edit mode
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
}

export default function PostFormModal({
  mode,
  post,
  onClose,
  onSuccess,
}: PostFormModalProps) {
  const [content, setContent] = useState(
    mode === "edit" && post ? post.content : "",
  );
  const [images, setImages] = useState<ImageData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createPost } = useCreatePost();
  const { showToast } = useToast();

  const maxLength = 280;
  const charactersLeft = maxLength - content.length;
  const isProcessing = isLoading || isUploading;

  // Initialize content for edit mode
  useEffect(() => {
    if (mode === "edit" && post) {
      setContent(post.content);
    }
  }, [mode, post]);

  const uploadImages = async (
    postId: number,
    images: ImageData[],
  ): Promise<boolean> => {
    if (images.length === 0) return true;

    setIsUploading(true);
    try {
      const formData = new FormData();

      for (const [index, image] of images.entries()) {
        if (image.compressedFile && image.thumbnailFile) {
          formData.append(
            `image_${index}`,
            image.compressedFile,
            image.file.name,
          );
          formData.append(
            `thumbnail_${index}`,
            image.thumbnailFile,
            `thumb_${image.file.name}`,
          );
          formData.append(`order_${index}`, image.uploadOrder.toString());
          formData.append(`width_${index}`, image.width.toString());
          formData.append(`height_${index}`, image.height.toString());
        }
      }

      const sessionId = localStorage.getItem("telegram_session_id");
      if (!sessionId) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${config.apiBaseUrl}/api/posts/${postId}/images`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
          body: formData,
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload images");
      }

      return true;
    } catch (error) {
      console.error("Image upload failed:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to upload images",
        "error",
      );
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePost = async (
    postId: number,
    content: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionId = localStorage.getItem("telegram_session_id");
      if (!sessionId) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${config.apiBaseUrl}/api/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update post");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      // Allow posts with only images (empty content) or content with images
      const postContent = content.trim() || " "; // Use space if no content but has images

      // Create post first
      const postResult = await createPost({ content: postContent });
      if (postResult?.post) {
        // Upload images if any
        if (images.length > 0) {
          const imageUploadSuccess = await uploadImages(
            postResult.post.id,
            images,
          );
          if (!imageUploadSuccess) {
            showToast("Post created but some images failed to upload", "info");
          }
        }

        // Trigger haptic feedback
        WebApp.HapticFeedback.notificationOccurred("success");

        showToast("Post created successfully!", "success");
        setContent("");
        setImages([]);
        onSuccess?.();
        onClose();
      }
    } else if (mode === "edit" && post) {
      // Edit mode
      const success = await handleUpdatePost(post.id, content);
      if (success) {
        showToast("Post updated successfully!", "success");
        onSuccess?.();
        onClose();
      }
    }
  };

  const isSubmitDisabled =
    mode === "create"
      ? isProcessing ||
        (!content.trim() && images.length === 0) ||
        content.length > maxLength
      : isProcessing ||
        !content.trim() ||
        content.length > maxLength ||
        (post && content === post.content);

  const getButtonText = () => {
    if (mode === "create") {
      if (isLoading) return "Creating...";
      if (isUploading) return "Uploading...";
      return "Post";
    }
    return isLoading ? "Updating..." : "Update";
  };

  const getLoadingMessage = () => {
    if (mode === "create") {
      return isLoading ? "Creating post..." : "Uploading images...";
    }
    return "Updating post...";
  };

  // Use Telegram MainButton
  useTelegramMainButton(
    isSubmitDisabled
      ? null
      : {
          text: getButtonText(),
          onClick: () => {
            const form = document.getElementById(
              "post-form",
            ) as HTMLFormElement;
            form?.requestSubmit();
          },
          disabled: isSubmitDisabled,
          loading: isProcessing,
        },
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${mode === "create" ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto relative`}
      >
        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 z-10 flex flex-col items-center justify-center rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {getLoadingMessage()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please don&apos;t close this window
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === "create" ? "Create Post" : "Edit Post"}
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src={CloseIcon} className="w-6 h-6" alt="Close" />
          </button>
        </div>

        {/* Content */}
        <form id="post-form" onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              maxLength={maxLength}
              disabled={isProcessing}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className={charactersLeft < 20 ? "text-red-500" : ""}>
                  {charactersLeft} characters left
                </span>
              </div>
            </div>
          </div>

          {/* Image Upload - Only for create mode */}
          {mode === "create" && (
            <div className="mb-4">
              <ImageUpload
                onImagesChange={setImages}
                existingImages={images}
                maxImages={10}
                disabled={isProcessing}
              />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
