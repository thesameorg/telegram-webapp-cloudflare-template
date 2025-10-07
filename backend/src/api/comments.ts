import { Context } from "hono";
import { createDatabase } from "../db";
import { CommentService } from "../services/comment-service";
import { PostService } from "../services/post-service";
import { ProfileService } from "../services/profile-service";
import {
  createCommentSchema,
  updateCommentSchema,
} from "../models/comment";
import { SessionManager } from "../services/session-manager";
import type { Env } from "../types/env";
import { sendNewCommentNotification } from "../services/notification-service";
import { parsePagination, parsePostId } from "../utils/request-helpers";

// Helper: Extract and validate session
async function authenticateUser(c: Context<{ Bindings: Env }>) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return {
      error: { message: "Authentication required", status: 401 as const },
    };
  }

  let sessionId: string;
  if (authHeader.startsWith("Bearer ")) {
    sessionId = authHeader.substring(7).trim();
  } else if (authHeader.startsWith("Session ")) {
    sessionId = authHeader.substring(8).trim();
  } else {
    sessionId = authHeader.trim();
  }

  if (!sessionId) {
    return {
      error: { message: "Authentication required", status: 401 as const },
    };
  }

  const sessionManager = new SessionManager(c.env.SESSIONS);
  const session = await sessionManager.validateSession(sessionId);
  if (!session) {
    return {
      error: { message: "Invalid or expired session", status: 401 as const },
    };
  }

  return { session };
}

// Helper: Parse and validate comment ID
function parseCommentId(c: Context) {
  const commentId = parseInt(c.req.param("commentId"), 10);
  if (isNaN(commentId)) {
    return { error: { message: "Invalid comment ID", status: 400 as const } };
  }
  return { commentId };
}

export const getCommentsByPostId = async (c: Context<{ Bindings: Env }>) => {
  try {
    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const { limit, offset } = parsePagination(c);

    const db = createDatabase(c.env.DB);
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
  } catch (error) {
    console.error("Error fetching comments:", error);
    return c.json({ error: "Failed to fetch comments" }, 500);
  }
};

export const createComment = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json(
        { error: authResult.error.message },
        authResult.error.status,
      );
    }

    const postIdResult = parsePostId(c);
    if (postIdResult.error) {
      return c.json(
        { error: postIdResult.error.message },
        postIdResult.error.status,
      );
    }

    const body = await c.req.json();
    const result = createCommentSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: "Invalid comment data", details: result.error.issues },
        400,
      );
    }

    const db = createDatabase(c.env.DB);
    const commentService = new CommentService(db);
    const postService = new PostService(db, c.env);

    // Check if post exists
    const post = await postService.getPostById(postIdResult.postId);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    const newComment = await commentService.createComment(
      postIdResult.postId,
      authResult.session.userId,
      authResult.session.username || `user_${authResult.session.userId}`,
      authResult.session.displayName,
      result.data,
    );

    // Send notification to post author (if commenter is not the author)
    if (post.userId !== authResult.session.userId) {
      // Get post author's telegram ID
      const profileService = new ProfileService(c.env.DB);
      const profile = await profileService.getProfile(post.userId);
      const postAuthorTelegramId = profile?.telegramId ?? null;

      if (postAuthorTelegramId) {
        await sendNewCommentNotification(
          c.env,
          postAuthorTelegramId,
          postIdResult.postId,
          authResult.session.displayName,
          result.data.content,
        );
      }
    }

    return c.json({ comment: newComment }, 201);
  } catch (error) {
    console.error("Error creating comment:", error);
    return c.json({ error: "Failed to create comment" }, 500);
  }
};

export const updateComment = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json(
        { error: authResult.error.message },
        authResult.error.status,
      );
    }

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const body = await c.req.json();
    const result = updateCommentSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: "Invalid comment data", details: result.error.issues },
        400,
      );
    }

    const db = createDatabase(c.env.DB);
    const commentService = new CommentService(db);

    // Check ownership
    const existingComment = await commentService.getCommentById(
      commentIdResult.commentId,
    );
    if (!existingComment) {
      return c.json({ error: "Comment not found" }, 404);
    }
    if (existingComment.userId !== authResult.session.userId) {
      return c.json({ error: "Not authorized to update this comment" }, 403);
    }

    const updatedComment = await commentService.updateComment(
      commentIdResult.commentId,
      authResult.session.userId,
      result.data,
    );

    if (!updatedComment) {
      return c.json({ error: "Failed to update comment" }, 500);
    }

    return c.json({ comment: updatedComment });
  } catch (error) {
    console.error("Error updating comment:", error);
    return c.json({ error: "Failed to update comment" }, 500);
  }
};

export const deleteComment = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json(
        { error: authResult.error.message },
        authResult.error.status,
      );
    }

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const db = createDatabase(c.env.DB);
    const commentService = new CommentService(db);

    // Check ownership or admin status
    const existingComment = await commentService.getCommentById(
      commentIdResult.commentId,
    );
    if (!existingComment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    const isOwner = existingComment.userId === authResult.session.userId;
    const isAdmin = authResult.session.role === "admin";

    if (!isOwner && !isAdmin) {
      return c.json({ error: "Not authorized to delete this comment" }, 403);
    }

    // Use different method based on whether it's an admin override or owner deletion
    const deletedComment =
      isAdmin && !isOwner
        ? await commentService.deleteCommentByIdOnly(commentIdResult.commentId)
        : await commentService.deleteComment(
            commentIdResult.commentId,
            authResult.session.userId,
          );

    if (!deletedComment) {
      return c.json({ error: "Failed to delete comment" }, 500);
    }

    return c.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return c.json({ error: "Failed to delete comment" }, 500);
  }
};

export const hideComment = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json(
        { error: authResult.error.message },
        authResult.error.status,
      );
    }

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const db = createDatabase(c.env.DB);
    const commentService = new CommentService(db);

    // hideComment method verifies the post belongs to the user
    const hiddenComment = await commentService.hideComment(
      commentIdResult.commentId,
      authResult.session.userId,
    );

    if (!hiddenComment) {
      return c.json(
        { error: "Comment not found or not authorized to hide this comment" },
        404,
      );
    }

    return c.json({ comment: hiddenComment });
  } catch (error) {
    console.error("Error hiding comment:", error);
    return c.json({ error: "Failed to hide comment" }, 500);
  }
};

export const unhideComment = async (c: Context<{ Bindings: Env }>) => {
  try {
    const authResult = await authenticateUser(c);
    if (authResult.error) {
      return c.json(
        { error: authResult.error.message },
        authResult.error.status,
      );
    }

    const commentIdResult = parseCommentId(c);
    if (commentIdResult.error) {
      return c.json(
        { error: commentIdResult.error.message },
        commentIdResult.error.status,
      );
    }

    const db = createDatabase(c.env.DB);
    const commentService = new CommentService(db);

    // unhideComment method verifies the post belongs to the user
    const unhiddenComment = await commentService.unhideComment(
      commentIdResult.commentId,
      authResult.session.userId,
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
  } catch (error) {
    console.error("Error unhiding comment:", error);
    return c.json({ error: "Failed to unhide comment" }, 500);
  }
};
