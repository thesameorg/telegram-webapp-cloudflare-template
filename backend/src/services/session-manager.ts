import type { SessionData, Env } from '../types/env';
import type { TelegramUser } from '../models/telegram-user';
import { getDisplayName } from '../models/telegram-user';

/**
 * Session Management Service
 * Handles session creation, validation, and cleanup in KV storage
 */
export class SessionManager {
  private readonly kv: KVNamespace;
  private readonly sessionTTL: number;

  constructor(kv: KVNamespace, sessionTTL: number = 3600) {
    this.kv = kv;
    this.sessionTTL = sessionTTL; // 1 hour default
  }

  /**
   * Creates a new session for authenticated user
   */
  async createSession(user: TelegramUser): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const expiresAt = now + (this.sessionTTL * 1000);

    const sessionData: SessionData = {
      sessionId,
      userId: user.id,
      username: user.username,
      displayName: getDisplayName(user),
      profilePictureUrl: user.photo_url,
      createdAt: now,
      expiresAt,
      isActive: true
    };

    // Store session in KV with TTL
    await this.kv.put(
      this.getSessionKey(sessionId),
      JSON.stringify(sessionData),
      { expirationTtl: this.sessionTTL }
    );

    // Also store by user ID for quick lookup
    await this.kv.put(
      this.getUserSessionKey(user.id),
      sessionId,
      { expirationTtl: this.sessionTTL }
    );

    return sessionData;
  }

  /**
   * Validates and retrieves session data
   */
  async validateSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) return null;

    const sessionData = await this.kv.get(this.getSessionKey(sessionId));
    if (!sessionData) return null;

    try {
      const session: SessionData = JSON.parse(sessionData);

      // Check if session is still active and not expired
      if (!session.isActive || Date.now() > session.expiresAt) {
        await this.invalidateSession(sessionId);
        return null;
      }

      return session;
    } catch {
      // Invalid session data, remove it
      await this.invalidateSession(sessionId);
      return null;
    }
  }

  /**
   * Invalidates a session (logout)
   */
  async invalidateSession(sessionId: string): Promise<void> {
    if (!sessionId) return;

    // Get session data first to clean up user mapping
    const sessionData = await this.kv.get(this.getSessionKey(sessionId));
    if (sessionData) {
      try {
        const session: SessionData = JSON.parse(sessionData);
        await this.kv.delete(this.getUserSessionKey(session.userId));
      } catch {
        // Continue with session cleanup even if user mapping fails
      }
    }

    // Remove session
    await this.kv.delete(this.getSessionKey(sessionId));
  }

  /**
   * Gets active session for a user
   */
  async getUserSession(userId: number): Promise<SessionData | null> {
    const sessionId = await this.kv.get(this.getUserSessionKey(userId));
    if (!sessionId) return null;

    return this.validateSession(sessionId);
  }

  /**
   * Refreshes session TTL (extends expiration)
   */
  async refreshSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.validateSession(sessionId);
    if (!session) return null;

    const now = Date.now();
    const expiresAt = now + (this.sessionTTL * 1000);

    const updatedSession: SessionData = {
      ...session,
      expiresAt
    };

    // Update session with new TTL
    await this.kv.put(
      this.getSessionKey(sessionId),
      JSON.stringify(updatedSession),
      { expirationTtl: this.sessionTTL }
    );

    // Update user mapping TTL
    await this.kv.put(
      this.getUserSessionKey(session.userId),
      sessionId,
      { expirationTtl: this.sessionTTL }
    );

    return updatedSession;
  }

  /**
   * Generates a secure session ID
   */
  private generateSessionId(): string {
    // Generate cryptographically secure random session ID
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Gets KV key for session storage
   */
  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  /**
   * Gets KV key for user-to-session mapping
   */
  private getUserSessionKey(userId: number): string {
    return `user_session:${userId}`;
  }

  /**
   * Creates SessionManager instance from environment
   */
  static create(env: Env, sessionTTL?: number): SessionManager {
    return new SessionManager(env.SESSIONS, sessionTTL);
  }
}