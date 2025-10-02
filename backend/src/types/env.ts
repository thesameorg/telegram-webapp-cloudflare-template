/**
 * Cloudflare Workers Environment Types
 * Defines the bindings and environment variables available in the Worker context
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  // KV Namespaces
  SESSIONS: KVNamespace;

  // D1 Database
  DB: D1Database;

  // R2 Buckets
  IMAGES: R2Bucket;

  // Environment Variables
  ENVIRONMENT: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_ID: string;
  WEB_APP_URL: string;
  DEV_AUTH_BYPASS_ENABLED?: string;

  // Optional custom domain URLs (fall back to *.workers.dev / *.pages.dev if not set)
  PAGES_URL?: string;
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
  role: 'admin' | 'user';
  telegramId: number;
  isPremium?: boolean;
}