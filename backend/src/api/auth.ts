import { Context } from 'hono';
import { TelegramAuthService } from '../services/telegram-auth';
import { SessionManager } from '../services/session-manager';
import type { Env } from '../types/env';

/**
 * Telegram authentication endpoint
 * POST /api/auth - validates initData and/or sessionId and returns user info
 * For security, only POST requests are supported for authentication
 */

export async function authHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const method = c.req.method;
    console.log('AuthHandler received request:', { method, url: c.req.url });

    // Only allow POST requests for security
    if (method !== 'POST') {
      return c.json({
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is supported for authentication'
      }, 405);
    }

    return handleAuthentication(c);

  } catch (error) {
    console.error('Auth error (outer catch):', error);
    return c.json({
      error: 'AUTH_FAILED',
      message: 'Authentication failed'
    }, 500);
  }
}

/**
 * Handle authentication for entire app
 * Session-first authentication with initData fallback
 * Accepts both sessionId and initData in same POST request
 */
async function handleAuthentication(c: Context<{ Bindings: Env }>): Promise<Response> {
  // Read from POST body
  const rawBody = await c.req.text(); // Read raw body first
  console.log('handleAuthentication - Raw request body:', rawBody);

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    console.error('handleAuthentication - Failed to parse JSON body:', e);
  }

  const { sessionId, initData: initDataParam } = body;

  // Also check headers as fallback
  const authHeader = c.req.header('Authorization');
  const sessionIdHeader = c.req.header('X-Session-ID');

  const finalSessionId = sessionId || sessionIdHeader;

  console.log('handleAuthentication - incoming data (parsed):', {
    hasSessionId: !!finalSessionId,
    hasInitDataParam: !!initDataParam,
    initDataParamValue: initDataParam, // Log the actual value
    hasAuthHeader: !!authHeader,
    sessionIdLength: finalSessionId?.length,
    initDataParamLength: initDataParam?.length,
    authHeaderLength: authHeader?.length
  });

  const sessionManager = SessionManager.create(c.env);
  const botTokenForService = c.env.BOT_TOKEN || c.env.TELEGRAM_BOT_TOKEN;
  console.log('handleAuthentication - botToken for service (masked):', botTokenForService ? botTokenForService.substring(0, 5) + '...' : 'undefined');
  const telegramAuth = new TelegramAuthService(botTokenForService);

  // 1. Try session validation first (if sessionId provided)
  if (finalSessionId) {
    console.log('Attempting session validation for sessionId:', finalSessionId.slice(0, 8) + '...');
    const session = await sessionManager.validateSession(finalSessionId);
    if (session) {
      console.log('Session validation successful');
      // Valid session - return user data from session
      return c.json({
        authenticated: true,
        sessionId: session.sessionId,
        user: {
          id: session.userId,
          first_name: session.displayName.split(' ')[0],
          last_name: session.displayName.split(' ').slice(1).join(' ') || undefined,
          username: session.username,
          language_code: 'en', // Could be enhanced to store this in session
          photo_url: session.profilePictureUrl
        },
        expiresAt: session.expiresAt,
        source: 'session'
      });
    } else {
      console.log('Session validation failed or expired');
    }
  }

  // 2. Fall back to initData validation
  console.log('handleAuthentication - Calling extractInitData with:', { authHeader, initDataParam });
  const initData = telegramAuth.extractInitData(authHeader, initDataParam);
  console.log('handleAuthentication - Result of extractInitData:', { hasInitData: !!initData, initDataValue: initData });

  if (!initData) {
    console.log('No initData found - authentication required');
    // No valid session and no initData - requires authentication
    return c.json({
      authenticated: false,
      message: 'Authentication required',
      instructions: 'Please authenticate with Telegram',
      reason: finalSessionId ? 'session_expired' : 'no_auth_data'
    }, 401);
  }

  try {
    console.log('Attempting initData validation...');
    // 3. Validate initData and create/update session
    const user = await telegramAuth.validateInitData(initData);
    console.log('InitData validation successful for user:', user.id);

    // Check if user already has a session and update it, otherwise create new
    const existingSession = await sessionManager.getUserSession(user.id);
    let session;

    if (existingSession) {
      console.log('Refreshing existing session for user:', user.id);
      // Refresh existing session
      session = await sessionManager.refreshSession(existingSession.sessionId);
    } else {
      console.log('Creating new session for user:', user.id);
      // Create new session
      session = await sessionManager.createSession(user);
    }

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
      source: 'initdata'
    });

  } catch (error) {
    console.error('InitData validation failed:', error);

    // Log error details for debugging
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', JSON.stringify(error, null, 2));
    }

    // Return structured error response
    return c.json({
      authenticated: false,
      message: typeof error === 'object' && error !== null && 'message' in error
        ? (error as Record<string, unknown>).message
        : 'Invalid Telegram authentication',
      error: typeof error === 'object' && error !== null && 'error' in error
        ? (error as Record<string, unknown>).error
        : 'INVALID_INIT_DATA',
      details: typeof error === 'object' && error !== null && 'details' in error
        ? (error as Record<string, unknown>).details
        : 'Failed to validate initData',
      reason: 'initdata_validation_failed'
    }, 401);
  }
}

