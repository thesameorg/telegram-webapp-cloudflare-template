/**
 * Cloudflare Workers Environment Types
 * Defines the bindings and environment variables available in the Worker context
 */

export interface Env {
  // KV Namespaces
  SESSIONS: KVNamespace;

  // Environment Variables
  ENVIRONMENT: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_ID: string;
}



/**
 * Session data structure stored in KV
 */
export interface SessionData {
  sessionId: string;
  userId: number;
  username?: string;
  displayName: string;
  profilePictureUrl?: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}