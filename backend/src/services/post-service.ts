import { eq, desc, and } from 'drizzle-orm';
import type { Database } from '../db';
import { posts, postImages } from '../db/schema';
import type { CreatePostInput, GetPostsInput, GetUserPostsInput } from '../models/post';
import type { ImageUrlData } from './image-service';
import type { Env } from '../types/env';

export class PostService {
  private r2BaseUrl: string;

  constructor(private db: Database, private env: Env) {
    // In local development, serve images through the worker's /r2 endpoint
    // In production, use the direct R2 public URL for better performance
    if (this.env.ENVIRONMENT === 'local' || this.env.ENVIRONMENT === 'development') {
      // Use ngrok URL if available (for mobile access), otherwise localhost
      const baseUrl = this.env.LOCAL_BASE_URL || 'http://localhost:3000';
      this.r2BaseUrl = `${baseUrl}/r2`;
    } else {
      this.r2BaseUrl = 'https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev';
    }
  }

  private generateImageUrl(key: string): string {
    return `${this.r2BaseUrl}/${key}`;
  }

  async createPost(
    userId: number,
    username: string,
    displayName: string,
    input: CreatePostInput
  ) {
    const now = new Date().toISOString();

    const [newPost] = await this.db.insert(posts).values({
      userId,
      username,
      displayName,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    }).returning();

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
    const [result] = await this.db
      .select({ count: posts.id })
      .from(posts);

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
        updatedAt: now
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

  async getPostsWithImages(input: GetPostsInput) {
    const postList = await this.db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get images for all posts
    const postsWithImages = await Promise.all(
      postList.map(async (post) => {
        const images = await this.getPostImagesData(post.id);
        return {
          ...post,
          images
        };
      })
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

    // Get images for all posts
    const postsWithImages = await Promise.all(
      userPosts.map(async (post) => {
        const images = await this.getPostImagesData(post.id);
        return {
          ...post,
          images
        };
      })
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
    return {
      ...post,
      images
    };
  }

  private async getPostImagesData(postId: number): Promise<ImageUrlData[]> {
    const images = await this.db
      .select()
      .from(postImages)
      .where(eq(postImages.postId, postId))
      .orderBy(postImages.uploadOrder);

    return images.map(image => ({
      id: image.id,
      imageUrl: this.generateImageUrl(image.imageKey),
      thumbnailUrl: this.generateImageUrl(image.thumbnailKey),
      width: image.width,
      height: image.height,
      originalName: image.originalName,
      fileSize: image.fileSize,
      uploadOrder: image.uploadOrder,
    }));
  }
}