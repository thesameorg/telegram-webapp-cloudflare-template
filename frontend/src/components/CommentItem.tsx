import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileAvatar } from "./profile/ProfileAvatar";
import { Comment } from "../services/api";

interface CommentItemProps {
  comment: Comment;
  currentUserId?: number;
  postAuthorId?: number;
  isAdmin?: boolean;
  onEdit?: (commentId: number, content: string) => void;
  onDelete?: (commentId: number) => void;
  onHide?: (commentId: number) => void;
  onUnhide?: (commentId: number) => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  postAuthorId,
  isAdmin,
  onEdit,
  onDelete,
  onHide,
  onUnhide,
}: CommentItemProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d`;
    }
  };

  const handleUserClick = () => {
    navigate(`/profile/${comment.userId}`);
  };

  const handleEditSubmit = () => {
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      setError("Comment cannot be empty");
      return;
    }

    if (trimmedContent.length > 280) {
      setError("Comment cannot exceed 280 characters");
      return;
    }

    onEdit?.(comment.id, trimmedContent);
    setIsEditing(false);
    setError(null);
  };

  const handleEditCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
    setError(null);
  };

  const isOwner = currentUserId === comment.userId;
  const isPostAuthor = currentUserId === postAuthorId;
  const canEdit = isOwner && !comment.isHidden;
  const canDelete = isOwner || isAdmin;
  const canHide = isPostAuthor && !isOwner;

  // If comment is hidden, show skeleton
  if (comment.isHidden === 1 && !isOwner) {
    return (
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 animate-pulse" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4 animate-pulse" />
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
          This comment has been hidden by the post author
        </p>
        {isPostAuthor && (
          <button
            onClick={() => onUnhide?.(comment.id)}
            className="mt-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Unhide comment
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start space-x-3">
        <ProfileAvatar
          profileImageKey={comment.profile?.profileImageKey}
          displayName={comment.displayName}
          size="sm"
          onClick={handleUserClick}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <button
              onClick={handleUserClick}
              className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:underline"
            >
              {comment.displayName}
            </button>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTimeAgo(comment.createdAt)}
            </p>
            {comment.isHidden === 1 && isOwner && (
              <>
                <span className="text-gray-500 dark:text-gray-400">·</span>
                <span className="text-xs text-orange-500 dark:text-orange-400">
                  Hidden
                </span>
              </>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEditSubmit}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words text-sm">
                {comment.content}
              </p>

              {/* Action buttons */}
              {(canEdit || canDelete || canHide) && (
                <div className="flex items-center space-x-3 mt-2">
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete?.(comment.id)}
                      className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                  {canHide && comment.isHidden === 0 && (
                    <button
                      onClick={() => onHide?.(comment.id)}
                      className="text-xs text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400"
                    >
                      Hide
                    </button>
                  )}
                  {isPostAuthor && comment.isHidden === 1 && (
                    <button
                      onClick={() => onUnhide?.(comment.id)}
                      className="text-xs text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      Unhide
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
