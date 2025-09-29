import { useState, useRef } from 'react';
import PostList from '../components/PostList';
import CreatePostButton from '../components/CreatePostButton';
import CreatePost from '../components/CreatePost';

export default function Feed() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const refetchRef = useRef<(() => void) | null>(null);

  const handlePostCreated = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feed</h1>
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

      {/* Posts Feed */}
      <PostList onRefetchReady={(refetch) => { refetchRef.current = refetch; }} />
    </div>
  );
}