import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthStorage } from '../utils/auth-storage';
import { useTelegram } from '../utils/telegram';
import AuthRequired from '../components/AuthRequired';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: TelegramUser | null;
  sessionId: string | null;
  expiresAt: number | null;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  authSource: 'session' | 'initdata' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [authSource, setAuthSource] = useState<'session' | 'initdata' | null>(null);

  const { webApp, isWebAppReady } = useTelegram();

  // Main authentication function that handles session-first logic
  const performAuth = async (forceInitData = false): Promise<void> => {
    try {
      setIsLoading(true);

      // Get stored session data
      const storedSessionId = AuthStorage.getSessionId();
      const initData = webApp?.initData;

      // Prepare request body with auth data
      const requestBody: any = {};
      if (storedSessionId && !forceInitData) {
        requestBody.sessionId = storedSessionId;
      }
      if (initData) {
        requestBody.initData = initData;
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const authData = await response.json();

      if (authData.authenticated) {
        // Store new auth state
        AuthStorage.setAuthState(authData.sessionId, authData.expiresAt, authData.user);

        // Update context state
        setIsAuthenticated(true);
        setUser(authData.user);
        setSessionId(authData.sessionId);
        setExpiresAt(authData.expiresAt);
        setAuthSource(authData.source || 'unknown');

        console.log(`Authentication successful via ${authData.source}`);
      } else {
        throw new Error(authData.message || 'Authentication failed');
      }

    } catch (error) {
      console.error('Authentication failed:', error);
      AuthStorage.clearSession();
      setIsAuthenticated(false);
      setUser(null);
      setSessionId(null);
      setExpiresAt(null);
      setAuthSource(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      // First check if we have a stored session
      const authState = AuthStorage.getAuthState();

      if (authState.isValid && authState.sessionId) {
        try {
          // Try to authenticate with stored session
          await performAuth();
          return;
        } catch (error) {
          console.log('Stored session invalid, will try initData when available');
        }
      }

      // If we're in Telegram WebApp, try with initData
      if (isWebAppReady && webApp?.initData) {
        try {
          await performAuth(true); // Force initData validation
          return;
        } catch (error) {
          console.error('InitData authentication failed:', error);
        }
      }

      // No valid authentication
      setIsLoading(false);
    };

    // Wait for Telegram WebApp to be ready before initializing
    if (isWebAppReady !== null) {
      initializeAuth();
    }
  }, [isWebAppReady, webApp]);

  const authenticate = async (): Promise<void> => {
    await performAuth(true); // Force initData validation
  };

  const logout = async (): Promise<void> => {
    try {
      if (sessionId) {
        // Call logout endpoint if we have a session
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionId}`
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear state regardless of API call success
      AuthStorage.clearSession();
      setIsAuthenticated(false);
      setUser(null);
      setSessionId(null);
      setExpiresAt(null);
      setAuthSource(null);
    }
  };

  const refreshAuth = async (): Promise<void> => {
    await performAuth(); // Try session first, fallback to initData
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    sessionId,
    expiresAt,
    authenticate,
    logout,
    refreshAuth,
    authSource
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Authenticating...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <AuthRequired />;
    }

    return <Component {...props} />;
  };
}