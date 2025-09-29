import { useState, useEffect, useCallback, useRef } from 'react';

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface UseInfinitePostsResult {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

const POSTS_PER_PAGE = 10;

export function useInfinitePosts(userId?: number): UseInfinitePostsResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const isLoadingRef = useRef(false);

  const fetchPosts = useCallback(async (currentOffset: number, isLoadingMore = false) => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;

      if (isLoadingMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // If userId is explicitly requested but not available, don't fetch
      if (userId !== undefined && (userId === null || isNaN(userId))) {
        setPosts([]);
        setHasMore(false);
        return;
      }

      const url = userId
        ? `/api/posts/user/${userId}?limit=${POSTS_PER_PAGE}&offset=${currentOffset}`
        : `/api/posts?limit=${POSTS_PER_PAGE}&offset=${currentOffset}`;

      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const newPosts = data.posts || [];

      if (isLoadingMore) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(data.pagination?.hasMore || false);
      setOffset(currentOffset + newPosts.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      if (!isLoadingMore) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [userId]);

  // Keep a ref to the latest fetchPosts
  const fetchPostsRef = useRef(fetchPosts);
  fetchPostsRef.current = fetchPosts;

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore || isLoadingRef.current) return;
    fetchPosts(offset, true);
  }, [hasMore, loading, loadingMore, offset, fetchPosts]);

  const refetch = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    fetchPostsRef.current(0, false);
  }, []); // Stable refetch function

  useEffect(() => {
    refetch();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}