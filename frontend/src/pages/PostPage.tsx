import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PostItem from "../components/PostItem";
import EditPost from "../components/EditPost";
import DeletePostConfirm from "../components/DeletePostConfirm";
import MakePremiumModal from "../components/MakePremiumModal";
import CommentList from "../components/CommentList";
import ShareButton from "../components/ShareButton";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useTelegramBackButton } from "../hooks/use-telegram-back-button";
import type { Post } from "../types/post";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [makingPremiumPostId, setMakingPremiumPostId] = useState<number | null>(
    null,
  );

  // Use Telegram BackButton instead of custom button
  useTelegramBackButton(() => navigate(-1));

  const fetchPost = async () => {
    if (!postId) {
      setError("Invalid post ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.getPostById(parseInt(postId, 10));
      setPost(response.post);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load post");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handleEdit = (post: Post) => {
    setEditingPost(post);
  };

  const handlePostUpdated = () => {
    fetchPost();
    setEditingPost(null);
  };

  const handleDelete = (postId: number) => {
    setDeletingPostId(postId);
  };

  const handlePostDeleted = () => {
    // Navigate back to feed after deletion
    navigate("/");
  };

  const handleMakePremium = (postId: number) => {
    setMakingPremiumPostId(postId);
  };

  const handlePaymentSuccess = () => {
    fetchPost();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Post
          </h1>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Post not found
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              This post may have been deleted or doesn&apos;t exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Post
          </h1>
          {post && <ShareButton postId={post.id} />}
        </div>
      </div>

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

      {/* Single Post */}
      <PostItem
        post={post}
        currentUserId={user?.id}
        showActions={true}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMakePremium={handleMakePremium}
      />

      {/* Comments Section */}
      <CommentList postId={post.id} postAuthorId={post.userId} />
    </div>
  );
}
