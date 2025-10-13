import { config } from "../config";
import type { Post } from "../types/post";
import { toastService } from "./toast-service";

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

interface CommentProfile {
  displayName?: string;
  bio?: string;
  profileImageKey?: string;
}

interface Comment {
  id: number;
  postId: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  isHidden: number;
  createdAt: string;
  updatedAt: string;
  profile?: CommentProfile | null;
}

interface CreateCommentData {
  content: string;
}

interface UpdateCommentData {
  content: string;
}

interface CommentsResponse {
  comments: Comment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, errorData.error || "Request failed");
  }
  return response.json();
};

/**
 * Generic API request helper
 * Automatically handles authentication, headers, error handling, and toast notifications
 */
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options?: RequestInit & {
    requiresAuth?: boolean;
    showErrorToast?: boolean;
    showSuccessToast?: boolean;
    successMessage?: string;
  },
): Promise<T> => {
  const {
    requiresAuth = false,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    headers,
    ...fetchOptions
  } = options ?? {};

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add auth header if required
  if (requiresAuth) {
    const sessionId = localStorage.getItem("telegram_session_id");
    if (!sessionId) {
      const error = new ApiError(401, "Not authenticated");
      if (showErrorToast) {
        toastService.error(error.message);
      }
      throw error;
    }
    requestHeaders.Authorization = `Bearer ${sessionId}`;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      ...fetchOptions,
      headers: requestHeaders,
      credentials: "include",
    });

    const data = await handleResponse(response);

    // Show success toast if requested
    if (showSuccessToast && successMessage) {
      toastService.success(successMessage);
    }

    return data;
  } catch (error) {
    // Show error toast automatically
    if (showErrorToast && error instanceof ApiError) {
      toastService.error(error.message);
    }
    throw error;
  }
};

export const api = {
  // Fetch all posts
  async getAllPosts(limit = 50, offset = 0): Promise<PostsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${config.apiBaseUrl}/api/posts?${params}`, {
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Fetch a single post by ID
  async getPostById(postId: number): Promise<{ post: Post }> {
    const response = await fetch(`${config.apiBaseUrl}/api/posts/${postId}`, {
      credentials: "include",
    });
    return handleResponse(response);
  },

  // Fetch posts by user ID
  async getUserPosts(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<PostsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(
      `${config.apiBaseUrl}/api/posts/user/${userId}?${params}`,
      {
        credentials: "include",
      },
    );
    return handleResponse(response);
  },

  // Create a new post
  async createPost(
    data: CreatePostData,
    sessionId: string,
  ): Promise<{ post: Post }> {
    const response = await fetch(`${config.apiBaseUrl}/api/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse(response);
  },

  // Comment endpoints
  async getCommentsByPostId(
    postId: number,
    limit = 50,
    offset = 0,
  ): Promise<CommentsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(
      `${config.apiBaseUrl}/api/posts/${postId}/comments?${params}`,
      {
        credentials: "include",
      },
    );
    return handleResponse(response);
  },

  async createComment(
    postId: number,
    data: CreateCommentData,
    sessionId: string,
  ): Promise<{ comment: Comment }> {
    const response = await fetch(
      `${config.apiBaseUrl}/api/posts/${postId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
        credentials: "include",
      },
    );

    return handleResponse(response);
  },

  async updateComment(
    commentId: number,
    data: UpdateCommentData,
    sessionId: string,
  ): Promise<{ comment: Comment }> {
    const response = await fetch(
      `${config.apiBaseUrl}/api/comments/${commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
        credentials: "include",
      },
    );

    return handleResponse(response);
  },

  async deleteComment(
    commentId: number,
    sessionId: string,
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${config.apiBaseUrl}/api/comments/${commentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
        credentials: "include",
      },
    );

    return handleResponse(response);
  },

  async hideComment(
    commentId: number,
    sessionId: string,
  ): Promise<{ comment: Comment }> {
    const response = await fetch(
      `${config.apiBaseUrl}/api/comments/${commentId}/hide`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
        credentials: "include",
      },
    );

    return handleResponse(response);
  },

  async unhideComment(
    commentId: number,
    sessionId: string,
  ): Promise<{ comment: Comment }> {
    const response = await fetch(
      `${config.apiBaseUrl}/api/comments/${commentId}/unhide`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
        credentials: "include",
      },
    );

    return handleResponse(response);
  },
};

export type { Post } from "../types/post";
export type {
  CreatePostData,
  PostsResponse,
  Comment,
  CreateCommentData,
  UpdateCommentData,
  CommentsResponse,
};
export { ApiError };
