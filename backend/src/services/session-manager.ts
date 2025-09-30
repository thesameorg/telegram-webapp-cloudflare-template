import type { SessionData, Env } from '../types/env';
import type { TelegramUser } from '../models/telegram-user';
import { getDisplayName } from '../models/telegram-user';
import { getAdminRole } from './admin-auth';

export class SessionManager {
  private readonly kv: KVNamespace;
  private readonly sessionTTL: number;
  private readonly env: Env;

  constructor(kv: KVNamespace, env: Env, sessionTTL: number = 3600) {
    this.kv = kv;
    this.env = env;
    this.sessionTTL = sessionTTL;
  }

  async createSession(user: TelegramUser): Promise<SessionData> {
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const sessionData: SessionData = {
      sessionId,
      userId: user.id,
      username: user.username,
      displayName: getDisplayName(user),
      profilePictureUrl: user.photo_url,
      createdAt: now,
      expiresAt: now + (this.sessionTTL * 1000),
      isActive: true,
      role: getAdminRole(user.id, this.env),
      telegramId: user.id
    };

    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: this.sessionTTL }
    );

    return sessionData;
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) return null;

    const sessionData = await this.kv.get(`session:${sessionId}`);
    if (!sessionData) return null;

    try {
      return JSON.parse(sessionData) as SessionData;
    } catch {
      await this.kv.delete(`session:${sessionId}`);
      return null;
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    await this.kv.delete(`session:${sessionId}`);
  }

  async refreshSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.validateSession(sessionId);
    if (!session) return null;

    const updatedSession: SessionData = {
      ...session,
      expiresAt: Date.now() + (this.sessionTTL * 1000)
    };

    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify(updatedSession),
      { expirationTtl: this.sessionTTL }
    );

    return updatedSession;
  }

  static create(env: Env, sessionTTL?: number): SessionManager {
    return new SessionManager(env.SESSIONS, env, sessionTTL);
  }
}