import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCreatePost } from '../hooks/use-create-post';
import ImageUpload, { ImageData } from './ImageUpload';
import { useToast } from '../hooks/use-toast';

interface CreatePostProps {
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { isLoading, error, createPost } = useCreatePost();
  const { showToast } = useToast();

  const maxLength = 280;
  const charactersLeft = maxLength - content.length;

  const uploadImages = async (postId: number, images: ImageData[]): Promise<boolean> => {
    if (images.length === 0) return true;

    setIsUploading(true);
    try {
      const formData = new FormData();

      images.forEach((image, index) => {
        if (image.compressedFile && image.thumbnailFile) {
          formData.append(`image_${index}`, image.compressedFile, image.file.name);
          formData.append(`thumbnail_${index}`, image.thumbnailFile, `thumb_${image.file.name}`);
          formData.append(`order_${index}`, image.uploadOrder.toString());
          formData.append(`width_${index}`, image.width.toString());
          formData.append(`height_${index}`, image.height.toString());
        }
      });

      const sessionId = localStorage.getItem('telegram_session_id');
      if (!sessionId) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/posts/${postId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload images');
      }

      return true;
    } catch (error) {
      console.error('Image upload failed:', error);
      showToast(error instanceof Error ? error.message : 'Failed to upload images', 'error');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Allow posts with only images (empty content) or content with images
    const postContent = content.trim() || ' '; // Use space if no content but has images

    // Create post first
    const postResult = await createPost({ content: postContent });
    if (postResult && postResult.post) {
      // Upload images if any
      if (images.length > 0) {
        const imageUploadSuccess = await uploadImages(postResult.post.id, images);
        if (!imageUploadSuccess) {
          showToast('Post created but some images failed to upload', 'info');
        }
      }

      setContent('');
      setImages([]);
      onPostCreated?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Post
          </h2>
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              form="create-post-form"
              disabled={isLoading || isUploading || (!content.trim() && images.length === 0) || content.length > maxLength}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading ? 'Creating...' : isUploading ? 'Uploading...' : 'Post'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form id="create-post-form" onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              maxLength={maxLength}
              disabled={isLoading || isUploading}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className={charactersLeft < 20 ? 'text-red-500' : ''}>
                  {charactersLeft} characters left
                </span>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <ImageUpload
              onImagesChange={setImages}
              existingImages={images}
              maxImages={10}
              disabled={isLoading || isUploading}
            />
          </div>

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