import { Context } from "hono";
import { TelegramAuthService } from "../services/telegram-auth";
import { SessionManager } from "../services/session-manager";
import { ProfileService } from "../services/profile-service";
import type { Env } from "../types/env";

export async function authHandler(
  c: Context<{ Bindings: Env }>,
): Promise<Response> {
  try {
    if (c.req.method !== "POST") {
      return c.json(
        {
          error: "METHOD_NOT_ALLOWED",
          message: "Only POST method is supported for authentication",
        },
        405,
      );
    }

    return handleAuthentication(c);
  } catch {
    return c.json(
      {
        error: "AUTH_FAILED",
        message: "Authentication failed",
      },
      500,
    );
  }
}

import { mockUser as devMockUser } from "../dev/mock-user";

async function handleAuthentication(
  c: Context<{ Bindings: Env }>,
): Promise<Response> {
  const sessionManager = SessionManager.create(c.env);

  // DEV-ONLY: Auth bypass for local development
  if (c.env.DEV_AUTH_BYPASS_ENABLED === "true") {
    const mockUser = {
      ...devMockUser,
      role:
        devMockUser.id.toString() === c.env.TELEGRAM_ADMIN_ID
          ? "admin"
          : "user",
    };

    const session = await sessionManager.createSession(mockUser as any);

    return c.json({
      authenticated: true,
      sessionId: session!.sessionId,
      user: {
        id: mockUser.id,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        username: mockUser.username,
        language_code: mockUser.language_code,
        is_premium: mockUser.is_premium,
        photo_url: mockUser.photo_url,
      },
      expiresAt: session!.expiresAt,
      role: session!.role,
      isAdmin: session!.role === "admin",
      source: "dev_bypass",
    });
  }

  let body: Record<string, unknown> = {};
  try {
    const rawBody = await c.req.text();
    body = JSON.parse(rawBody);
  } catch {
    // Continue with empty body
  }

  const { sessionId, initData } = body;
  const authHeader = c.req.header("Authorization");
  const sessionIdHeader = c.req.header("X-Session-ID");

  const finalSessionId = (sessionId || sessionIdHeader) as string | undefined;
  const initDataParam = initData as string | undefined;

  const telegramAuth = new TelegramAuthService(c.env.TELEGRAM_BOT_TOKEN);

  // Try session validation first
  if (finalSessionId) {
    const session = await sessionManager.validateSession(finalSessionId);
    if (session) {
      return c.json({
        authenticated: true,
        sessionId: session.sessionId,
        user: {
          id: session.userId,
          first_name: session.displayName.split(" ")[0],
          last_name:
            session.displayName.split(" ").slice(1).join(" ") || undefined,
          username: session.username,
          language_code: "en",
          photo_url: session.profilePictureUrl,
          is_premium: session.isPremium,
        },
        expiresAt: session.expiresAt,
        role: session.role,
        isAdmin: session.role === "admin",
        source: "session",
      });
    }
  }

  // Fall back to initData validation
  const extractedInitData = telegramAuth.extractInitData(
    authHeader,
    initDataParam,
  );

  if (!extractedInitData) {
    return c.json(
      {
        authenticated: false,
        message: "Authentication required",
        instructions: "Please authenticate with Telegram",
        reason: finalSessionId ? "session_expired" : "no_auth_data",
      },
      401,
    );
  }

  try {
    const user = await telegramAuth.validateInitData(extractedInitData);

    // Check if user is banned
    const profileService = new ProfileService(c.env.DB);
    const profile = await profileService.getProfile(user.id);

    if (profile && profile.isBanned === 1) {
      return c.json(
        {
          authenticated: false,
          message: "Authentication failed or you were banned",
          error: "BANNED",
          reason: "user_banned",
        },
        401,
      );
    }

    // Create new session
    const session = await sessionManager.createSession(user);

    return c.json({
      authenticated: true,
      sessionId: session!.sessionId,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium,
        photo_url: user.photo_url,
      },
      expiresAt: session!.expiresAt,
      role: session!.role,
      isAdmin: session!.role === "admin",
      source: "initdata",
    });
  } catch (error) {
    return c.json(
      {
        authenticated: false,
        message:
          error instanceof Error
            ? error.message
            : "Invalid Telegram authentication",
        error: "INVALID_INIT_DATA",
        reason: "initdata_validation_failed",
      },
      401,
    );
  }
}
