import { useState, useRef } from "react";
import PostList from "../components/PostList";
import CreatePostButton from "../components/CreatePostButton";
import CreatePost from "../components/CreatePost";
import EditPost from "../components/EditPost";
import DeletePostConfirm from "../components/DeletePostConfirm";
import MakePremiumModal from "../components/MakePremiumModal";
import { useAuth } from "../contexts/AuthContext";
import { useDeepLink } from "../hooks/useDeepLink";

interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  starCount?: number;
  commentCount?: number;
  paymentId?: string | null;
  isPaymentPending?: number;
  createdAt: string;
  updatedAt: string;
}

export default function Feed() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [makingPremiumPostId, setMakingPremiumPostId] = useState<number | null>(
    null,
  );
  const refetchRef = useRef<(() => void) | null>(null);
  const { user, isAdmin } = useAuth();

  // Handle deep linking from Telegram start parameters
  useDeepLink();

  const handlePostCreated = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
  };

  const handlePostUpdated = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
    setEditingPost(null);
  };

  const handleDelete = (postId: number) => {
    setDeletingPostId(postId);
  };

  const handlePostDeleted = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
    setDeletingPostId(null);
  };

  const handleMakePremium = (postId: number) => {
    setMakingPremiumPostId(postId);
  };

  const handlePaymentSuccess = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Feed
          </h1>
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

      {/* Make Premium Modal */}
      {makingPremiumPostId && (
        <MakePremiumModal
          postId={makingPremiumPostId}
          onClose={() => setMakingPremiumPostId(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Posts Feed */}
      <PostList
        currentUserId={user?.id}
        showActions={true}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMakePremium={handleMakePremium}
        onRefetchReady={(refetch) => {
          refetchRef.current = refetch;
        }}
      />
    </div>
  );
}
