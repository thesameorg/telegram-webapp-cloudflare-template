import PostItem from "./PostItem";
import { ImageUrlData } from "./ImageGallery";

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

interface StaticPostListProps {
  posts: Post[];
  currentUserId?: number;
  showActions?: boolean;
  isAdmin?: boolean;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
}

export default function StaticPostList({
  posts,
  currentUserId,
  showActions,
  isAdmin,
  onEdit,
  onDelete,
}: StaticPostListProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          showActions={showActions}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
