import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthAPI } from '../services/auth-api';
import { AuthStorage } from '../utils/auth-storage';

// Type declarations for global
declare const global: typeof globalThis;

// Mock the @twa-dev/sdk
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'query_id=AAG&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%7D&auth_date=1727404800&hash=mockhash',
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
        is_premium: true,
        allows_write_to_pm: true,
        photo_url: 'https://t.me/i/userpic/320/test.jpg'
      }
    }
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Frontend Authentication Integration Tests', () => {
  beforeEach(() => {
    // Clear storage before each test
    AuthStorage.clearSession();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    AuthStorage.clearSession();
    vi.resetAllMocks();
  });

  describe('AuthAPI Integration', () => {
    it('should authenticate user with mock initData', async () => {
      const mockInitData = 'query_id=AAG&user=%7B%22id%22%3A123456789%7D&auth_date=1727404800&hash=mockhash';
      const expiresAt = Date.now() + 3600000;

      const mockBackendResponse = {
        authenticated: true,
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        user: {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en',
          is_premium: true
        },
        expiresAt: expiresAt,
        source: 'initdata'
      };

      const expectedTransformedResponse = {
        success: true,
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        user: mockBackendResponse.user,
        expiresAt: expiresAt
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const result = await AuthAPI.authenticate(mockInitData);

      expect(result).toEqual(expectedTransformedResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData: mockInitData }),
        credentials: 'include'
      });
    });

    it('should handle authentication failure gracefully', async () => {
      const mockInitData = 'invalid_init_data';
      const mockErrorResponse = {
        error: 'INVALID_INIT_DATA',
        message: 'Invalid or expired initData'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse
      });

      await expect(AuthAPI.authenticate(mockInitData)).rejects.toThrow('Invalid or expired initData');
    });

    it('should validate session successfully', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const mockBackendResponse = {
        authenticated: true,
        sessionId: sessionId,
        user: {
          id: 123456789,
          first_name: 'Test',
          username: 'testuser',
          language_code: 'en'
        },
        expiresAt: Date.now() + 3600000,
        source: 'session'
      };

      const expectedTransformedResponse = {
        valid: true,
        user: mockBackendResponse.user,
        session: {
          sessionId: sessionId,
          userId: mockBackendResponse.user.id,
          username: mockBackendResponse.user.username,
          displayName: mockBackendResponse.user.first_name,
          profilePictureUrl: undefined,
          createdAt: 0,
          expiresAt: mockBackendResponse.expiresAt,
          isActive: true
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const result = await AuthAPI.validate(sessionId);

      expect(result).toEqual(expectedTransformedResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId }),
        credentials: 'include'
      });
    });



    it('should get user profile successfully', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const mockBackendResponse = {
        authenticated: true,
        sessionId: sessionId,
        user: {
          id: 123456789,
          first_name: 'Test',
          username: 'testuser',
          language_code: 'en'
        },
        expiresAt: Date.now() + 3600000,
        source: 'session'
      };

      const expectedResponse = {
        user: mockBackendResponse.user,
        session: {
          sessionId,
          createdAt: 0,
          expiresAt: mockBackendResponse.expiresAt
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse
      });

      const result = await AuthAPI.getProfile(sessionId);

      expect(result).toEqual(expectedResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId }),
        credentials: 'include'
      });
    });
  });

  describe('AuthStorage Integration', () => {
    it('should store and retrieve session data', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const expiresAt = Date.now() + 3600000;
      const userData = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en'
      };

      // Store data
      AuthStorage.setAuthState(sessionId, expiresAt, userData);

      // Retrieve data
      const storedSessionId = AuthStorage.getSessionId();
      const storedExpiresAt = AuthStorage.getExpiresAt();
      const storedUserData = AuthStorage.getUserData();

      expect(storedSessionId).toBe(sessionId);
      expect(storedExpiresAt).toBe(expiresAt);
      expect(storedUserData).toEqual(userData);
    });

    it('should validate session expiration correctly', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const futureExpiresAt = Date.now() + 3600000; // 1 hour in future
      const pastExpiresAt = Date.now() - 3600000; // 1 hour in past

      // Valid session
      AuthStorage.setSession(sessionId, futureExpiresAt);
      expect(AuthStorage.isSessionValid()).toBe(true);

      // Expired session
      AuthStorage.setSession(sessionId, pastExpiresAt);
      expect(AuthStorage.isSessionValid()).toBe(false);
    });

    it('should clear session data completely', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const expiresAt = Date.now() + 3600000;
      const userData = {
        id: 123456789,
        first_name: 'Test',
        language_code: 'en'
      };

      // Store data
      AuthStorage.setAuthState(sessionId, expiresAt, userData);

      // Verify data is stored
      expect(AuthStorage.getSessionId()).toBe(sessionId);
      expect(AuthStorage.getUserData()).toEqual(userData);

      // Clear data
      AuthStorage.clearSession();

      // Verify data is cleared
      expect(AuthStorage.getSessionId()).toBeNull();
      expect(AuthStorage.getUserData()).toBeNull();
      expect(AuthStorage.isSessionValid()).toBe(false);
    });

    it('should detect when session is expiring soon', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const soonExpiresAt = Date.now() + 60000; // 1 minute in future
      const laterExpiresAt = Date.now() + 3600000; // 1 hour in future

      // Session expiring soon (within 5 minutes)
      AuthStorage.setSession(sessionId, soonExpiresAt);
      expect(AuthStorage.isSessionExpiringSoon()).toBe(true);

      // Session not expiring soon
      AuthStorage.setSession(sessionId, laterExpiresAt);
      expect(AuthStorage.isSessionExpiringSoon()).toBe(false);
    });
  });


  describe('End-to-End Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      const mockBackendAuthResponse = {
        authenticated: true,
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        user: {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        },
        expiresAt: Date.now() + 3600000,
        source: 'initdata'
      };

      const mockValidateBackendResponse = {
        authenticated: true,
        sessionId: mockBackendAuthResponse.sessionId,
        user: mockBackendAuthResponse.user,
        expiresAt: mockBackendAuthResponse.expiresAt,
        source: 'session'
      };

      // Mock authentication
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendAuthResponse
      });

      // Step 1: Use mock initData directly
      const initData = 'query_id=AAG&user=%7B%22id%22%3A123456789%7D&auth_date=1727404800&hash=mockhash';

      // Step 2: Authenticate
      const authResult = await AuthAPI.authenticate(initData);
      expect(authResult.success).toBe(true);
      expect(authResult.sessionId).toBeDefined();

      // Step 3: Store session
      AuthStorage.setSession(authResult.sessionId, authResult.expiresAt);
      expect(AuthStorage.isSessionValid()).toBe(true);

      // Mock validation for next step
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidateBackendResponse
      });

      // Step 4: Validate session
      const validationResult = await AuthAPI.validate(authResult.sessionId);
      expect(validationResult.valid).toBe(true);

      // Step 5: Clear session (logout simulation)
      AuthStorage.clearSession();
      expect(AuthStorage.isSessionValid()).toBe(false);
    });

    it('should handle authentication errors in full flow', async () => {
      const mockErrorResponse = {
        error: 'INVALID_INIT_DATA',
        message: 'Invalid or expired initData'
      };

      // Mock failed authentication
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse
      });

      // Use mock initData directly
      const initData = 'invalid_init_data';

      // Attempt authentication (should fail)
      await expect(AuthAPI.authenticate(initData)).rejects.toThrow('Invalid or expired initData');

      // Verify no session is stored
      expect(AuthStorage.getSessionId()).toBeNull();
      expect(AuthStorage.isSessionValid()).toBe(false);
    });
  });
});