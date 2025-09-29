import { eq, desc } from 'drizzle-orm';
import type { Database } from '../db';
import { posts } from '../db/schema';
import type { CreatePostInput, GetPostsInput, GetUserPostsInput } from '../models/post';

export class PostService {
  constructor(private db: Database) {}

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
}