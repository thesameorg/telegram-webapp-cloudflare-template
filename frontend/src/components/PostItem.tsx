import { useNavigate } from "react-router-dom";
import ImageGallery from "./ImageGallery";
import { ProfileAvatar } from "./profile/ProfileAvatar";
import ShareButton from "./ShareButton";
import ActionButton from "./ActionButton";
import EditIcon from "./icons/edit.svg";
import DeleteIcon from "./icons/delete.svg";
import StarIcon from "./icons/star.svg";
import CommentIcon from "./icons/comment.svg";
import type { Post } from "../types/post";
import { formatTimeAgo } from "../utils/format";

interface PostItemProps {
  post: Post;
  currentUserId?: number;
  showActions?: boolean;
  isAdmin?: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
  onMakePremium?: (postId: number) => void;
  hideCommentsButton?: boolean;
}

export default function PostItem({
  post,
  currentUserId,
  showActions,
  isAdmin,
  onEdit,
  onDelete,
  onMakePremium,
  hideCommentsButton = false,
}: PostItemProps) {
  const navigate = useNavigate();

  const getGoldenGradientStyle = (starCount: number) => {
    if (starCount === 0) return {};

    // Linear interpolation from light gold to bright gold
    const intensity = starCount / 10;
    const lightness = 90 - intensity * 30; // Lighter for low stars, darker for high stars
    const saturation = 70 + intensity * 20; // More saturated for higher stars

    return {
      borderImage: "linear-gradient(135deg, #FFD700, #FFA500) 1",
      borderWidth: "2px",
      borderStyle: "solid",
      boxShadow: `0 0 ${10 + starCount * 2}px rgba(255, 215, 0, ${0.3 + intensity * 0.4})`,
      background: `linear-gradient(135deg, hsl(45, ${saturation}%, ${lightness}%), hsl(39, ${saturation + 10}%, ${lightness - 5}%))`,
    };
  };

  const handleUserClick = () => {
    navigate(`/profile/${post.userId}`);
  };

  const isOwner = currentUserId === post.userId;
  const canEdit = showActions && isOwner; // Users (including admins) can edit their own posts
  const canDelete = showActions && (isOwner || isAdmin);
  const isAdminDeletingOthers = isAdmin && !isOwner && canDelete;

  const isPremium = (post.starCount ?? 0) > 0;
  const isPending = post.isPaymentPending === 1;

  return (
    <div
      className={`relative border-b p-4 transition-colors ${
        isPremium
          ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
      style={isPremium ? getGoldenGradientStyle(post.starCount!) : undefined}
    >
      {/* Loading overlay for pending payment - only show to post owner */}
      {isPending && isOwner && (
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            <span className="text-sm text-white font-medium">
              Processing payment...
            </span>
          </div>
        </div>
      )}

      {/* Star badge */}
      {isPremium && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1">
          <span>⭐️</span>
          <span>{post.starCount}</span>
        </div>
      )}

      {/* User info header */}
      <div className="flex items-center space-x-3 mb-3">
        <ProfileAvatar
          profileImageKey={post.profile?.profileImageKey}
          displayName={post.displayName}
          size="md"
          onClick={handleUserClick}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUserClick}
              className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:underline"
            >
              {post.displayName}
            </button>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {(canEdit ||
          canDelete ||
          (isOwner && !isPremium && !isPending && onMakePremium)) && (
          <div className="flex space-x-2">
            {isOwner && !isPremium && !isPending && onMakePremium && (
              <ActionButton
                onClick={() => onMakePremium(post.id)}
                icon={StarIcon}
                colorClass="text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                title="Make Premium"
              />
            )}
            {canEdit && (
              <ActionButton
                onClick={() => onEdit?.(post)}
                icon={EditIcon}
                colorClass="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                title="Edit post"
              />
            )}
            {canDelete && (
              <ActionButton
                onClick={() => onDelete?.(post.id)}
                icon={DeleteIcon}
                colorClass={
                  isAdminDeletingOthers
                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                }
                title={isAdminDeletingOthers ? "Delete post (Admin)" : "Delete post"}
              />
            )}
          </div>
        )}
      </div>

      {/* Post content */}
      <div className="pl-13">
        <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words mb-3">
          {post.content}
        </p>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3">
            <ImageGallery
              images={post.images}
              maxThumbnails={4}
              showInfo={false}
            />
          </div>
        )}

        {/* Bottom action row - Comments and Share */}
        {!hideCommentsButton && (
          <div className="mt-3 flex justify-between items-center">
            <button
              onClick={() => navigate(`/post/${post.id}`)}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 bg-gradient-to-r from-yellow-300 to-yellow-400 dark:from-yellow-500 dark:to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 dark:hover:from-yellow-600 dark:hover:to-yellow-700 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <img src={CommentIcon} className="w-4 h-4" alt="" />
              <span>
                {(() => {
                  const count = post.commentCount ?? 0;
                  if (count === 0) return "Comments";
                  const label = count === 1 ? "Comment" : "Comments";
                  return `${count} ${label}`;
                })()}
              </span>
            </button>
            <ShareButton postId={post.id} className="p-2" />
          </div>
        )}
      </div>
    </div>
  );
}
