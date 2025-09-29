import ImageGallery, { ImageUrlData } from './ImageGallery';

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  images?: ImageUrlData[];
}

interface PostItemProps {
  post: Post;
  currentUserId?: number;
  showActions?: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
}

export default function PostItem({ post, currentUserId, showActions, onEdit, onDelete }: PostItemProps) {
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

  const canEditDelete = showActions && currentUserId === post.userId;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      {/* User info header */}
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
          {post.displayName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {post.displayName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{post.username}
            </p>
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