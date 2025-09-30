import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '../hooks/use-simple-auth';
import { useTelegram } from '../utils/telegram';
import { AccountPageSkeleton } from '../components/skeletons';
import { ProfileView } from '../components/profile/ProfileView';
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton';

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
  created_at: string;
  updated_at?: string;
}

export default function Account() {
  const { user, sessionId, expiresAt, isLoading, isAdmin } = useSimpleAuth();
  const { webApp } = useTelegram();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const formatExpiryDate = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!sessionId) {
        setProfileLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: {
            'x-session-id': sessionId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [sessionId]);

  const handleEditProfile = () => {
    navigate('/edit-profile');
  };

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account</h1>
      </div>

      {/* Account Info */}
      <div className="p-4 space-y-6">
        {/* Profile Section */}
        {profileLoading ? (
          <ProfileSkeleton />
        ) : profile ? (
          <ProfileView
            profile={profile}
            isOwnProfile={true}
            onEditClick={handleEditProfile}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              My Profile
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your profile to share more about yourself.
            </p>
            <button
              onClick={handleEditProfile}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create Profile
            </button>
          </div>
        )}

        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Telegram Information
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Name</span>
                <p className="text-gray-900 dark:text-white">
                  {user.first_name} {user.last_name || ''}
                </p>
              </div>

              {user.username && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Username</span>
                  <p className="text-gray-900 dark:text-white">@{user.username}</p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">User ID</span>
                <p className="text-gray-900 dark:text-white">{user.id}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Language</span>
                <p className="text-gray-900 dark:text-white">{user.language_code}</p>
              </div>

              <div className="flex gap-2">
                {user.is_premium && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    ⭐ Premium User
                  </span>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    🔴 ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Session Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Session Information
          </h2>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Session ID</span>
              <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                {sessionId || 'Not available'}
              </p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Session Expires</span>
              <p className="text-gray-900 dark:text-white">
                {formatExpiryDate(expiresAt)}
              </p>
            </div>
          </div>
        </div>

        {/* App Info */}
        {webApp && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              App Information
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Platform</span>
                <p className="text-gray-900 dark:text-white">{webApp.platform}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Version</span>
                <p className="text-gray-900 dark:text-white">{webApp.version}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Theme</span>
                <p className="text-gray-900 dark:text-white capitalize">{webApp.colorScheme}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}