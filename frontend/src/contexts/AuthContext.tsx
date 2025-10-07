import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthStorage } from "../utils/auth-storage";
import { useTelegram } from "../utils/telegram";
import { config } from "../config";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: TelegramUser | null;
  sessionId: string | null;
  expiresAt: number | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Centralized authentication state for the entire app
 * Performs a single auth request on startup and shares state via Context
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    sessionId: null,
    expiresAt: null,
    isAdmin: false,
  });

  const { webApp, isWebAppReady } = useTelegram();

  useEffect(() => {
    let mounted = true;

    const authenticate = async () => {
      try {
        // Check if we already have valid stored auth
        const stored = AuthStorage.getAuthState();
        if (stored.isValid && stored.sessionId && stored.userData) {
          // Need to re-authenticate to get fresh role data
          // (stored auth doesn't include role, so we'll fall through to full auth)
        }

        // Need to authenticate with backend
        const requestBody: Record<string, unknown> = {};

        // Add sessionId if we have one (even if expired)
        if (stored.sessionId) {
          requestBody.sessionId = stored.sessionId;
        }

        // Add initData if available
        if (webApp?.initData) {
          requestBody.initData = webApp.initData;
        }

        console.log(
          "Frontend: Sending authentication request with body:",
          requestBody,
        );

        const response = await fetch(`${config.apiBaseUrl}/api/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          credentials: "include",
        });

        if (response.ok) {
          const authData = await response.json();
          console.log("[AuthContext] Auth response:", authData);

          if (authData.authenticated) {
            // Store auth state
            console.log("[AuthContext] Storing auth state to localStorage");
            AuthStorage.setAuthState(
              authData.sessionId,
              authData.expiresAt,
              authData.user,
            );

            if (mounted) {
              console.log("[AuthContext] Setting auth state in context");
              setAuthState({
                isAuthenticated: true,
                isLoading: false,
                user: authData.user,
                sessionId: authData.sessionId,
                expiresAt: authData.expiresAt,
                isAdmin: authData.isAdmin || false,
              });
            }
            return;
          }
        }

        // Authentication failed
        AuthStorage.clearSession();
        if (mounted) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            sessionId: null,
            expiresAt: null,
            isAdmin: false,
          });
        }
      } catch (error) {
        console.error("Authentication error:", error);
        AuthStorage.clearSession();
        if (mounted) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            sessionId: null,
            expiresAt: null,
            isAdmin: false,
          });
        }
      }
    };

    // Only authenticate when Telegram WebApp is ready (or immediately if not in Telegram)
    if (isWebAppReady !== null) {
      authenticate();
    }

    return () => {
      mounted = false;
    };
  }, [isWebAppReady, webApp]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

/**
 * useAuth - Hook to access centralized auth state
 * Replaces the old useSimpleAuth hook
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
