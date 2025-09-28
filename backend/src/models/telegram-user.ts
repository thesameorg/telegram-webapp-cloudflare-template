import { z } from 'zod';

/**
 * Telegram User interface from initData
 * Based on Telegram Web App API documentation
 */
export interface TelegramUser {
  id: number;                    // Unique Telegram user ID
  first_name: string;           // User's first name
  last_name?: string;           // User's last name (optional)
  username?: string;            // Telegram username (optional)
  language_code: string;        // User's language preference (ISO 639-1)
  is_premium?: boolean;         // Telegram Premium status
  allows_write_to_pm?: boolean; // PM permission setting
  photo_url?: string;           // Profile picture URL
}

/**
 * Zod schema for Telegram user validation
 * Ensures data integrity from initData parsing
 */
export const TelegramUserSchema = z.object({
  id: z.number().int().positive('User ID must be a positive integer'),
  first_name: z.string().min(1, 'First name cannot be empty'),
  last_name: z.string().optional(),
  username: z.string().min(1).optional(), // Username should not be empty string if present
  language_code: z.string().regex(/^[a-z]{2}$/, 'Language code must follow ISO 639-1 format'),
  is_premium: z.boolean().optional(),
  allows_write_to_pm: z.boolean().optional(),
  photo_url: z.string().url('Photo URL must be a valid URL').optional(),
});

/**
 * Validates Telegram user data and throws descriptive errors
 */
export function validateTelegramUser(data: unknown): TelegramUser {
  return TelegramUserSchema.parse(data);
}

/**
 * Creates a display name from Telegram user data
 */
export function getDisplayName(user: TelegramUser): string {
  if (user.last_name) {
    return `${user.first_name} ${user.last_name}`.trim();
  }
  return user.first_name;
}
