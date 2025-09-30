import { useState, useRef } from 'react';
import PostList from '../components/PostList';
import CreatePostButton from '../components/CreatePostButton';
import CreatePost from '../components/CreatePost';
import EditPost from '../components/EditPost';
import DeletePostConfirm from '../components/DeletePostConfirm';
import { useTelegramAuth } from '../hooks/use-telegram-auth';

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyPosts() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);
  const { user } = useTelegramAuth();

  const handlePostCreated = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
  };

  const handlePostUpdated = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
    setEditingPost(null);
  };

  const handlePostDeleted = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
    setDeletingPostId(null);
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
  };

  const handleDelete = (postId: number) => {
    setDeletingPostId(postId);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Posts</h1>
          <CreatePostButton onClick={() => setShowCreatePost(true)} />
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPost
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Delete Post Confirmation */}
      {deletingPostId && (
        <DeletePostConfirm
          postId={deletingPostId}
          onClose={() => setDeletingPostId(null)}
          onPostDeleted={handlePostDeleted}
        />
      )}

      {/* User's Posts */}
      {user?.id ? (
        <PostList
          userId={user.id}
          currentUserId={user.id}
          showActions={true}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefetchReady={(refetch) => { refetchRef.current = refetch; }}
        />
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Please authenticate to view your posts
          </p>
        </div>
      )}
    </div>
  );
}