interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CreatePostData {
  content: string;
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || 'Request failed');
  }
  return response.json();
};

export const api = {
  // Fetch all posts
  async getAllPosts(limit = 50, offset = 0): Promise<PostsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`/api/posts?${params}`);
    return handleResponse(response);
  },

  // Fetch posts by user ID
  async getUserPosts(userId: number, limit = 50, offset = 0): Promise<PostsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`/api/posts/user/${userId}?${params}`);
    return handleResponse(response);
  },

  // Create a new post
  async createPost(data: CreatePostData, sessionId: string): Promise<{ post: Post }> {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  },
};

export type { Post, CreatePostData, PostsResponse };
export { ApiError };