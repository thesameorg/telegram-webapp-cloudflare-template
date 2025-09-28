/**
 * Auth state persistence and management utilities
 * Handles localStorage operations for authentication state
 */

const STORAGE_KEYS = {
  SESSION_ID: 'telegram_session_id',
  EXPIRES_AT: 'telegram_session_expires_at',
  USER_DATA: 'telegram_user_data'
} as const;

interface StoredUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

class AuthStorageManager {
  /**
   * Store session information
   */
  setSession(sessionId: string, expiresAt: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
    } catch (error) {
      console.warn('Failed to store session in localStorage:', error);
    }
  }

  /**
   * Get stored session ID
   */
  getSessionId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      console.warn('Failed to retrieve session ID from localStorage:', error);
      return null;
    }
  }

  /**
   * Get stored session expiration timestamp
   */
  getExpiresAt(): number | null {
    try {
      const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
      return expiresAt ? parseInt(expiresAt, 10) : null;
    } catch (error) {
      console.warn('Failed to retrieve expiration time from localStorage:', error);
      return null;
    }
  }

  /**
   * Check if stored session is valid (not expired)
   */
  isSessionValid(): boolean {
    const sessionId = this.getSessionId();
    const expiresAt = this.getExpiresAt();

    if (!sessionId || !expiresAt) {
      return false;
    }

    return expiresAt > Date.now();
  }

  /**
   * Store user data
   */
  setUserData(userData: StoredUserData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.warn('Failed to store user data in localStorage:', error);
    }
  }

  /**
   * Get stored user data
   */
  getUserData(): StoredUserData | null {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Failed to retrieve user data from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear all stored session data
   */
  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error);
    }
  }

  /**
   * Clear only user data (keep session)
   */
  clearUserData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.warn('Failed to clear user data from localStorage:', error);
    }
  }

  /**
   * Get complete stored auth state
   */
  getAuthState(): {
    sessionId: string | null;
    expiresAt: number | null;
    userData: StoredUserData | null;
    isValid: boolean;
  } {
    return {
      sessionId: this.getSessionId(),
      expiresAt: this.getExpiresAt(),
      userData: this.getUserData(),
      isValid: this.isSessionValid()
    };
  }

  /**
   * Store complete auth state
   */
  setAuthState(sessionId: string, expiresAt: number, userData: StoredUserData): void {
    this.setSession(sessionId, expiresAt);
    this.setUserData(userData);
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable(): boolean {
    try {
      const test = '__auth_storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiration(): number | null {
    const expiresAt = this.getExpiresAt();

    if (!expiresAt) {
      return null;
    }

    const timeLeft = expiresAt - Date.now();
    return timeLeft > 0 ? timeLeft : 0;
  }

  /**
   * Check if session expires within given time (in milliseconds)
   */
  isSessionExpiringSoon(thresholdMs: number = 300000): boolean { // Default: 5 minutes
    const timeLeft = this.getTimeUntilExpiration();

    if (timeLeft === null) {
      return true; // No session = expired
    }

    return timeLeft <= thresholdMs;
  }
}

// Export singleton instance
export const AuthStorage = new AuthStorageManager();

// Export types
export type { StoredUserData };