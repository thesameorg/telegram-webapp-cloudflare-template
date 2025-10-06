import PostFormModal from "./PostFormModal";

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

interface EditPostProps {
  post: Post;
  onClose: () => void;
  onPostUpdated?: () => void;
}

export default function EditPost({
  post,
  onClose,
  onPostUpdated,
}: EditPostProps) {
  return (
    <PostFormModal
      mode="edit"
      post={post}
      onClose={onClose}
      onSuccess={onPostUpdated}
    />
  );
}
