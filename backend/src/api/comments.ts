import { Context } from "hono";
import { CommentService } from "../services/comment-service";
import { PostService } from "../services/post-service";
import { ProfileService } from "../services/profile-service";
import { createCommentSchema, updateCommentSchema } from "../models/comment";
import { sendNewCommentNotification } from "../services/notification-service";
import { parsePagination, parsePostId } from "../utils/request-helpers";
import type { AuthContext } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/error-handler";
import { validateBody } from "../utils/validation-handler";
import type { DBContext } from "../middleware/db-middleware";

// Helper: Parse and validate comment ID
function parseCommentId(c: Context) {
  const commentId = Number.parseInt(c.req.param("commentId"), 10);
  if (Number.isNaN(commentId)) {
    return { error: { message: "Invalid comment ID", status: 400 as const } };
  }
  return { commentId };
}

export const getCommentsByPostId = asyncHandler(
  async (c: Context<DBContext>) => {
    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const { limit, offset } = parsePagination(c);

    const db = c.get("db");
    const commentService = new CommentService(db);

    const comments = await commentService.getCommentsByPostId(
      postIdResult.postId,
      { limit, offset },
    );

    return c.json({
      comments,
      pagination: {
        limit,
        offset,
        hasMore: comments.length === limit,
      },
    });
  },
);

export const createComment = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const validation = await validateBody(c, createCommentSchema);
    if ("error" in validation) return validation.error;

    const db = c.get("db");
    const commentService = new CommentService(db);
    const postService = new PostService(db, c.env);

    // Check if post exists
    const post = await postService.getPostById(postIdResult.postId);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    const newComment = await commentService.createComment(
      postIdResult.postId,
      session.userId,
      session.username ?? `user_${session.userId}`,
      session.displayName,
      validation.data,
    );

    // Send notification to post author (if commenter is not the author)
    if (post.userId !== session.userId) {
      // Get post author's telegram ID
      const profileService = new ProfileService(c.env.DB);
      const profile = await profileService.getProfile(post.userId);
      const postAuthorTelegramId = profile?.telegramId ?? null;

      if (postAuthorTelegramId) {
        await sendNewCommentNotification(
          c.env,
          postAuthorTelegramId,
          postIdResult.postId,
          session.displayName,
          validation.data.content,
        );
      }
    }

    return c.json({ comment: newComment }, 201);
  },
);

export const updateComment = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const validation = await validateBody(c, updateCommentSchema);
    if ("error" in validation) return validation.error;

    const db = c.get("db");
    const commentService = new CommentService(db);

    // Check ownership
    const existingComment = await commentService.getCommentById(
      commentIdResult.commentId,
    );
    if (!existingComment) {
      return c.json({ error: "Comment not found" }, 404);
    }
    if (existingComment.userId !== session.userId) {
      return c.json({ error: "Not authorized to update this comment" }, 403);
    }

    const updatedComment = await commentService.updateComment(
      commentIdResult.commentId,
      session.userId,
      validation.data,
    );

    if (!updatedComment) {
      return c.json({ error: "Failed to update comment" }, 500);
    }

    return c.json({ comment: updatedComment });
  },
);

export const deleteComment = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const db = c.get("db");
    const commentService = new CommentService(db);

    // Check ownership or admin status
    const existingComment = await commentService.getCommentById(
      commentIdResult.commentId,
    );
    if (!existingComment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    const isOwner = existingComment.userId === session.userId;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return c.json({ error: "Not authorized to delete this comment" }, 403);
    }

    // Use different method based on whether it's an admin override or owner deletion
    const deletedComment =
      isAdmin && !isOwner
        ? await commentService.deleteCommentByIdOnly(commentIdResult.commentId)
        : await commentService.deleteComment(
            commentIdResult.commentId,
            session.userId,
          );

    if (!deletedComment) {
      return c.json({ error: "Failed to delete comment" }, 500);
    }

    return c.json({ message: "Comment deleted successfully" });
  },
);

export const hideComment = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const db = c.get("db");
    const commentService = new CommentService(db);

    // hideComment method verifies the post belongs to the user
    const hiddenComment = await commentService.hideComment(
      commentIdResult.commentId,
      session.userId,
    );

    if (!hiddenComment) {
      return c.json(
        { error: "Comment not found or not authorized to hide this comment" },
        404,
      );
    }

    return c.json({ comment: hiddenComment });
  },
);

export const unhideComment = asyncHandler(
  async (c: Context<AuthContext & DBContext>) => {
    const session = c.get("session");

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const db = c.get("db");
    const commentService = new CommentService(db);

    // unhideComment method verifies the post belongs to the user
    const unhiddenComment = await commentService.unhideComment(
      commentIdResult.commentId,
      session.userId,
    );

    if (!unhiddenComment) {
      return c.json(
        {
          error: "Comment not found or not authorized to unhide this comment",
        },
        404,
      );
    }

    return c.json({ comment: unhiddenComment });
  },
);
