import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileEditor } from '../components/profile/ProfileEditor';
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton';
import { useToast } from '../hooks/use-toast';
import { useSimpleAuth } from '../hooks/use-simple-auth';

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

export default function EditProfile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { sessionId, isLoading: authLoading } = useSimpleAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      if (!sessionId) {
        navigate('/account');
        return;
      }

      setLoading(true);
      const response = await fetch('/api/profile/me', {
        headers: {
          'x-session-id': sessionId,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/account');
          return;
        }
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setError(null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return;
    }

    fetchProfile();
  }, [navigate, showToast, sessionId, authLoading]);


  const handleSave = async (updatedProfile: Partial<ProfileData>) => {
    setSaving(true);
    try {
      if (!sessionId) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify(updatedProfile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      showToast('Profile updated successfully!', 'success');

      // Navigate back to the user's profile
      navigate(`/profile/${data.profile.telegram_id}`);
    } catch (error: unknown) {
      console.error('Profile update failed:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      navigate(`/profile/${profile.telegram_id}`);
    } else {
      navigate('/account');
    }
  };

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
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unable to load your profile for editing.
          </p>
          <button
            onClick={() => navigate('/account')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <ProfileEditor
        profile={profile}
        onSave={handleSave}
        onCancel={handleCancel}
        onAvatarUpdate={fetchProfile}
        loading={saving}
        sessionId={sessionId || undefined}
      />
    </div>
  );
}