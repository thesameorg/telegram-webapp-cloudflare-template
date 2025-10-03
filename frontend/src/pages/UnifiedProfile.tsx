import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTelegram } from "../utils/telegram";
import { ProfileView } from "../components/profile/ProfileView";
import { ProfileSkeleton } from "../components/profile/ProfileSkeleton";
import { TelegramInfoSection } from "../components/TelegramInfoSection";
import { CollapsibleSection } from "../components/CollapsibleSection";
import PostList from "../components/PostList";
import StaticPostList from "../components/StaticPostList";
import EditPost from "../components/EditPost";
import DeletePostConfirm from "../components/DeletePostConfirm";
import BanUserConfirm from "../components/BanUserConfirm";
import MakePremiumModal from "../components/MakePremiumModal";
import { ImageUrlData } from "../components/ImageGallery";
import { config } from "../config";

interface ProfileData {
  telegram_id: number;
  display_name?: string;
  bio?: string;
  phone_number?: string;
  contact_links?: {
    website?: string;
    telegram?: string;
  };
  profile_image_key?: string;
  created_at?: string;
  updated_at?: string;
  is_banned?: boolean;
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
  starCount?: number;
  paymentId?: string | null;
  isPaymentPending?: number;
  createdAt: string;
  updatedAt: string;
  images?: ImageUrlData[];
  profile?: PostProfile | null;
}

export default function UnifiedProfile() {
  const { telegramId } = useParams<{ telegramId: string }>();
  const navigate = useNavigate();
  const { user, sessionId, expiresAt, isLoading, isAdmin } = useAuth();
  const { webApp } = useTelegram();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [makingPremiumPostId, setMakingPremiumPostId] = useState<number | null>(
    null,
  );
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const refetchRef = useRef<(() => void) | null>(null);

  // Parse telegram ID and determine if own profile
  const actualUserId = telegramId ? parseInt(telegramId) : null;
  const isOwnProfile = user?.id === actualUserId;

  const formatExpiryDate = (timestamp: number | null) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleString();
  };

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!actualUserId) {
        setError("Invalid profile ID");
        setProfileLoading(false);
        return;
      }

      try {
        const endpoint = isOwnProfile
          ? "/api/profile/me"
          : `/api/profile/${actualUserId}`;
        const fetchOptions: RequestInit = {
          credentials: "include",
        };

        if (isOwnProfile && sessionId) {
          fetchOptions.headers = { "x-session-id": sessionId };
        }

        const response = await fetch(
          `${config.apiBaseUrl}${endpoint}`,
          fetchOptions,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Profile not found");
          } else {
            setError("Failed to load profile");
          }
          return;
        }

        const data = await response.json();
        setProfile(data.profile);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError("Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [actualUserId, isOwnProfile, sessionId]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!actualUserId) return;

      try {
        const response = await fetch(
          `${config.apiBaseUrl}/api/posts/user/${actualUserId}`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        } else {
          console.error("Failed to fetch user posts");
        }
      } catch (error) {
        console.error("Error fetching user posts:", error);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();
  }, [actualUserId]);

  // Post action handlers
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

  const handleEdit = (post: PostData) => {
    setEditingPost(post);
  };

  const handleDelete = (postId: number) => {
    setDeletingPostId(postId);
  };

  const handleMakePremium = (postId: number) => {
    setMakingPremiumPostId(postId);
  };

  const handlePaymentSuccess = () => {
    if (refetchRef.current) {
      refetchRef.current();
    }
  };

  const handleEditProfile = () => {
    navigate("/edit-profile");
  };

  const handleBanClick = () => {
    setShowBanConfirm(true);
  };

  const handleBanActionCompleted = () => {
    // Refetch profile to get updated ban status
    setProfileLoading(true);
    const fetchProfile = async () => {
      if (!actualUserId) return;

      try {
        const response = await fetch(
          `${config.apiBaseUrl}/api/profile/${actualUserId}`,
          {
            credentials: "include",
          },
        );
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error("Error refetching profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
    setShowBanConfirm(false);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {error || "Profile not found"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            The profile you&apos;re looking for doesn&apos;t exist or
            couldn&apos;t be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isOwnProfile ? "My Profile" : "Profile"}
        </h1>
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

      {/* Ban User Confirmation */}
      {showBanConfirm && profile && (
        <BanUserConfirm
          telegramId={profile.telegram_id}
          username={profile.contact_links?.telegram}
          isBanned={profile.is_banned === true}
          onClose={() => setShowBanConfirm(false)}
          onActionCompleted={handleBanActionCompleted}
        />
      )}

      <div className="p-4 space-y-6">
        {/* Profile Section - Always visible */}
        <ProfileView
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditClick={isOwnProfile ? handleEditProfile : undefined}
          onBanClick={!isOwnProfile && isAdmin ? handleBanClick : undefined}
          postCount={posts.length}
          isAdmin={isAdmin}
        />

        {/* Telegram Info - Only for own profile */}
        {isOwnProfile && <TelegramInfoSection user={user} isAdmin={isAdmin} />}

        {/* Session Info - Only for own profile, collapsible */}
        {isOwnProfile && (
          <CollapsibleSection
            title="Session Information"
            defaultExpanded={false}
          >
            <div className="space-y-3 pt-4">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">
                  Session ID
                </span>
                <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                  {sessionId || "Not available"}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">
                  Session Expires
                </span>
                <p className="text-gray-900 dark:text-white">
                  {formatExpiryDate(expiresAt)}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* App Info - Only for own profile, collapsible */}
        {isOwnProfile && webApp && (
          <CollapsibleSection title="App Information" defaultExpanded={false}>
            <div className="space-y-3 pt-4">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">
                  Platform
                </span>
                <p className="text-gray-900 dark:text-white">
                  {webApp.platform}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">
                  Version
                </span>
                <p className="text-gray-900 dark:text-white">
                  {webApp.version}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">
                  Theme
                </span>
                <p className="text-gray-900 dark:text-white capitalize">
                  {webApp.colorScheme}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Posts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Posts
            </h3>
          </div>

          {postsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Loading posts...
              </p>
            </div>
          ) : posts.length > 0 ? (
            isOwnProfile ? (
              <PostList
                userId={actualUserId!}
                currentUserId={user?.id}
                showActions={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMakePremium={handleMakePremium}
                onRefetchReady={(refetch) => {
                  refetchRef.current = refetch;
                }}
              />
            ) : (
              <StaticPostList
                posts={posts}
                currentUserId={user?.id}
                showActions={isAdmin}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            )
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {isOwnProfile
                  ? "You haven't posted anything yet."
                  : "No posts yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
