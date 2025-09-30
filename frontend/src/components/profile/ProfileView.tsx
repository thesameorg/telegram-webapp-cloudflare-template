import { ProfileAvatar } from './ProfileAvatar';
import { ContactLinks } from './ContactLinks';

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

interface ProfileViewProps {
  profile: ProfileData;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  postCount?: number;
}

export function ProfileView({ profile, isOwnProfile = false, onEditClick, postCount }: ProfileViewProps) {
  const displayName = profile.display_name || `User ${profile.telegram_id}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header with avatar and basic info */}
      <div className="flex items-start space-x-4">
        <ProfileAvatar
          profileImageKey={profile.profile_image_key}
          displayName={displayName}
          size="xl"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {displayName}
            </h1>
            {isOwnProfile && onEditClick && (
              <button
                onClick={onEditClick}
                className="ml-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex-shrink-0"
              >
                Edit Profile
              </button>
            )}
          </div>

          {profile.bio && (
            <p className="mt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            {postCount !== undefined && (
              <span>{postCount} {postCount === 1 ? 'post' : 'posts'}</span>
            )}
            <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Contact information */}
      {(profile.phone_number || profile.contact_links) && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Contact Information
          </h3>

          <div className="space-y-4">
            {profile.phone_number && (
              <div>
                <span className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Phone
                </span>
                <a
                  href={`tel:${profile.phone_number}`}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  {profile.phone_number}
                </a>
              </div>
            )}

            {profile.contact_links && (
              <div>
                <span className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Links
                </span>
                <ContactLinks contactLinks={profile.contact_links} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}