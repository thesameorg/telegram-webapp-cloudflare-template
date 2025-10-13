import PostItem from "./PostItem";
import type { Post } from "../types/post";

interface StaticPostListProps {
  readonly posts: Post[];
  readonly currentUserId?: number;
  readonly showActions?: boolean;
  readonly isAdmin?: boolean;
  readonly onEdit?: (post: Post) => void;
  readonly onDelete?: (postId: number) => void;
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
