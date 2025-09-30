import { Context } from 'hono';
import { createDatabase } from '../db';
import { SessionManager } from '../services/session-manager';
import { ProfileService } from '../services/profile-service';
import { isAdmin } from '../services/admin-auth';
import { sendBanNotification } from '../services/notification-service';
import type { Env } from '../types/env';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../db/schema';

// Helper: Extract and validate admin session
async function authenticateAdmin(c: Context<{ Bindings: Env }>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { error: { message: 'Authentication required', status: 401 as const } };
  }

  let sessionId: string;
  if (authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.substring(7).trim();
  } else if (authHeader.startsWith('Session ')) {
    sessionId = authHeader.substring(8).trim();
  } else {
    sessionId = authHeader.trim();
  }

  if (!sessionId) {
    return { error: { message: 'Authentication required', status: 401 as const } };
  }

  const sessionManager = SessionManager.create(c.env);
  const session = await sessionManager.validateSession(sessionId);
  if (!session) {
    return { error: { message: 'Invalid or expired session', status: 401 as const } };
  }

  // Check if user is admin
  if (!isAdmin(session.telegramId, c.env)) {
    return { error: { message: 'Admin privileges required', status: 401 as const } };
  }

  return { session };
}

/**
 * POST /api/admin/ban/:telegramId
 * Ban a user (admin only)
 */
export async function banUser(c: Context<{ Bindings: Env }>) {
  // Authenticate as admin
  const auth = await authenticateAdmin(c);
  if ('error' in auth && auth.error) {
    return c.json({ error: auth.error.message }, auth.error.status);
  }

  if (!('session' in auth)) {
    return c.json({ error: 'Authentication failed' }, 401);
  }

  const { session } = auth;

  // Get target telegram ID
  const targetTelegramId = parseInt(c.req.param('telegramId'), 10);
  if (isNaN(targetTelegramId)) {
    return c.json({ error: 'Invalid telegram ID' }, 400);
  }

  // Prevent self-ban
  if (targetTelegramId === session.telegramId) {
    return c.json({ error: 'Cannot ban yourself' }, 400);
  }

  try {
    const db = createDatabase(c.env.DB);
    const profileService = new ProfileService(c.env.DB);

    // Check if profile exists
    const profile = await profileService.getProfile(targetTelegramId);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Check if already banned
    if (profile.isBanned === 1) {
      return c.json({ error: 'User is already banned' }, 400);
    }

    // Ban the user
    await db
      .update(userProfiles)
      .set({
        isBanned: 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.telegramId, targetTelegramId));

    // Send notification to banned user
    try {
      await sendBanNotification(c.env, targetTelegramId, true);
    } catch (error) {
      console.error('Failed to send ban notification:', error);
      // Don't fail the ban action if notification fails
    }

    return c.json({
      success: true,
      message: 'User banned successfully',
    });
  } catch (error) {
    console.error('Error banning user:', error);
    return c.json({ error: 'Failed to ban user' }, 500);
  }
}

/**
 * POST /api/admin/unban/:telegramId
 * Unban a user (admin only)
 */
export async function unbanUser(c: Context<{ Bindings: Env }>) {
  // Authenticate as admin
  const auth = await authenticateAdmin(c);
  if ('error' in auth && auth.error) {
    return c.json({ error: auth.error.message }, auth.error.status);
  }

  if (!('session' in auth)) {
    return c.json({ error: 'Authentication failed' }, 401);
  }

  // Get target telegram ID
  const targetTelegramId = parseInt(c.req.param('telegramId'), 10);
  if (isNaN(targetTelegramId)) {
    return c.json({ error: 'Invalid telegram ID' }, 400);
  }

  try {
    const db = createDatabase(c.env.DB);
    const profileService = new ProfileService(c.env.DB);

    // Check if profile exists
    const profile = await profileService.getProfile(targetTelegramId);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Check if not banned
    if (profile.isBanned === 0) {
      return c.json({ error: 'User is not banned' }, 400);
    }

    // Unban the user
    await db
      .update(userProfiles)
      .set({
        isBanned: 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.telegramId, targetTelegramId));

    // Send notification to unbanned user
    try {
      await sendBanNotification(c.env, targetTelegramId, false);
    } catch (error) {
      console.error('Failed to send unban notification:', error);
      // Don't fail the unban action if notification fails
    }

    return c.json({
      success: true,
      message: 'User unbanned successfully',
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    return c.json({ error: 'Failed to unban user' }, 500);
  }
}
