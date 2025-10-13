import { Context } from "hono";
import { PostService } from "../services/post-service";
import { ImageService } from "../services/image-service";
import { createPostSchema, updatePostSchema } from "../models/post";
import type { Env } from "../types/env";
import type { ImageUploadData } from "../services/image-service";
import {
  getBotInstance,
  sendPostDeletedNotification,
} from "../services/notification-service";
import {
  parsePagination,
  parsePostId,
  createPaginationResponse,
} from "../utils/request-helpers";
import type { AuthContext } from "../middleware/auth-middleware";
import { SessionManager } from "../services/session-manager";
import { asyncHandler } from "../utils/error-handler";
import { validateBody } from "../utils/validation-handler";
import type { DBContext } from "../middleware/db-middleware";

// Helper: Check if viewer is admin (for public endpoints)
async function isViewerAdmin(
  c: Context<DBContext> | Context<{ Bindings: Env }>,
): Promise<boolean> {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return false;
    }

    const sessionId = authHeader.substring(7);
    const sessionManager = new SessionManager(c.env.SESSIONS, c.env);
    const session = await sessionManager.validateSession(sessionId);

    return session?.role === "admin";
  } catch {
    return false;
  }
}

export const getAllPosts = asyncHandler(async (c: Context<DBContext>) => {
  const { limit, offset } = parsePagination(c);

  const db = c.get("db");
  const postService = new PostService(db, c.env);
  const posts = await postService.getPostsWithImages({ limit, offset });

  const responseData = createPaginationResponse(posts, limit, offset);

  return c.json({
    posts: responseData.items,
    pagination: responseData.pagination,
  });
});

export const getPostById = asyncHandler(async (c: Context<DBContext>) => {
  const postIdResult = parsePostId(c);
  if (postIdResult.error) {
    return c.json(
      { error: postIdResult.error.message },
      postIdResult.error.status,
    );
  }

  const db = c.get("db");
  const postService = new PostService(db, c.env);

  const post = await postService.getPostByIdWithImages(postIdResult.postId);

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Check if post author is banned
  const { ProfileService } = await import("../services/profile-service");
  const profileService = new ProfileService(c.env.DB);
  const authorProfile = await profileService.getProfile(post.userId);

  if (authorProfile && authorProfile.isBanned === 1) {
    // Check if viewer is admin (only admins can see banned users' posts)
    const viewerIsAdmin = await isViewerAdmin(c);

    // If author is banned and viewer is not admin, return 404
    if (!viewerIsAdmin) {
      return c.json({ error: "Post not found" }, 404);
    }
  }

  return c.json({ post });
});

export const getUserPosts = asyncHandler(async (c: Context<DBContext>) => {
  const userIdParam = c.req.param("userId");
  if (!userIdParam || userIdParam === "undefined" || userIdParam === "null") {
    return c.json({ error: "User ID is required" }, 400);
  }

  const userId = parseInt(userIdParam, 10);
  if (isNaN(userId)) {
    return c.json({ error: "Invalid user ID" }, 400);
  }

  const { limit, offset } = parsePagination(c);

  const db = c.get("db");
  const postService = new PostService(db, c.env);

  // Check if target user is banned
  const { ProfileService } = await import("../services/profile-service");
  const profileService = new ProfileService(c.env.DB);
  const targetProfile = await profileService.getProfile(userId);

  if (targetProfile && targetProfile.isBanned === 1) {
    // Check if viewer is admin (only admins can see banned users' posts)
    const viewerIsAdmin = await isViewerAdmin(c);

    // If user is banned and viewer is not admin, return empty array
    if (!viewerIsAdmin) {
      const responseData = createPaginationResponse([], limit, offset);
      return c.json({
        posts: responseData.items,
        pagination: responseData.pagination,
      });
    }
  }

  const posts = await postService.getUserPostsWithImages({
    userId,
    limit,
    offset,
  });

  const responseData = createPaginationResponse(posts, limit, offset);
  return c.json({
    posts: responseData.items,
    pagination: responseData.pagination,
  });
});

export const createPost = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const validation = await validateBody(c, createPostSchema);
    if ("error" in validation) return validation.error;

    const db = c.get("db");
    const postService = new PostService(db, c.env);

    const newPost = await postService.createPost(
      session.userId,
      session.username ?? `user_${session.userId}`,
      session.displayName,
      { content: validation.data.content },
    );

    return c.json({ post: newPost }, 201);
  },
);

export const updatePost = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const validation = await validateBody(c, updatePostSchema);
    if ("error" in validation) return validation.error;

    const db = c.get("db");
    const postService = new PostService(db, c.env);

    // Check ownership
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }
    if (existingPost.userId !== session.userId) {
      return c.json({ error: "Not authorized to update this post" }, 403);
    }

    const updatedPost = await postService.updatePost(
      postIdResult.postId,
      session.userId,
      validation.data.content,
    );

    if (!updatedPost) {
      return c.json({ error: "Failed to update post" }, 500);
    }

    return c.json({ post: updatedPost });
  },
);

export const deletePost = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    console.log(
      `[DELETE POST] User ${session.userId} deleting post ${postIdResult.postId}`,
    );

    const db = c.get("db");
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES);

    // Check ownership or admin status
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }

    const isOwner = existingPost.userId === session.userId;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return c.json({ error: "Not authorized to delete this post" }, 403);
    }

    // If admin is deleting someone else's post, notify the owner
    const shouldNotify = isAdmin && !isOwner;
    let postOwnerTelegramId: number | null = null;

    if (shouldNotify) {
      // Get post owner's telegram ID for notification (userId in posts == telegramId in profiles)
      const { ProfileService } = await import("../services/profile-service");
      const profileService = new ProfileService(c.env.DB);
      const profile = await profileService.getProfile(existingPost.userId);
      postOwnerTelegramId = profile?.telegramId ?? null;
    }

    // Clean up R2 images before deleting post
    await imageService.cleanupPostImages(postIdResult.postId);

    // Use different method based on whether it's an admin override or owner deletion
    const deletedPost =
      isAdmin && !isOwner
        ? await postService.deletePostByIdOnly(postIdResult.postId)
        : await postService.deletePost(postIdResult.postId, session.userId);

    if (!deletedPost) {
      return c.json({ error: "Failed to delete post" }, 500);
    }

    // Send notification if admin deleted another user's post
    if (shouldNotify && postOwnerTelegramId) {
      const bot = getBotInstance(c.env);
      await sendPostDeletedNotification(
        postOwnerTelegramId,
        postIdResult.postId,
        bot,
      );
    }

    return c.json({ message: "Post deleted successfully" });
  },
);

// Helper: Process single image from form data
async function processImageFromForm(
  key: string,
  value: File,
  formData: FormData,
  imageService: ImageService,
): Promise<{ image?: ImageUploadData; error?: string }> {
  const arrayBuffer = await value.arrayBuffer();

  // Validate image
  if (!(await imageService.validateImageFile(arrayBuffer, value.type))) {
    return { error: `Invalid image file: ${value.name}` };
  }

  // Get thumbnail data from form
  const thumbnailKey = key.replace("image_", "thumbnail_");
  const thumbnailFile = formData.get(thumbnailKey) as File;
  if (!thumbnailFile) {
    return { error: `Thumbnail missing for image: ${value.name}` };
  }

  const thumbnailBuffer = await thumbnailFile.arrayBuffer();
  if (!(await imageService.validateThumbnailFile(thumbnailBuffer))) {
    return { error: `Invalid thumbnail file: ${value.name}` };
  }

  // Get metadata from form
  const orderKey = key.replace("image_", "order_");
  const widthKey = key.replace("image_", "width_");
  const heightKey = key.replace("image_", "height_");

  const uploadOrder = parseInt(formData.get(orderKey) as string) || 1;
  const width = parseInt(formData.get(widthKey) as string) || 0;
  const height = parseInt(formData.get(heightKey) as string) || 0;

  return {
    image: {
      originalName: value.name,
      mimeType: value.type,
      fileSize: arrayBuffer.byteLength,
      width,
      height,
      uploadOrder,
      imageBuffer: arrayBuffer,
      thumbnailBuffer,
    },
  };
}

// Helper: Parse images from form data
async function parseImagesFromFormData(
  formData: FormData,
  imageService: ImageService,
): Promise<{ images?: ImageUploadData[]; error?: string }> {
  const images: ImageUploadData[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("image_") && value instanceof File) {
      const result = await processImageFromForm(
        key,
        value,
        formData,
        imageService,
      );
      if (result.error) {
        return { error: result.error };
      }
      if (result.image) {
        images.push(result.image);
      }
    }
  }

  return { images };
}

export const uploadPostImages = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const db = c.get("db");
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES);

    // Check if post exists and user owns it
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }
    if (existingPost.userId !== session.userId) {
      return c.json(
        { error: "Not authorized to upload images to this post" },
        403,
      );
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const parseResult = await parseImagesFromFormData(formData, imageService);

    if (parseResult.error) {
      return c.json({ error: parseResult.error }, 400);
    }

    const images = parseResult.images || [];

    if (images.length === 0) {
      return c.json({ error: "No valid images provided" }, 400);
    }

    if (images.length > 10) {
      return c.json({ error: "Maximum 10 images allowed per post" }, 400);
    }

    // Check if adding these images would exceed the limit
    const currentImageCount = await imageService.getImageCount(
      postIdResult.postId,
    );
    if (currentImageCount + images.length > 10) {
      return c.json({ error: "Maximum 10 images allowed per post" }, 400);
    }

    // Upload all images
    const uploadedImages = await imageService.uploadImages(
      postIdResult.postId,
      images,
    );

    return c.json(
      {
        message: "Images uploaded successfully",
        images: uploadedImages.map((img) => ({
          id: img.id,
          originalName: img.originalName,
          uploadOrder: img.uploadOrder,
          width: img.width,
          height: img.height,
          fileSize: img.fileSize,
        })),
      },
      201,
    );
  },
);

export const deletePostImage = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const imageId = parseInt(c.req.param("imageId"), 10);
    if (isNaN(imageId)) {
      return c.json({ error: "Invalid image ID" }, 400);
    }

    const db = c.get("db");
    const postService = new PostService(db, c.env);
    const imageService = new ImageService(db, c.env.IMAGES);

    // Check if post exists and user owns it
    const existingPost = await postService.getPostById(postIdResult.postId);
    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }
    if (existingPost.userId !== session.userId) {
      return c.json(
        { error: "Not authorized to delete images from this post" },
        403,
      );
    }

    const deleted = await imageService.deleteImage(
      imageId,
      postIdResult.postId,
    );
    if (!deleted) {
      return c.json({ error: "Image not found" }, 404);
    }

    return c.json({ message: "Image deleted successfully" });
  },
);
