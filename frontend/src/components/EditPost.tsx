import PostFormModal from "./PostFormModal";
import type { Post } from "../types/post";

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
