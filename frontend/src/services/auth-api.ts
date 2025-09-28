/**
 * API client for authentication endpoints
 * Handles communication with backend authentication services
 */

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

interface AuthResponse {
  success: boolean;
  sessionId: string;
  user: TelegramUser;
  expiresAt: number;
}

interface ValidationResponse {
  valid: boolean;
  user: TelegramUser;
  session?: {
    sessionId: string;
    userId: number;
    username?: string;
    displayName: string;
    profilePictureUrl?: string;
    createdAt: number;
    expiresAt: number;
    isActive: boolean;
  };
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

class AuthAPIClient {
  private readonly baseURL: string;

  constructor(baseURL: string = '/api/auth') {
    this.baseURL = baseURL;
  }

  /**
   * Authenticate user with Telegram initData
   */
  async authenticate(initData: string): Promise<AuthResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ initData }),
      credentials: 'include' // Include cookies
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();

    // Transform to match AuthResponse interface
    return {
      success: data.authenticated || false,
      sessionId: data.sessionId,
      user: data.user,
      expiresAt: data.expiresAt
    };
  }

  /**
   * Validate current session
   */
  async validate(sessionId: string): Promise<ValidationResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Session validation failed');
    }

    const data = await response.json();

    // Transform response to match expected ValidationResponse interface
    if (data.authenticated) {
      return {
        valid: true,
        user: data.user,
        session: {
          sessionId: data.sessionId,
          userId: data.user.id,
          username: data.user.username,
          displayName: `${data.user.first_name} ${data.user.last_name || ''}`.trim(),
          profilePictureUrl: data.user.photo_url,
          createdAt: 0, // Not provided by current endpoint
          expiresAt: data.expiresAt,
          isActive: true
        }
      };
    } else {
      return {
        valid: false,
        user: {} as TelegramUser
      };
    }
  }

  /**
   * Logout and invalidate session
   * Note: Backend doesn't have a logout endpoint, so we just clear local state
   */
  async logout(_sessionId: string): Promise<{ success: boolean; message: string }> {
    // Since there's no backend logout endpoint, we just return success
    // The AuthStorage.clearSession() call in the auth context handles cleanup
    return {
      success: true,
      message: 'Session cleared locally'
    };
  }

  /**
   * Get user profile information
   * Uses the same validate endpoint since there's no separate profile endpoint
   */
  async getProfile(sessionId: string): Promise<{
    user: TelegramUser;
    session: {
      sessionId: string;
      createdAt: number;
      expiresAt: number;
    };
  }> {
    const validationResult = await this.validate(sessionId);

    if (!validationResult.valid || !validationResult.session) {
      throw new Error('Session validation failed');
    }

    return {
      user: validationResult.user,
      session: {
        sessionId: validationResult.session.sessionId,
        createdAt: validationResult.session.createdAt,
        expiresAt: validationResult.session.expiresAt
      }
    };
  }

  /**
   * Check if user is authenticated (quick validation)
   */
  async isAuthenticated(sessionId?: string): Promise<boolean> {
    if (!sessionId) {
      return false;
    }

    try {
      const result = await this.validate(sessionId);
      return result.valid;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const AuthAPI = new AuthAPIClient();

// Export types for use in components
export type {
  TelegramUser,
  AuthResponse,
  ValidationResponse,
  ErrorResponse
};