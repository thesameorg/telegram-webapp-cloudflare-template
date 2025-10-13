const STORAGE_KEYS = {
  SESSION_ID: "telegram_session_id",
  EXPIRES_AT: "telegram_session_expires_at",
  USER_DATA: "telegram_user_data",
  IS_ADMIN: "telegram_is_admin",
} as const;

export interface StoredUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

const safeStorage = {
  get: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      console.log(`[AuthStorage] GET ${key}:`, value);
      return value;
    } catch (error) {
      console.error(`[AuthStorage] Failed to get ${key}:`, error);
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
      console.log(`[AuthStorage] SET ${key}:`, value);
    } catch (error) {
      console.error(`[AuthStorage] Failed to store ${key}:`, error);
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
      console.log(`[AuthStorage] REMOVE ${key}`);
    } catch (error) {
      console.error(`[AuthStorage] Failed to remove ${key}:`, error);
    }
  },
};

export const AuthStorage = {
  setSession(sessionId: string, expiresAt: number): void {
    safeStorage.set(STORAGE_KEYS.SESSION_ID, sessionId);
    safeStorage.set(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  },

  getSessionId(): string | null {
    return safeStorage.get(STORAGE_KEYS.SESSION_ID);
  },

  getExpiresAt(): number | null {
    const value = safeStorage.get(STORAGE_KEYS.EXPIRES_AT);
    return value ? Number.parseInt(value, 10) : null;
  },

  isSessionValid(): boolean {
    const sessionId = this.getSessionId();
    const expiresAt = this.getExpiresAt();
    return !!(sessionId && expiresAt && expiresAt > Date.now());
  },

  setUserData(userData: StoredUserData): void {
    safeStorage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  },

  getUserData(): StoredUserData | null {
    const value = safeStorage.get(STORAGE_KEYS.USER_DATA);
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  setIsAdmin(isAdmin: boolean): void {
    safeStorage.set(STORAGE_KEYS.IS_ADMIN, isAdmin.toString());
  },

  getIsAdmin(): boolean {
    const value = safeStorage.get(STORAGE_KEYS.IS_ADMIN);
    return value === "true";
  },

  clearSession(): void {
    safeStorage.remove(STORAGE_KEYS.SESSION_ID);
    safeStorage.remove(STORAGE_KEYS.EXPIRES_AT);
    safeStorage.remove(STORAGE_KEYS.USER_DATA);
    safeStorage.remove(STORAGE_KEYS.IS_ADMIN);
  },

  getAuthState() {
    return {
      sessionId: this.getSessionId(),
      expiresAt: this.getExpiresAt(),
      userData: this.getUserData(),
      isValid: this.isSessionValid(),
    };
  },

  setAuthState(
    sessionId: string,
    expiresAt: number,
    userData: StoredUserData,
    isAdmin?: boolean,
  ): void {
    this.setSession(sessionId, expiresAt);
    this.setUserData(userData);
    if (isAdmin !== undefined) {
      this.setIsAdmin(isAdmin);
    }
  },
};
