import { useNavigate } from "react-router-dom";
import ImageGallery, { ImageUrlData } from "./ImageGallery";
import { ProfileAvatar } from "./profile/ProfileAvatar";

interface PostProfile {
  displayName?: string;
  bio?: string;
  profileImageKey?: string;
}

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  starCount?: number;
  paymentId?: string | null;
  isPaymentPending?: number;
  images?: ImageUrlData[];
  profile?: PostProfile | null;
}

interface PostItemProps {
  post: Post;
  currentUserId?: number;
  showActions?: boolean;
  isAdmin?: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
  onMakePremium?: (postId: number) => void;
}

export default function PostItem({
  post,
  currentUserId,
  showActions,
  isAdmin,
  onEdit,
  onDelete,
  onMakePremium,
}: PostItemProps) {
  const navigate = useNavigate();

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
            <button
              onClick={handleUserClick}
              className="text-sm text-gray-500 dark:text-gray-400 truncate hover:underline"
            >
              @{post.username}
            </button>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {(canEdit ||
          canDelete ||
          (isOwner && !isPremium && !isPending && onMakePremium)) && (
          <div className="flex space-x-2">
            {/* Make Premium button - only for own posts that aren't premium */}
            {isOwner && !isPremium && !isPending && onMakePremium && (
              <button
                onClick={() => onMakePremium(post.id)}
                className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors"
                title="Make Premium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit?.(post)}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                title="Edit post"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete?.(post.id)}
                className={`p-2 rounded-full transition-colors ${
                  isAdminDeletingOthers
                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
                title={
                  isAdminDeletingOthers ? "Delete post (Admin)" : "Delete post"
                }
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
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
      </div>
    </div>
  );
}
