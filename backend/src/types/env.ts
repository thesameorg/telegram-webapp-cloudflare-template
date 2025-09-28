/**
 * Cloudflare Workers Environment Types
 * Defines the bindings and environment variables available in the Worker context
 */

export interface Env {
  // KV Namespaces
  SESSIONS: KVNamespace;

  // Environment Variables
  BOT_TOKEN: string;
  ENVIRONMENT: string;

  // Legacy environment variables (for backward compatibility)
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_ID: string;
  WEBHOOK_SECRET?: string;
}

/**
 * Hono Context Variables for Telegram Authentication
 */
export interface TelegramAuthVariables {
  telegramUser: TelegramUser;
  sessionId: string;
}

/**
 * Telegram User interface from initData
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
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

/**
 * Authentication response structure
 */
export interface AuthResponse {
  success: boolean;
  sessionId: string;
  user: TelegramUser;
  expiresAt: number;
}

/**
 * Session validation response structure
 */
export interface ValidationResponse {
  valid: boolean;
  user: TelegramUser;
  session?: SessionData;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}