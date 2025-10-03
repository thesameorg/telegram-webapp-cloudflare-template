import { useState, useEffect, useCallback } from "react";

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface UsePostsResult {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePosts(userId?: number): UsePostsResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If userId is explicitly requested but not available, don't fetch
      if (userId !== undefined && (userId === null || isNaN(userId))) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const url = userId ? `/api/posts/user/${userId}` : "/api/posts";

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
  };
}
