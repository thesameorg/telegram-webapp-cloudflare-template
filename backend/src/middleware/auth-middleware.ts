import { Context, Next } from "hono";
import { SessionManager } from "../services/session-manager";
import { isAdmin } from "../services/admin-auth";
import type { Env } from "../types/env";
import type { Session } from "../services/session-manager";

// Define context variables type
type AuthContext = {
  Bindings: Env;
  Variables: {
    session: Session;
  };
};

/**
 * Extract session ID from Authorization header or X-Session-ID header
 */
function extractSessionId(c: Context): string | null {
  const authHeader = c.req.header("Authorization");
  const sessionIdHeader = c.req.header("X-Session-ID");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  if (sessionIdHeader) {
    return sessionIdHeader;
  }

  return null;
}

/**
 * Authentication middleware - validates session and attaches to context
 */
export async function authMiddleware(c: Context<AuthContext>, next: Next) {
  const sessionManager = new SessionManager(c.env.SESSIONS);
  const sessionId = extractSessionId(c);

  if (!sessionId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const session = await sessionManager.validateSession(sessionId);
  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  // Attach session to context
  c.set("session", session);
  await next();
}

/**
 * Admin middleware - validates admin privileges
 * Must be used AFTER authMiddleware
 */
export async function adminMiddleware(c: Context<AuthContext>, next: Next) {
  const session = c.get("session");

  if (!isAdmin(session.telegramId, c.env)) {
    return c.json({ error: "Admin privileges required" }, 403);
  }

  await next();
}
