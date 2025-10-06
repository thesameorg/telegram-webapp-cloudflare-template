import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { config } from "../config";

interface CreatePostData {
  content: string;
}

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  starCount?: number;
  commentCount?: number;
  paymentId?: string | null;
  isPaymentPending?: number;
  createdAt: string;
  updatedAt: string;
}

interface CreatePostResult {
  isLoading: boolean;
  error: string | null;
  createPost: (data: CreatePostData) => Promise<{ post: Post } | null>;
}

export function useCreatePost(): CreatePostResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useAuth();

  const createPost = async (
    data: CreatePostData,
  ): Promise<{ post: Post } | null> => {
    if (!sessionId) {
      setError("Authentication required");
      return null;
    }

    // Allow posts with just a space (for image-only posts)
    if (!data.content.trim() && data.content !== " ") {
      setError("Post content cannot be empty");
      return null;
    }

    if (data.content.length > 280) {
      setError("Post cannot exceed 280 characters");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({
          content: data.content.trim(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create post");
      }

      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
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
