import { useSimpleAuth } from './use-simple-auth';

export function useTelegramAuth() {
  const { user, sessionId, isAuthenticated, isLoading, expiresAt } = useSimpleAuth();

  return {
    user,
    sessionId,
    isAuthenticated,
    isLoading,
    expiresAt,
  };
}