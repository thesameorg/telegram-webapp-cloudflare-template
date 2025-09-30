import { useNavigate } from 'react-router-dom';
import ImageGallery, { ImageUrlData } from './ImageGallery';
import { ProfileAvatar } from './profile/ProfileAvatar';

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
  images?: ImageUrlData[];
  profile?: PostProfile | null;
}

interface PostItemProps {
  post: Post;
  currentUserId?: number;
  showActions?: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
}

export default function PostItem({ post, currentUserId, showActions, onEdit, onDelete }: PostItemProps) {
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

  const handleUserClick = () => {
    navigate(`/profile/${post.userId}`);
  };

  const canEditDelete = showActions && currentUserId === post.userId;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
        {canEditDelete && (
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit?.(post)}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Edit post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete?.(post.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              title="Delete post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
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