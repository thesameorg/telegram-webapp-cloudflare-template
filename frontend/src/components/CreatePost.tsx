import PostFormModal from './PostFormModal';

interface CreatePostProps {
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  return (
    <PostFormModal
      mode="create"
      onClose={onClose}
      onSuccess={onPostCreated}
    />
  );
}
