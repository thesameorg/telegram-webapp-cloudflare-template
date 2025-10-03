import type { Env } from "../types/env";

/**
 * Admin Authorization Service
 *
 * Security-focused module for validating admin privileges.
 * Centralized admin validation to ensure consistent authorization across the application.
 *
 * ⚠️ SECURITY CRITICAL: Changes to this file require careful security review.
 */

/**
 * Check if a Telegram user ID has admin privileges
 *
 * @param telegramId - The Telegram user ID to check
 * @param env - Environment variables containing TELEGRAM_ADMIN_ID
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(telegramId: number, env: Env): boolean {
  // Parse admin ID from environment (could be string or number)
  const adminId =
    typeof env.TELEGRAM_ADMIN_ID === "string"
      ? parseInt(env.TELEGRAM_ADMIN_ID, 10)
      : env.TELEGRAM_ADMIN_ID;

  // Return false if admin ID is not configured or invalid
  if (!adminId || isNaN(adminId)) {
    return false;
  }

  // Strict equality check
  return telegramId === adminId;
}

/**
 * Validate that a session user has admin privileges
 *
 * @param sessionTelegramId - The telegram ID from the authenticated session
 * @param env - Environment variables
 * @returns Promise<boolean> - true if user is admin
 */
export async function validateAdminAction(
  sessionTelegramId: number,
  env: Env,
): Promise<boolean> {
  return isAdmin(sessionTelegramId, env);
}

/**
 * Get the role designation for a user
 *
 * @param telegramId - The Telegram user ID
 * @param env - Environment variables
 * @returns 'admin' | 'user'
 */
export function getAdminRole(telegramId: number, env: Env): "admin" | "user" {
  return isAdmin(telegramId, env) ? "admin" : "user";
}
