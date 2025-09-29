import { Context } from 'hono';
import { createDatabase } from '../db';
import { PostService } from '../services/post-service';
import { createPostSchema, updatePostSchema } from '../models/post';
import { SessionManager } from '../services/session-manager';
import type { Env } from '../types/env';

// Helper: Extract and validate session
async function authenticateUser(c: Context<{ Bindings: Env }>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { error: { message: 'Authentication required', status: 401 as const } };
  }

  let sessionId: string;
  if (authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.substring(7).trim();
  } else if (authHeader.startsWith('Session ')) {
    sessionId = authHeader.substring(8).trim();
  } else {
    sessionId = authHeader.trim();
  }

  if (!sessionId) {
    return { error: { message: 'Authentication required', status: 401 as const } };
  }

  const sessionManager = SessionManager.create(c.env);
  const session = await sessionManager.validateSession(sessionId);
  if (!session) {
    return { error: { message: 'Invalid or expired session', status: 401 as const } };
  }

  return { session };
}

// Helper: Parse pagination parameters
function parsePagination(c: Context) {
  const limitParam = c.req.query('limit') || '50';
  const offsetParam = c.req.query('offset') || '0';
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
  return { limit, offset };
}

// Helper: Parse and validate post ID
function parsePostId(c: Context) {
  const postId = parseInt(c.req.param('postId'), 10);
  if (isNaN(postId)) {
    return { error: { message: 'Invalid post ID', status: 400 as const } };
  }
  return { postId };
}

// Helper: Invalidate feed cache
async function invalidateFeedCache(sessions: KVNamespace) {
  const cacheKeys = [];
  for (let limit = 1; limit <= 100; limit++) {
    for (let offset = 0; offset < 500; offset += limit) {
      cacheKeys.push(`feed:${limit}:${offset}`);
    }
  }

  const batchSize = 50;
  for (let i = 0; i < cacheKeys.length; i += batchSize) {
    const batch = cacheKeys.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(key => sessions.delete(key)));
  }
}

// Helper: Create pagination response
function createPaginationResponse(posts: unknown[], limit: number, offset: number) {
  return {
    posts,
    pagination: {
      limit,
      offset,
      hasMore: posts.length === limit
    }
  };
}

export const getAllPosts = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { limit, offset } = parsePagination(c);
    const cacheKey = `feed:${limit}:${offset}`;

    // Try cache first
    const cachedData = await c.env.SESSIONS.get(cacheKey);
    if (cachedData) {
      c.header('Cache-Control', 'public, max-age=300');
      c.header('X-Cache', 'HIT');
      return c.json(JSON.parse(cachedData));
    }

    // Cache miss - fetch from database
    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);
    const posts = await postService.getPosts({ limit, offset });

    const responseData = createPaginationResponse(posts, limit, offset);

    // Cache the response
    await c.env.SESSIONS.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 300 });

    c.header('Cache-Control', 'public, max-age=300');
    c.header('X-Cache', 'MISS');
    return c.json(responseData);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
};

export const getUserPosts = async (c: Context<{ Bindings: Env }>) => {
  try {
    const userIdParam = c.req.param('userId');
    if (!userIdParam || userIdParam === 'undefined' || userIdParam === 'null') {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const { limit, offset } = parsePagination(c);

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);
    const posts = await postService.getUserPosts({ userId, limit, offset });

    // No-cache headers for user posts
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json(createPaginationResponse(posts, limit, offset));
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return c.json({ error: 'Failed to fetch user posts' }, 500);
  }
};

export const createPost = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }

    const body = await c.req.json();
    const result = createPostSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Invalid post data', details: result.error.issues }, 400);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);

    const newPost = await postService.createPost(
      authResult.session.userId,
      authResult.session.username || `user_${authResult.session.userId}`,
      authResult.session.displayName,
      { content: result.data.content }
    );

    await invalidateFeedCache(c.env.SESSIONS);

    return c.json({ post: newPost }, 201);
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json({ error: 'Failed to create post' }, 500);
  }
};

export const updatePost = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json({ error: postIdResult.error.message }, postIdResult.error.status);
    }

    const body = await c.req.json();
    const result = updatePostSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Invalid post data', details: result.error.issues }, 400);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);

    // Check ownership
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    if (existingPost.userId !== authResult.session.userId) {
      return c.json({ error: 'Not authorized to update this post' }, 403);
    }

    const updatedPost = await postService.updatePost(
      postIdResult.postId,
      authResult.session.userId,
      result.data.content
    );

    if (!updatedPost) {
      return c.json({ error: 'Failed to update post' }, 500);
    }

    await invalidateFeedCache(c.env.SESSIONS);

    return c.json({ post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return c.json({ error: 'Failed to update post' }, 500);
  }
};

export const deletePost = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json({ error: postIdResult.error.message }, postIdResult.error.status);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);

    // Check ownership
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    if (existingPost.userId !== authResult.session.userId) {
      return c.json({ error: 'Not authorized to delete this post' }, 403);
    }

    const deletedPost = await postService.deletePost(postIdResult.postId, authResult.session.userId);
    if (!deletedPost) {
      return c.json({ error: 'Failed to delete post' }, 500);
    }

    await invalidateFeedCache(c.env.SESSIONS);

    return c.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return c.json({ error: 'Failed to delete post' }, 500);
  }
};