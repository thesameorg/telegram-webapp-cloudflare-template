import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ProfileView } from '../components/profile/ProfileView';
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton';
import StaticPostList from '../components/StaticPostList';
import { ImageUrlData } from '../components/ImageGallery';
import { useSimpleAuth } from '../hooks/use-simple-auth';

interface ProfileData {
  telegram_id: number;
  display_name?: string;
  bio?: string;
  contact_links?: {
    website?: string;
    telegram?: string;
  };
  profile_image_key?: string;
  created_at: string;
}

interface PostProfile {
  displayName?: string;
  bio?: string;
  profileImageKey?: string;
}

interface PostData {
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

export default function UserProfile() {
  const { telegramId } = useParams<{ telegramId: string }>();
  const { isAdmin } = useSimpleAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) return;

        const response = await fetch('/api/auth', {
          headers: {
            'x-session-id': sessionId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user.id);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!telegramId) {
        setError('Invalid profile ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/profile/${telegramId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Profile not found');
          } else {
            setError('Failed to load profile');
          }
          return;
        }

        const data = await response.json();
        setProfile(data.profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [telegramId]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!telegramId) return;

      try {
        const response = await fetch(`/api/posts/user/${telegramId}`);

        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        } else {
          console.error('Failed to fetch user posts');
        }
      } catch (error) {
        console.error('Error fetching user posts:', error);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchUserPosts();
  }, [telegramId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Profile not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            The profile you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.telegram_id;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <ProfileView
        profile={profile}
        isOwnProfile={isOwnProfile}
        postCount={posts.length}
      />

      {/* Posts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Posts
          </h3>
        </div>

        {postsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading posts...</p>
          </div>
        ) : posts.length > 0 ? (
          <StaticPostList
            posts={posts}
            currentUserId={currentUserId || undefined}
            showActions={isOwnProfile || isAdmin}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {isOwnProfile ? "You haven&apos;t posted anything yet." : "No posts yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}