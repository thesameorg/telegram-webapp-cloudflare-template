import { Bot } from 'grammy';
import type { Env } from '../types/env';

/**
 * Notification Service
 *
 * Handles sending notifications to users via Telegram bot
 */

/**
 * Send notification to a user when their post is deleted by admin
 *
 * @param telegramId - The telegram ID of the user who owns the post
 * @param postId - The ID of the deleted post
 * @param bot - Grammy bot instance
 */
export async function sendPostDeletedNotification(
  telegramId: number,
  postId: number,
  bot: Bot
): Promise<void> {
  try {
    await bot.api.sendMessage(
      telegramId,
      `Admin has deleted your post (ID: ${postId}).`
    );
  } catch (error) {
    // Log error but don't throw - notification failure shouldn't break deletion
    console.error(`Failed to send deletion notification to user ${telegramId}:`, error);
  }
}

/**
 * Get a bot instance from environment
 *
 * @param env - Environment variables containing bot token
 * @returns Bot instance
 */
export function getBotInstance(env: Env): Bot {
  return new Bot(env.TELEGRAM_BOT_TOKEN);
}