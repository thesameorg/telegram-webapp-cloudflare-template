import { Context } from 'hono';
import { createDatabase } from '../db';
import { PostService } from '../services/post-service';
import { ImageService } from '../services/image-service';
import { createPostSchema, updatePostSchema } from '../models/post';
import { SessionManager } from '../services/session-manager';
import type { Env } from '../types/env';
import type { ImageUploadData } from '../services/image-service';
import { getBotInstance, sendPostDeletedNotification } from '../services/notification-service';

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

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);
    const posts = await postService.getPostsWithImages({ limit, offset });

    const responseData = createPaginationResponse(posts, limit, offset);

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

    // Check if target user is banned
    const { ProfileService } = await import('../services/profile-service');
    const profileService = new ProfileService(c.env.DB);
    const targetProfile = await profileService.getProfile(userId);

    if (targetProfile && targetProfile.isBanned === 1) {
      // Check if viewer is admin
      const auth = await authenticateUser(c);
      const isViewerAdmin = 'session' in auth && auth.session && auth.session.role === 'admin';

      // If user is banned and viewer is not admin, return empty array
      if (!isViewerAdmin) {
        return c.json(createPaginationResponse([], limit, offset));
      }
    }

    const posts = await postService.getUserPostsWithImages({ userId, limit, offset });

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

    return c.json({ post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return c.json({ error: 'Failed to update post' }, 500);
  }
};

export const deletePost = async (c: Context<{ Bindings: Env }>) => {
  try {
    console.log('[DELETE POST] Starting delete post request');

    const authResult = await authenticateUser(c);
    if (authResult.error) {
      console.log('[DELETE POST] Auth failed:', authResult.error);
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    console.log('[DELETE POST] Auth successful, userId:', authResult.session.userId);

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      console.log('[DELETE POST] Post ID parse failed:', postIdResult.error);
      return c.json({ error: postIdResult.error.message }, postIdResult.error.status);
    }
    console.log('[DELETE POST] Post ID:', postIdResult.postId);

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES);

    // Check ownership or admin status
    console.log('[DELETE POST] Fetching post...');
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      console.log('[DELETE POST] Post not found');
      return c.json({ error: 'Post not found' }, 404);
    }
    console.log('[DELETE POST] Post found, userId:', existingPost.userId);

    const isOwner = existingPost.userId === authResult.session.userId;
    console.log('[DELETE POST] Session role:', authResult.session.role);
    const isAdmin = authResult.session.role === 'admin';
    console.log('[DELETE POST] isOwner:', isOwner, 'isAdmin:', isAdmin);

    if (!isOwner && !isAdmin) {
      console.log('[DELETE POST] Not authorized');
      return c.json({ error: 'Not authorized to delete this post' }, 403);
    }

    // If admin is deleting someone else's post, notify the owner
    const shouldNotify = isAdmin && !isOwner;
    console.log('[DELETE POST] shouldNotify:', shouldNotify);
    let postOwnerTelegramId: number | null = null;

    if (shouldNotify) {
      console.log('[DELETE POST] Fetching profile for notification...');
      // Get post owner's telegram ID for notification (userId in posts == telegramId in profiles)
      const { ProfileService } = await import('../services/profile-service');
      const profileService = new ProfileService(c.env.DB);
      const profile = await profileService.getProfile(existingPost.userId);
      postOwnerTelegramId = profile?.telegramId ?? null;
      console.log('[DELETE POST] Profile telegramId:', postOwnerTelegramId);
    }

    // Clean up R2 images before deleting post
    console.log('[DELETE POST] Cleaning up images...');
    await imageService.cleanupPostImages(postIdResult.postId);
    console.log('[DELETE POST] Images cleaned up');

    console.log('[DELETE POST] Deleting post from database...');
    // Use different method based on whether it's an admin override or owner deletion
    const deletedPost = isAdmin && !isOwner
      ? await postService.deletePostByIdOnly(postIdResult.postId)
      : await postService.deletePost(postIdResult.postId, authResult.session.userId);

    if (!deletedPost) {
      console.log('[DELETE POST] Post deletion failed');
      return c.json({ error: 'Failed to delete post' }, 500);
    }
    console.log('[DELETE POST] Post deleted from database');

    // Send notification if admin deleted another user's post
    if (shouldNotify && postOwnerTelegramId) {
      console.log('[DELETE POST] Sending bot notification...');
      const bot = getBotInstance(c.env);
      await sendPostDeletedNotification(postOwnerTelegramId, postIdResult.postId, bot);
      console.log('[DELETE POST] Notification sent');
    }

    console.log('[DELETE POST] Success!');
    return c.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    const imageService = new ImageService(db, c.env.IMAGES);

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
    const imageService = new ImageService(db, c.env.IMAGES);

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

    return c.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
};