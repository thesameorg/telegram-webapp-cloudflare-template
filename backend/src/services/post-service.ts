import { eq, desc, and } from "drizzle-orm";
import type { Database } from "../db";
import { posts, postImages, userProfiles } from "../db/schema";
import type {
  CreatePostInput,
  GetPostsInput,
  GetUserPostsInput,
} from "../models/post";
import type { ImageUrlData } from "./image-service";
import type { Env } from "../types/env";

export class PostService {
  constructor(
    private db: Database,
    private env: Env,
  ) {}

  async createPost(
    userId: number,
    username: string,
    displayName: string,
    input: CreatePostInput,
  ) {
    const now = new Date().toISOString();

    const [newPost] = await this.db
      .insert(posts)
      .values({
        userId,
        username,
        displayName,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return newPost;
  }

  async getPosts(input: GetPostsInput) {
    return await this.db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }

  async getUserPosts(input: GetUserPostsInput) {
    return await this.db
      .select()
      .from(posts)
      .where(eq(posts.userId, input.userId))
      .orderBy(desc(posts.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }

  async getPostById(id: number) {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    return post;
  }

  async getPostCount() {
    const [result] = await this.db.select({ count: posts.id }).from(posts);

    return result?.count || 0;
  }

  async getUserPostCount(userId: number) {
    const [result] = await this.db
      .select({ count: posts.id })
      .from(posts)
      .where(eq(posts.userId, userId));

    return result?.count || 0;
  }

  async updatePost(id: number, userId: number, content: string) {
    const now = new Date().toISOString();

    const [updatedPost] = await this.db
      .update(posts)
      .set({
        content,
        updatedAt: now,
      })
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();

    return updatedPost;
  }

  async deletePost(id: number, userId: number) {
    const [deletedPost] = await this.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();

    return deletedPost;
  }

  async deletePostByIdOnly(id: number) {
    const [deletedPost] = await this.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();

    return deletedPost;
  }

  async updateUserDisplayNameInPosts(userId: number, newDisplayName: string) {
    const now = new Date().toISOString();

    await this.db
      .update(posts)
      .set({
        displayName: newDisplayName,
        updatedAt: now,
      })
      .where(eq(posts.userId, userId));

    return true;
  }

  async getPostsWithImages(input: GetPostsInput) {
    // Filter out posts from banned users
    const postList = await this.db
      .select({
        id: posts.id,
        userId: posts.userId,
        username: posts.username,
        displayName: posts.displayName,
        content: posts.content,
        starCount: posts.starCount,
        paymentId: posts.paymentId,
        isPaymentPending: posts.isPaymentPending,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .leftJoin(userProfiles, eq(posts.userId, userProfiles.telegramId))
      .where(eq(userProfiles.isBanned, 0))
      .orderBy(desc(posts.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get images and profile data for all posts
    const postsWithImages = await Promise.all(
      postList.map(async (post) => {
        const images = await this.getPostImagesData(post.id);

        // Get profile data for this user
        const profileResult = await this.db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.telegramId, post.userId))
          .limit(1);

        const profile = profileResult[0] || null;

        // Use profile display name if available, otherwise use post's display name
        const effectiveDisplayName = profile?.displayName || post.displayName;

        return {
          ...post,
          displayName: effectiveDisplayName,
          profile: profile
            ? {
                displayName: profile.displayName,
                bio: profile.bio,
                profileImageKey: profile.profileImageKey,
              }
            : null,
          images,
        };
      }),
    );

    return postsWithImages;
  }

  async getUserPostsWithImages(input: GetUserPostsInput) {
    const userPosts = await this.db
      .select()
      .from(posts)
      .where(eq(posts.userId, input.userId))
      .orderBy(desc(posts.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get images and profile data for all posts
    const postsWithImages = await Promise.all(
      userPosts.map(async (post) => {
        const images = await this.getPostImagesData(post.id);

        // Get profile data for this user
        const profileResult = await this.db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.telegramId, post.userId))
          .limit(1);

        const profile = profileResult[0] || null;

        // Use profile display name if available, otherwise use post's display name
        const effectiveDisplayName = profile?.displayName || post.displayName;

        return {
          ...post,
          displayName: effectiveDisplayName,
          profile: profile
            ? {
                displayName: profile.displayName,
                bio: profile.bio,
                profileImageKey: profile.profileImageKey,
              }
            : null,
          images,
        };
      }),
    );

    return postsWithImages;
  }

  async getPostByIdWithImages(id: number) {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) {
      return null;
    }

    const images = await this.getPostImagesData(post.id);

    // Get profile data for this user
    const profileResult = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.telegramId, post.userId))
      .limit(1);

    const profile = profileResult[0] || null;

    // Use profile display name if available, otherwise use post's display name
    const effectiveDisplayName = profile?.displayName || post.displayName;

    return {
      ...post,
      displayName: effectiveDisplayName,
      profile: profile
        ? {
            displayName: profile.displayName,
            bio: profile.bio,
            profileImageKey: profile.profileImageKey,
          }
        : null,
      images,
    };
  }

  private async getPostImagesData(postId: number): Promise<ImageUrlData[]> {
    const images = await this.db
      .select()
      .from(postImages)
      .where(eq(postImages.postId, postId))
      .orderBy(postImages.uploadOrder);

    return images.map((image) => ({
      id: image.id,
      imageKey: image.imageKey,
      thumbnailKey: image.thumbnailKey,
      width: image.width,
      height: image.height,
      originalName: image.originalName,
      fileSize: image.fileSize,
      uploadOrder: image.uploadOrder,
    }));
  }
}
