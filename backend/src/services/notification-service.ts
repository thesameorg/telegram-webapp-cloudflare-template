import { Bot } from "grammy";
import type { Env } from "../types/env";

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
  bot: Bot,
): Promise<void> {
  try {
    await bot.api.sendMessage(
      telegramId,
      `Admin has deleted your post (ID: ${postId}).`,
    );
  } catch (error) {
    // Log error but don't throw - notification failure shouldn't break deletion
    console.error(
      `Failed to send deletion notification to user ${telegramId}:`,
      error,
    );
  }
}

/**
 * Send notification to a user when they are banned or unbanned
 *
 * @param env - Environment variables containing bot token
 * @param telegramId - The telegram ID of the user
 * @param isBanned - true if user is being banned, false if unbanned
 */
export async function sendBanNotification(
  env: Env,
  telegramId: number,
  isBanned: boolean,
): Promise<void> {
  try {
    const bot = getBotInstance(env);
    const message = isBanned
      ? "You have been banned. You cannot access the web app."
      : "You have been unbanned. You can now access the web app again.";

    await bot.api.sendMessage(telegramId, message);
  } catch (error) {
    // Log error but don't throw - notification failure shouldn't break ban/unban action
    console.error(
      `Failed to send ban notification to user ${telegramId}:`,
      error,
    );
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

/**
 * Send notification to user when payment succeeds
 *
 * @param env - Environment variables containing bot token
 * @param telegramId - The telegram ID of the user
 * @param postId - The ID of the post that became premium
 * @param starCount - Number of stars paid
 */
export async function sendPaymentSuccessNotification(
  env: Env,
  telegramId: number,
  postId: number,
  starCount: number,
): Promise<void> {
  try {
    const bot = getBotInstance(env);
    await bot.api.sendMessage(
      telegramId,
      `✅ Payment successful! Your post (ID: ${postId}) is now premium with ${starCount} star${starCount > 1 ? "s" : ""} ⭐️`,
    );
  } catch (error) {
    console.error(
      `Failed to send payment success notification to user ${telegramId}:`,
      error,
    );
  }
}

/**
 * Send notification to user when payment fails
 *
 * @param env - Environment variables containing bot token
 * @param telegramId - The telegram ID of the user
 * @param reason - Reason for payment failure
 */
export async function sendPaymentFailureNotification(
  env: Env,
  telegramId: number,
  reason: string,
): Promise<void> {
  try {
    const bot = getBotInstance(env);
    await bot.api.sendMessage(telegramId, `❌ Payment failed: ${reason}`);
  } catch (error) {
    console.error(
      `Failed to send payment failure notification to user ${telegramId}:`,
      error,
    );
  }
}

/**
 * Send notification to admin when a payment is received
 *
 * @param env - Environment variables containing bot token and admin ID
 * @param details - Payment details
 */
export async function sendAdminPaymentAlert(
  env: Env,
  details: {
    userId: number;
    postId: number;
    starAmount: number;
    chargeId: string;
  },
): Promise<void> {
  try {
    if (!env.TELEGRAM_ADMIN_ID) {
      console.warn("TELEGRAM_ADMIN_ID not set, skipping admin payment alert");
      return;
    }

    const bot = getBotInstance(env);
    await bot.api.sendMessage(
      env.TELEGRAM_ADMIN_ID,
      `💰 New payment received!\n\n` +
        `User ID: ${details.userId}\n` +
        `Post ID: ${details.postId}\n` +
        `Stars: ${details.starAmount} ⭐️\n` +
        `Charge ID: ${details.chargeId}`,
    );
  } catch (error) {
    console.error(`Failed to send admin payment alert:`, error);
  }
}

/**
 * Send notification to user when their payment is refunded
 *
 * @param env - Environment variables containing bot token
 * @param telegramId - The telegram ID of the user
 * @param postId - The ID of the post
 * @param starAmount - Number of stars refunded
 */
export async function sendPaymentRefundNotification(
  env: Env,
  telegramId: number,
  postId: number,
  starAmount: number,
): Promise<void> {
  try {
    const bot = getBotInstance(env);
    await bot.api.sendMessage(
      telegramId,
      `↩️ Your payment was reverted!\n\n` +
        `Post ID: ${postId}\n` +
        `Stars refunded: ${starAmount} ⭐️\n\n` +
        `Your post is now a regular post (not starred).`,
    );
  } catch (error) {
    console.error(
      `Failed to send refund notification to user ${telegramId}:`,
      error,
    );
  }
}

/**
 * Send notification to admin when a refund is processed
 *
 * @param env - Environment variables containing bot token and admin ID
 * @param details - Refund details
 */
export async function sendAdminRefundAlert(
  env: Env,
  details: {
    userId: number;
    postId: number;
    starAmount: number;
    chargeId: string;
  },
): Promise<void> {
  try {
    if (!env.TELEGRAM_ADMIN_ID) {
      console.warn("TELEGRAM_ADMIN_ID not set, skipping admin refund alert");
      return;
    }

    const bot = getBotInstance(env);
    await bot.api.sendMessage(
      env.TELEGRAM_ADMIN_ID,
      `↩️ Refund processed!\n\n` +
        `User ID: ${details.userId}\n` +
        `Post ID: ${details.postId}\n` +
        `Stars refunded: ${details.starAmount} ⭐️\n` +
        `Charge ID: ${details.chargeId}`,
    );
  } catch (error) {
    console.error(`Failed to send admin refund alert:`, error);
  }
}

/**
 * Send notification to post author when someone comments on their post
 *
 * @param env - Environment variables containing bot token
 * @param postAuthorTelegramId - The telegram ID of the post author
 * @param postId - The ID of the post that was commented on
 * @param commenterDisplayName - Display name of the user who commented
 * @param commentContent - The content of the comment (truncated if too long)
 */
export async function sendNewCommentNotification(
  env: Env,
  postAuthorTelegramId: number,
  postId: number,
  commenterDisplayName: string,
  commentContent: string,
): Promise<void> {
  try {
    const bot = getBotInstance(env);
    const truncatedContent =
      commentContent.length > 50
        ? commentContent.substring(0, 50) + "..."
        : commentContent;

    await bot.api.sendMessage(
      postAuthorTelegramId,
      `💬 ${commenterDisplayName} commented on your post (ID: ${postId}):\n\n"${truncatedContent}"`,
    );
  } catch (error) {
    console.error(
      `Failed to send comment notification to user ${postAuthorTelegramId}:`,
      error,
    );
  }
}
