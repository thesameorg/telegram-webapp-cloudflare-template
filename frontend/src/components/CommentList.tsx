import { useState, useEffect } from "react";
import { api, Comment } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";

interface CommentListProps {
  postId: number;
  postAuthorId: number;
}

export default function CommentList({
  postId,
  postAuthorId,
}: CommentListProps) {
  const { sessionId, user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchComments = async (newOffset: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCommentsByPostId(postId, limit, newOffset);

      if (newOffset === 0) {
        setComments(response.comments);
      } else {
        setComments((prev) => [...prev, ...response.comments]);
      }

      setHasMore(response.pagination.hasMore);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(0);
  }, [postId]);

  const handleSubmitComment = async (content: string) => {
    if (!sessionId) {
      throw new Error("You must be logged in to comment");
    }

    setIsSubmitting(true);
    try {
      await api.createComment(postId, { content }, sessionId);
      // Refresh comments to show the new one
      await fetchComments(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: number, content: string) => {
    if (!sessionId) return;

    try {
      await api.updateComment(commentId, { content }, sessionId);
      // Update the comment in the list
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content } : c)),
      );
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!sessionId) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await api.deleteComment(commentId, sessionId);
      // Remove the comment from the list
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleHideComment = async (commentId: number) => {
    if (!sessionId) return;

    try {
      await api.hideComment(commentId, sessionId);
      // Update the comment in the list
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isHidden: 1 } : c)),
      );
    } catch (err) {
      console.error("Failed to hide comment:", err);
    }
  };

  const handleUnhideComment = async (commentId: number) => {
    if (!sessionId) return;

    try {
      await api.unhideComment(commentId, sessionId);
      // Update the comment in the list
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isHidden: 0 } : c)),
      );
    } catch (err) {
      console.error("Failed to unhide comment:", err);
    }
  };

  const handleLoadMore = () => {
    fetchComments(offset + limit);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <div className="bg-white dark:bg-gray-900">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h2>
        </div>

        {/* Comment Form */}
        {user && (
          <CommentForm
            postId={postId}
            onSubmit={handleSubmitComment}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Comments List */}
        {(() => {
          if (loading && offset === 0) {
            return (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            );
          }
          if (error) {
            return (
              <div className="p-4 text-center text-red-500 dark:text-red-400">
                {error}
              </div>
            );
          }
          if (comments.length === 0) {
            return (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            );
          }
          return (
            <>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  postAuthorId={postAuthorId}
                  isAdmin={isAdmin}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onHide={handleHideComment}
                  onUnhide={handleUnhideComment}
                />
              ))}

              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Loading..." : "Load More Comments"}
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
