import { Context } from 'hono';
import { TelegramAuthService } from '../services/telegram-auth';
import { SessionManager } from '../services/session-manager';
import type { Env } from '../types/env';

export async function authHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    if (c.req.method !== 'POST') {
      return c.json({
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is supported for authentication'
      }, 405);
    }

    return handleAuthentication(c);

  } catch {
    return c.json({
      error: 'AUTH_FAILED',
      message: 'Authentication failed'
    }, 500);
  }
}

async function handleAuthentication(c: Context<{ Bindings: Env }>): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    const rawBody = await c.req.text();
    body = JSON.parse(rawBody);
  } catch {
    // Continue with empty body
  }

  const { sessionId, initData } = body;
  const authHeader = c.req.header('Authorization');
  const sessionIdHeader = c.req.header('X-Session-ID');

  const finalSessionId = (sessionId || sessionIdHeader) as string | undefined;
  const initDataParam = initData as string | undefined;

  const sessionManager = SessionManager.create(c.env);
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
          first_name: session.displayName.split(' ')[0],
          last_name: session.displayName.split(' ').slice(1).join(' ') || undefined,
          username: session.username,
          language_code: 'en',
          photo_url: session.profilePictureUrl
        },
        expiresAt: session.expiresAt,
        role: session.role,
        isAdmin: session.role === 'admin',
        source: 'session'
      });
    }
  }

  // Fall back to initData validation
  const extractedInitData = telegramAuth.extractInitData(authHeader, initDataParam);

  if (!extractedInitData) {
    return c.json({
      authenticated: false,
      message: 'Authentication required',
      instructions: 'Please authenticate with Telegram',
      reason: finalSessionId ? 'session_expired' : 'no_auth_data'
    }, 401);
  }

  try {
    const user = await telegramAuth.validateInitData(extractedInitData);

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
        photo_url: user.photo_url
      },
      expiresAt: session!.expiresAt,
      role: session!.role,
      isAdmin: session!.role === 'admin',
      source: 'initdata'
    });

  } catch (error) {
    return c.json({
      authenticated: false,
      message: error instanceof Error ? error.message : 'Invalid Telegram authentication',
      error: 'INVALID_INIT_DATA',
      reason: 'initdata_validation_failed'
    }, 401);
  }
}
