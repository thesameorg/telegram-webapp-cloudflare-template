import { Context } from 'hono';
import { createDatabase } from '../db';
import { PostService } from '../services/post-service';
import { ImageService } from '../services/image-service';
import { createPostSchema, updatePostSchema } from '../models/post';
import { SessionManager } from '../services/session-manager';
import type { Env } from '../types/env';
import type { ImageUploadData } from '../services/image-service';

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
  // Update cache version to invalidate all cached responses
  const newCacheVersion = Date.now().toString();
  await sessions.put('cache_version', newCacheVersion);

  // Also delete existing cache keys as backup
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

    // Get current cache version
    const cacheVersion = await c.env.SESSIONS.get('cache_version') || '0';
    const cacheKey = `feed:${limit}:${offset}:v${cacheVersion}`;

    // Try cache first
    const cachedData = await c.env.SESSIONS.get(cacheKey);
    if (cachedData) {
      c.header('Cache-Control', 'public, max-age=60'); // Reduced from 300 to 60 seconds
      c.header('X-Cache', 'HIT');
      c.header('X-Cache-Version', cacheVersion);
      return c.json(JSON.parse(cachedData));
    }

    // Cache miss - fetch from database
    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);
    const posts = await postService.getPostsWithImages({ limit, offset });

    const responseData = createPaginationResponse(posts, limit, offset);

    // Cache the response with version
    await c.env.SESSIONS.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 300 });

    c.header('Cache-Control', 'public, max-age=60'); // Reduced cache time
    c.header('X-Cache', 'MISS');
    c.header('X-Cache-Version', cacheVersion);
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
    const postService = new PostService(db, c.env);
    const posts = await postService.getUserPostsWithImages({ userId, limit, offset });

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
    const postService = new PostService(db, c.env);

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
    const postService = new PostService(db, c.env);

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
    const postService = new PostService(db, c.env);

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

export const uploadPostImages = async (c: Context<{ Bindings: Env }>) => {
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
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES, c.env);

    // Check if post exists and user owns it
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    if (existingPost.userId !== authResult.session.userId) {
      return c.json({ error: 'Not authorized to upload images to this post' }, 403);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const images: ImageUploadData[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();

        // Validate image
        if (!await imageService.validateImageFile(arrayBuffer, value.type)) {
          return c.json({ error: `Invalid image file: ${value.name}` }, 400);
        }

        // Get thumbnail data from form
        const thumbnailKey = key.replace('image_', 'thumbnail_');
        const thumbnailFile = formData.get(thumbnailKey) as File;
        if (!thumbnailFile) {
          return c.json({ error: `Thumbnail missing for image: ${value.name}` }, 400);
        }

        const thumbnailBuffer = await thumbnailFile.arrayBuffer();
        if (!await imageService.validateThumbnailFile(thumbnailBuffer)) {
          return c.json({ error: `Invalid thumbnail file: ${value.name}` }, 400);
        }

        // Get metadata from form
        const orderKey = key.replace('image_', 'order_');
        const widthKey = key.replace('image_', 'width_');
        const heightKey = key.replace('image_', 'height_');

        const uploadOrder = parseInt(formData.get(orderKey) as string) || 1;
        const width = parseInt(formData.get(widthKey) as string) || 0;
        const height = parseInt(formData.get(heightKey) as string) || 0;

        images.push({
          originalName: value.name,
          mimeType: value.type,
          fileSize: arrayBuffer.byteLength,
          width,
          height,
          uploadOrder,
          imageBuffer: arrayBuffer,
          thumbnailBuffer,
        });
      }
    }

    if (images.length === 0) {
      return c.json({ error: 'No valid images provided' }, 400);
    }

    if (images.length > 10) {
      return c.json({ error: 'Maximum 10 images allowed per post' }, 400);
    }

    // Check if adding these images would exceed the limit
    const currentImageCount = await imageService.getImageCount(postIdResult.postId);
    if (currentImageCount + images.length > 10) {
      return c.json({ error: 'Maximum 10 images allowed per post' }, 400);
    }

    // Upload all images
    const uploadedImages = await imageService.uploadImages(postIdResult.postId, images);

    await invalidateFeedCache(c.env.SESSIONS);

    return c.json({
      message: 'Images uploaded successfully',
      images: uploadedImages.map(img => ({
        id: img.id,
        originalName: img.originalName,
        uploadOrder: img.uploadOrder,
        width: img.width,
        height: img.height,
        fileSize: img.fileSize,
      }))
    }, 201);
  } catch (error) {
    console.error('Error uploading images:', error);
    return c.json({ error: 'Failed to upload images' }, 500);
  }
};

export const deletePostImage = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json({ error: postIdResult.error.message }, postIdResult.error.status);
    }

    const imageId = parseInt(c.req.param('imageId'), 10);
    if (isNaN(imageId)) {
      return c.json({ error: 'Invalid image ID' }, 400);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES, c.env);

    // Check if post exists and user owns it
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    if (existingPost.userId !== authResult.session.userId) {
      return c.json({ error: 'Not authorized to delete images from this post' }, 403);
    }

    const deleted = await imageService.deleteImage(imageId, postIdResult.postId);
    if (!deleted) {
      return c.json({ error: 'Image not found' }, 404);
    }

    await invalidateFeedCache(c.env.SESSIONS);

    return c.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
};