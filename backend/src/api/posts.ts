import { Context } from 'hono';
import { createDatabase } from '../db';
import { PostService } from '../services/post-service';
import { createPostSchema } from '../models/post';
import { SessionManager } from '../services/session-manager';
import type { Env } from '../types/env';

export const getAllPosts = async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);

    const limitParam = c.req.query('limit') || '50';
    const offsetParam = c.req.query('offset') || '0';
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);

    const posts = await postService.getPosts({ limit, offset });

    // Add cache-busting headers
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json({
      posts,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
};

export const getUserPosts = async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);

    const userIdParam = c.req.param('userId');

    // Handle undefined, null, or non-numeric userId
    if (!userIdParam || userIdParam === 'undefined' || userIdParam === 'null') {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId)) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const limitParam = c.req.query('limit') || '50';
    const offsetParam = c.req.query('offset') || '0';
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);

    const posts = await postService.getUserPosts({ userId, limit, offset });

    // Add cache-busting headers
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json({
      posts,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return c.json({ error: 'Failed to fetch user posts' }, 500);
  }
};

export const createPost = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Verify Telegram authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    // Extract session ID from Authorization header
    let sessionId: string;
    if (authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7).trim();
    } else if (authHeader.startsWith('Session ')) {
      sessionId = authHeader.substring(8).trim();
    } else {
      sessionId = authHeader.trim();
    }

    if (!sessionId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const sessionManager = SessionManager.create(c.env);
    const session = await sessionManager.validateSession(sessionId);
    if (!session) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const body = await c.req.json();
    const result = createPostSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Invalid post data', details: result.error.issues }, 400);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db);

    const newPost = await postService.createPost(
      session.userId,
      session.username || `user_${session.userId}`,
      session.displayName,
      { content: result.data.content }
    );

    return c.json({ post: newPost }, 201);
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json({ error: 'Failed to create post' }, 500);
  }
};