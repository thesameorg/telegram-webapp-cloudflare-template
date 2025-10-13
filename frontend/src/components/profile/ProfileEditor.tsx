import React, { useState } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import { ContactLinks } from "./ContactLinks";
import { useToast } from "../../hooks/use-toast";
import { useTelegramMainButton } from "../../hooks/use-telegram-main-button";
import { config } from "../../config";

interface ContactLinksData {
  readonly website?: string;
  readonly telegram?: string;
}

interface ProfileData {
  readonly telegram_id: number;
  readonly display_name?: string;
  readonly bio?: string;
  readonly phone_number?: string;
  readonly contact_links?: ContactLinksData;
  readonly profile_image_key?: string;
  readonly created_at: string;
  readonly updated_at?: string;
}

interface ProfileEditorProps {
  readonly profile: ProfileData;
  readonly onSave: (updatedProfile: Partial<ProfileData>) => Promise<void>;
  readonly onCancel: () => void;
  readonly onAvatarUpdate?: () => Promise<void>;
  readonly loading?: boolean;
  readonly sessionId?: string;
}

export function ProfileEditor({
  profile,
  onSave,
  onCancel,
  onAvatarUpdate,
  loading = false,
  sessionId,
}: ProfileEditorProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    phone_number: profile.phone_number ?? "",
    contact_links: profile.contact_links ?? {},
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleContactLinksChange = (links: ContactLinksData) => {
    setFormData((prev) => ({
      ...prev,
      contact_links: links,
    }));
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      if (!sessionId) {
        throw new Error("No session found");
      }

      const response = await fetch(
        `${config.apiBaseUrl}/api/profile/me/avatar`,
        {
          method: "POST",
          headers: {
            "x-session-id": sessionId,
          },
          body: formData,
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }

      await response.json();
      showToast("Avatar updated successfully!", "success");

      // Refresh profile data to show the new avatar
      if (onAvatarUpdate) {
        await onAvatarUpdate();
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
      showToast("Failed to upload avatar", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.display_name.trim()) {
      showToast("Display name is required", "error");
      return;
    }

    try {
      await onSave({
        display_name: formData.display_name.trim(),
        bio: formData.bio.trim() || undefined,
        phone_number: formData.phone_number.trim() || undefined,
        contact_links:
          Object.keys(formData.contact_links).length > 0
            ? formData.contact_links
            : undefined,
      });
    } catch (error) {
      console.error("Profile update failed:", error);
    }
  };

  const isFormValid = formData.display_name.trim() !== "";
  const isFormChanged =
    formData.display_name !== (profile.display_name ?? "") ||
    formData.bio !== (profile.bio ?? "") ||
    formData.phone_number !== (profile.phone_number ?? "") ||
    JSON.stringify(formData.contact_links) !==
      JSON.stringify(profile.contact_links ?? {});

  // Use Telegram MainButton
  useTelegramMainButton(
    isFormValid && isFormChanged && !loading && !uploadingAvatar
      ? {
          text: loading ? "Saving..." : "Save Changes",
          onClick: () => {
            const form = document.getElementById(
              "profile-form",
            ) as HTMLFormElement;
            form?.requestSubmit();
          },
          disabled: loading || uploadingAvatar,
          loading: loading,
        }
      : null,
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Edit Profile
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-4">
          <ProfileAvatar
            profileImageKey={profile.profile_image_key}
            displayName={formData.display_name || `User ${profile.telegram_id}`}
            size="xl"
            editable
            onImageUpload={handleAvatarUpload}
          />
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Profile Picture
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click on the avatar to upload a new picture
            </p>
            {uploadingAvatar && (
              <p className="text-xs text-blue-500 mt-1">Uploading...</p>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Display Name *
          </label>
          <input
            id="display_name"
            type="text"
            value={formData.display_name}
            onChange={(e) => handleInputChange("display_name", e.target.value)}
            placeholder="Enter your display name"
            maxLength={50}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formData.display_name.length}/50 characters
          </p>
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            placeholder="Tell people about yourself..."
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formData.bio.length}/160 characters
          </p>
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="phone_number"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Phone Number
          </label>
          <input
            id="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => handleInputChange("phone_number", e.target.value)}
            placeholder="+1 (555) 123-4567"
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Contact Links */}
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Contact Links
          </span>
          <ContactLinks
            contactLinks={formData.contact_links}
            editable
            onChange={handleContactLinksChange}
          />
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
