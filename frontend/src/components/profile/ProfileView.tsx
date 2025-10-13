import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { ProfileAvatar } from "./ProfileAvatar";
import { ContactLinks } from "./ContactLinks";
import { getImageUrl } from "../../utils/image-url";

interface ProfileData {
  readonly telegram_id: number;
  readonly display_name?: string;
  readonly bio?: string;
  readonly phone_number?: string;
  readonly contact_links?: {
    readonly website?: string;
    readonly telegram?: string;
  };
  readonly profile_image_key?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly is_banned?: boolean;
}

interface ProfileViewProps {
  readonly profile: ProfileData;
  readonly isOwnProfile?: boolean;
  readonly onEditClick?: () => void;
  readonly onBanClick?: () => void;
  readonly postCount?: number;
  readonly isAdmin?: boolean;
}

export function ProfileView({
  profile,
  isOwnProfile = false,
  onEditClick,
  onBanClick,
  postCount,
  isAdmin = false,
}: ProfileViewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const displayName = profile.display_name || `User ${profile.telegram_id}`;
  const isBanned = profile.is_banned === true;

  const handleAvatarClick = () => {
    if (profile.profile_image_key && !isBanned) {
      setLightboxOpen(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header with avatar and basic info */}
      <div className="flex items-start space-x-4">
        {!isBanned && (
          <ProfileAvatar
            profileImageKey={profile.profile_image_key}
            displayName={displayName}
            size="xl"
            onClick={profile.profile_image_key ? handleAvatarClick : undefined}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {displayName}
              </h1>
              {isBanned && (
                <span className="px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 rounded flex-shrink-0">
                  BANNED
                </span>
              )}
            </div>
            {isOwnProfile && onEditClick && (
              <button
                onClick={onEditClick}
                className="ml-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex-shrink-0"
              >
                Edit Profile
              </button>
            )}
          </div>

          {!isBanned && profile.bio && (
            <p className="mt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            {postCount !== undefined && (
              <span>
                {postCount} {postCount === 1 ? "post" : "posts"}
              </span>
            )}
            {!isBanned && profile.created_at && (
              <span>
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Admin Ban/Unban Button - Placed below stats for compact layout */}
          {!isOwnProfile && isAdmin && onBanClick && (
            <button
              onClick={onBanClick}
              className={`mt-3 px-3 py-1.5 text-xs font-medium text-white rounded-lg ${
                isBanned
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isBanned ? "Unban User" : "Ban User"}
            </button>
          )}
        </div>
      </div>

      {/* Contact information - hide for banned users */}
      {!isBanned && (profile.phone_number || profile.contact_links) && (
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

      {/* Avatar Lightbox */}
      {profile.profile_image_key && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={[
            {
              src: getImageUrl(profile.profile_image_key),
              alt: displayName,
            },
          ]}
          animation={{ fade: 300 }}
          controller={{ closeOnBackdropClick: true }}
          toolbar={{
            buttons: ["close"],
          }}
          render={{
            slide: ({ slide }) => (
              <div className="flex items-center justify-center w-full h-full">
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    maxWidth: "90vw",
                    maxHeight: "90vh",
                  }}
                />
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}
