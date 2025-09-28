import { useState, useEffect, useCallback, useMemo } from 'react';
import WebApp from '@twa-dev/sdk';

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

interface TelegramAuthHook {
  initData: string | null;
  user: TelegramWebAppUser | null;
  isAvailable: boolean;
  error: string | null;
  extractInitData: () => string | null;
  getUserData: () => TelegramWebAppUser | null;
}

/**
 * Hook for extracting Telegram Web App initData and user information
 * Uses @twa-dev/sdk to safely access Telegram Web App context
 */
export function useTelegramAuth(): TelegramAuthHook {
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const extractInitData = useCallback((): string | null => {
    try {
      setError(null);

      // Check if we're running in a Telegram Web App context
      if (!WebApp.initData) {
        setError('Not running in Telegram Web App context');
        return null;
      }

      // Validate initData format
      if (typeof WebApp.initData !== 'string' || WebApp.initData.length === 0) {
        setError('Invalid initData format');
        return null;
      }

      // Basic validation for required parameters
      const requiredParams = ['user', 'auth_date'];
      const hasRequiredParams = requiredParams.every(param =>
        WebApp.initData.includes(`${param}=`)
      );

      if (!hasRequiredParams) {
        setError('InitData missing required parameters');
        return null;
      }

      return WebApp.initData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract initData';
      setError(errorMessage);
      return null;
    }
  }, []);

  const getUserData = useCallback((): TelegramWebAppUser | null => {
    try {
      setError(null);

      // Check if user data is available
      if (!WebApp.initDataUnsafe?.user) {
        setError('User data not available');
        return null;
      }

      const user = WebApp.initDataUnsafe.user;

      // Validate required user fields
      if (!user.id || !user.first_name || !user.language_code) {
        setError('Incomplete user data');
        return null;
      }

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium,
        allows_write_to_pm: user.allows_write_to_pm,
        photo_url: user.photo_url
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract user data';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = () => {
      try {
        // Check if Telegram Web App is available
        const hasInitData = !!WebApp.initData;
        const hasUserData = !!WebApp.initDataUnsafe?.user;

        setIsAvailable(hasInitData && hasUserData);

        if (!hasInitData) {
          setError('Telegram Web App initData not available');
        } else if (!hasUserData) {
          setError('Telegram Web App user data not available');
        } else {
          setError(null);
        }
      } catch (err) {
        setIsAvailable(false);
        setError(err instanceof Error ? err.message : 'Telegram Web App not available');
      }
    };

    checkAvailability();
  }, []);

  // Memoize the current values to prevent infinite re-renders
  const currentInitData = useMemo(() => extractInitData(), [extractInitData]);
  const currentUser = useMemo(() => getUserData(), [getUserData]);

  return {
    initData: currentInitData,
    user: currentUser,
    isAvailable,
    error,
    extractInitData,
    getUserData
  };
}