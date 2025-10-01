import { Context } from 'hono';
import { createDatabase } from '../db';
import { PaymentService } from '../services/payment-service';
import { PostService } from '../services/post-service';
import { SessionManager } from '../services/session-manager';
import { isAdmin } from '../services/admin-auth';
import type { Env } from '../types/env';
import { eq } from 'drizzle-orm';
import { posts } from '../db/schema';

// Helper: Extract and validate session
async function authenticateUser(c: Context<{ Bindings: Env }>) {
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

  return { session };
}

// Helper: Parse pagination parameters
function parsePagination(c: Context) {
  const limitParam = c.req.query('limit') || '50';
  const offsetParam = c.req.query('offset') || '0';
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
  return { limit, offset };
}

/**
 * POST /api/posts/:postId/make-premium
 * Create payment and get invoice URL
 */
export const makePremium = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Parse post ID
    const postId = parseInt(c.req.param('postId'), 10);
    if (isNaN(postId)) {
      return c.json({ error: 'Invalid post ID' }, 400);
    }

    // Parse and validate request body
    const body = await c.req.json();
    const starCount = body.star_count;

    if (!starCount || typeof starCount !== 'number' || starCount < 1 || starCount > 10) {
      return c.json({ error: 'star_count must be between 1 and 10' }, 400);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);
    const paymentService = new PaymentService(db, c.env);

    // Check post exists and user owns it
    const post = await postService.getPostById(postId);
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    if (post.userId !== session.telegramId) {
      return c.json({ error: 'You do not own this post' }, 403);
    }

    // Check if post is already premium or payment pending
    if (post.starCount && post.starCount > 0) {
      return c.json({ error: 'Post is already premium' }, 409);
    }

    if (post.isPaymentPending === 1) {
      return c.json({ error: 'Payment already pending for this post' }, 409);
    }

    // Create payment and get invoice URL
    const result = await paymentService.createPayment({
      userId: session.telegramId,
      postId,
      starAmount: starCount,
    });

    return c.json({
      success: true,
      invoice_url: result.invoiceUrl,
      payment_id: result.payment.id,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return c.json({ error: 'Failed to create payment' }, 500);
  }
};

/**
 * POST /api/posts/:postId/clear-pending
 * Clear payment pending flag (called when payment cancelled/failed)
 */
export const clearPending = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Parse post ID
    const postId = parseInt(c.req.param('postId'), 10);
    if (isNaN(postId)) {
      return c.json({ error: 'Invalid post ID' }, 400);
    }

    const db = createDatabase(c.env.DB);
    const postService = new PostService(db, c.env);

    // Check post exists and user owns it
    const post = await postService.getPostById(postId);
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    if (post.userId !== session.telegramId) {
      return c.json({ error: 'You do not own this post' }, 403);
    }

    // Clear pending flag
    const now = new Date().toISOString();
    await db.update(posts)
      .set({
        isPaymentPending: 0,
        updatedAt: now,
      })
      .where(eq(posts.id, postId));

    return c.json({ success: true });
  } catch (error) {
    console.error('Error clearing pending flag:', error);
    return c.json({ error: 'Failed to clear pending flag' }, 500);
  }
};

/**
 * GET /api/payments
 * Get all payments (admin only)
 */
export const getAllPayments = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Check admin
    if (!isAdmin(session.telegramId, c.env)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { limit, offset } = parsePagination(c);

    const db = createDatabase(c.env.DB);
    const paymentService = new PaymentService(db, c.env);

    const payments = await paymentService.getAllPayments(limit, offset);
    const total = await paymentService.getPaymentCount();

    return c.json({
      payments,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
};

/**
 * GET /api/payments/balance
 * Get bot star balance (admin only, cached)
 */
export const getBalance = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Check admin
    if (!isAdmin(session.telegramId, c.env)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const db = createDatabase(c.env.DB);
    const paymentService = new PaymentService(db, c.env);

    const balanceData = await paymentService.getBotStarBalance();

    return c.json({
      star_balance: balanceData.balance,
      cached_at: balanceData.cachedAt,
      expires_at: balanceData.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return c.json({ error: 'Failed to fetch balance' }, 500);
  }
};

/**
 * POST /api/payments/refresh-balance
 * Refresh bot star balance cache (admin only)
 */
export const refreshBalance = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Check admin
    if (!isAdmin(session.telegramId, c.env)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const db = createDatabase(c.env.DB);
    const paymentService = new PaymentService(db, c.env);

    // Clear cache and fetch fresh
    await paymentService.clearBalanceCache();
    const balanceData = await paymentService.getBotStarBalance();

    return c.json({
      star_balance: balanceData.balance,
      cached_at: balanceData.cachedAt,
      expires_at: balanceData.expiresAt,
    });
  } catch (error) {
    console.error('Error refreshing balance:', error);
    return c.json({ error: 'Failed to refresh balance' }, 500);
  }
};

/**
 * POST /api/payments/:paymentId/refund
 * Refund a payment (admin only)
 */
export const refundPayment = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Check admin
    if (!isAdmin(session.telegramId, c.env)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Parse payment ID
    const paymentId = c.req.param('paymentId');
    if (!paymentId) {
      return c.json({ error: 'Invalid payment ID' }, 400);
    }

    const db = createDatabase(c.env.DB);
    const paymentService = new PaymentService(db, c.env);

    // Attempt refund
    const result = await paymentService.refundPayment(paymentId);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error processing refund:', error);
    return c.json({ error: 'Failed to process refund' }, 500);
  }
};

/**
 * POST /api/payments/reconcile
 * Reconcile payments with Telegram Star transactions (admin only)
 */
export const reconcilePayments = async (c: Context<{ Bindings: Env }>) => {
  try {
    // Authenticate user
    const authResult = await authenticateUser(c);
    if ('error' in authResult && authResult.error) {
      return c.json({ error: authResult.error.message }, authResult.error.status);
    }
    const { session } = authResult;

    // Check admin
    if (!isAdmin(session.telegramId, c.env)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const db = createDatabase(c.env.DB);
    const paymentService = new PaymentService(db, c.env);

    // Run reconciliation
    const result = await paymentService.reconcilePayments();

    return c.json({
      success: true,
      summary: {
        updated: result.updated.length,
        unchanged: result.unchanged,
        notFoundInTelegram: result.notFoundInTelegram.length,
        errors: result.errors.length,
      },
      details: result,
    });
  } catch (error) {
    console.error('Error reconciling payments:', error);
    return c.json({ error: 'Failed to reconcile payments' }, 500);
  }
};
