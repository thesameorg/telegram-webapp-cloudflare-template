import { eq, desc, and, sql } from "drizzle-orm";
import type { Database } from "../db";
import { comments, posts, userProfiles } from "../db/schema";
import type {
  CreateCommentInput,
  UpdateCommentInput,
  GetCommentsInput,
} from "../models/comment";

export class CommentService {
  constructor(private readonly db: Database) {}

  async createComment(
    postId: number,
    userId: number,
    username: string,
    displayName: string,
    input: CreateCommentInput,
  ) {
    const now = new Date().toISOString();

    // Create comment and increment post comment count in a transaction
    const result = await this.db.batch([
      this.db
        .insert(comments)
        .values({
          postId,
          userId,
          username,
          displayName,
          content: input.content,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      this.db
        .update(posts)
        .set({
          commentCount: sql`${posts.commentCount} + 1`,
          updatedAt: now,
        })
        .where(eq(posts.id, postId))
        .returning(),
    ]);

    return result[0][0];
  }

  async getCommentsByPostId(postId: number, input: GetCommentsInput) {
    const commentList = await this.db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get profile data for each comment author
    const commentsWithProfiles = await Promise.all(
      commentList.map(async (comment) => {
        const profileResult = await this.db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.telegramId, comment.userId))
          .limit(1);

        const profile = profileResult[0] || null;

        // Use profile display name if available, otherwise use comment's display name
        const effectiveDisplayName =
          profile?.displayName ?? comment.displayName;

        return {
          ...comment,
          displayName: effectiveDisplayName,
          profile: profile
            ? {
                displayName: profile.displayName,
                bio: profile.bio,
                profileImageKey: profile.profileImageKey,
              }
            : null,
        };
      }),
    );

    return commentsWithProfiles;
  }

  async getCommentById(id: number) {
    const [comment] = await this.db
      .select()
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);

    return comment;
  }

  async updateComment(id: number, userId: number, input: UpdateCommentInput) {
    const now = new Date().toISOString();

    const [updatedComment] = await this.db
      .update(comments)
      .set({
        content: input.content,
        updatedAt: now,
      })
      .where(and(eq(comments.id, id), eq(comments.userId, userId)))
      .returning();

    return updatedComment;
  }

  async deleteComment(id: number, userId: number) {
    // Get comment to get postId for decrementing count
    const comment = await this.getCommentById(id);
    if (!comment) {
      return null;
    }

    const now = new Date().toISOString();

    // Delete comment and decrement post comment count in a transaction
    const result = await this.db.batch([
      this.db
        .delete(comments)
        .where(and(eq(comments.id, id), eq(comments.userId, userId)))
        .returning(),
      this.db
        .update(posts)
        .set({
          commentCount: sql`MAX(0, ${posts.commentCount} - 1)`,
          updatedAt: now,
        })
        .where(eq(posts.id, comment.postId))
        .returning(),
    ]);

    return result[0][0];
  }

  async deleteCommentByIdOnly(id: number) {
    // Get comment to get postId for decrementing count
    const comment = await this.getCommentById(id);
    if (!comment) {
      return null;
    }

    const now = new Date().toISOString();

    // Delete comment and decrement post comment count in a transaction
    const result = await this.db.batch([
      this.db.delete(comments).where(eq(comments.id, id)).returning(),
      this.db
        .update(posts)
        .set({
          commentCount: sql`MAX(0, ${posts.commentCount} - 1)`,
          updatedAt: now,
        })
        .where(eq(posts.id, comment.postId))
        .returning(),
    ]);

    return result[0][0];
  }

  async hideComment(id: number, postAuthorId: number) {
    // Verify the post belongs to the user trying to hide the comment
    const comment = await this.getCommentById(id);
    if (!comment) {
      return null;
    }

    const [post] = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, comment.postId))
      .limit(1);

    if (!post || post.userId !== postAuthorId) {
      return null;
    }

    const now = new Date().toISOString();

    const [hiddenComment] = await this.db
      .update(comments)
      .set({
        isHidden: 1,
        updatedAt: now,
      })
      .where(eq(comments.id, id))
      .returning();

    return hiddenComment;
  }

  async unhideComment(id: number, postAuthorId: number) {
    // Verify the post belongs to the user trying to unhide the comment
    const comment = await this.getCommentById(id);
    if (!comment) {
      return null;
    }

    const [post] = await this.db
      .select()
      .from(posts)
      .where(eq(posts.id, comment.postId))
      .limit(1);

    if (!post || post.userId !== postAuthorId) {
      return null;
    }

    const now = new Date().toISOString();

    const [unhiddenComment] = await this.db
      .update(comments)
      .set({
        isHidden: 0,
        updatedAt: now,
      })
      .where(eq(comments.id, id))
      .returning();

    return unhiddenComment;
  }

  async getCommentCount(postId: number) {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.postId, postId));

    return result[0]?.count || 0;
  }
}
