import { useState } from 'react';
import { useTelegramAuth } from './use-telegram-auth';

interface CreatePostData {
  content: string;
}

interface CreatePostResult {
  isLoading: boolean;
  error: string | null;
  createPost: (data: CreatePostData) => Promise<boolean>;
}

export function useCreatePost(): CreatePostResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useTelegramAuth();

  const createPost = async (data: CreatePostData): Promise<boolean> => {
    if (!sessionId) {
      setError('Authentication required');
      return false;
    }

    if (!data.content.trim()) {
      setError('Post content cannot be empty');
      return false;
    }

    if (data.content.length > 280) {
      setError('Post cannot exceed 280 characters');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify({
          content: data.content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createPost,
  };
}