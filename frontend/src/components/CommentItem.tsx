import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileAvatar } from "./profile/ProfileAvatar";
import { Comment } from "../services/api";
import { formatTimeAgo } from "../utils/format";
import ActionButton from "./ActionButton";
import EditIcon from "./icons/edit.svg";
import DeleteIcon from "./icons/delete.svg";
import HideIcon from "./icons/hide.svg";
import UnhideIcon from "./icons/unhide.svg";

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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                onClick={handleUserClick}
                className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:underline"
              >
                {comment.displayName}
              </button>
              <span className="text-gray-500 dark:text-gray-400">·</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
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

            {/* Action buttons */}
            {!isEditing && (canEdit || canDelete || canHide) && (
              <div className="flex items-center space-x-2">
                {canEdit && (
                  <ActionButton
                    onClick={() => setIsEditing(true)}
                    icon={EditIcon}
                    variant="edit"
                    title="Edit comment"
                  />
                )}
                {canDelete && (
                  <ActionButton
                    onClick={() => onDelete?.(comment.id)}
                    icon={DeleteIcon}
                    variant="delete"
                    title="Delete comment"
                  />
                )}
                {canHide && comment.isHidden === 0 && (
                  <ActionButton
                    onClick={() => onHide?.(comment.id)}
                    icon={HideIcon}
                    variant="hide"
                    title="Hide comment"
                  />
                )}
                {isPostAuthor && comment.isHidden === 1 && (
                  <ActionButton
                    onClick={() => onUnhide?.(comment.id)}
                    icon={UnhideIcon}
                    variant="edit"
                    title="Unhide comment"
                  />
                )}
              </div>
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
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words text-sm">
              {comment.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
