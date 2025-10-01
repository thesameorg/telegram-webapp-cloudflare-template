import { eq, desc } from 'drizzle-orm';
import type { Database } from '../db';
import { payments, posts } from '../db/schema';
import type { Env } from '../types/env';
import { Bot } from 'grammy';

export type PaymentStatus = 'created' | 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface CreatePaymentInput {
  userId: number;
  postId: number;
  starAmount: number;
}

export interface UpdatePaymentStatusInput {
  status: PaymentStatus;
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  rawUpdate?: unknown;
}

export class PaymentService {
  constructor(private db: Database, private env: Env) {}

  /**
   * Create a new payment and generate invoice link
   */
  async createPayment(input: CreatePaymentInput) {
    const now = new Date().toISOString();
    const paymentId = crypto.randomUUID();

    // Create invoice payload with metadata
    const invoicePayload = JSON.stringify({
      postId: input.postId,
      userId: input.userId,
      paymentId,
      timestamp: now,
    });

    // Create payment record
    const [newPayment] = await this.db.insert(payments).values({
      id: paymentId,
      invoicePayload,
      userId: input.userId,
      postId: input.postId,
      starAmount: input.starAmount,
      status: 'created',
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Generate invoice link using Telegram Bot API
    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    const invoiceLink = await bot.api.createInvoiceLink(
      'Make Post Premium',
      `Upgrade your post with ${input.starAmount} star${input.starAmount > 1 ? 's' : ''}`,
      invoicePayload,
      '', // provider_token is empty for Telegram Stars
      'XTR', // currency
      [{ label: 'Stars', amount: input.starAmount }]
    );

    // Update post to show payment pending
    await this.db.update(posts)
      .set({
        isPaymentPending: 1,
        updatedAt: now,
      })
      .where(eq(posts.id, input.postId));

    return {
      payment: newPayment,
      invoiceUrl: invoiceLink,
    };
  }

  /**
   * Get payment by invoice payload
   */
  async getPaymentByInvoicePayload(payload: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.invoicePayload, payload))
      .limit(1);

    return payment;
  }

  /**
   * Get payment by telegram payment charge ID (for idempotency)
   */
  async getPaymentByChargeId(chargeId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.telegramPaymentChargeId, chargeId))
      .limit(1);

    return payment;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    return payment;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: string, input: UpdatePaymentStatusInput) {
    const now = new Date().toISOString();

    const [updatedPayment] = await this.db
      .update(payments)
      .set({
        status: input.status,
        telegramPaymentChargeId: input.telegramPaymentChargeId,
        providerPaymentChargeId: input.providerPaymentChargeId,
        rawUpdate: input.rawUpdate ? JSON.stringify(input.rawUpdate) : undefined,
        updatedAt: now,
      })
      .where(eq(payments.id, paymentId))
      .returning();

    return updatedPayment;
  }

  /**
   * Get payments by user
   */
  async getPaymentsByUser(userId: number, limit = 50, offset = 0) {
    return await this.db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get all payments (admin only)
   */
  async getAllPayments(limit = 50, offset = 0) {
    return await this.db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get total payment count
   */
  async getPaymentCount() {
    const [result] = await this.db
      .select({ count: payments.id })
      .from(payments);

    return result?.count || 0;
  }

  /**
   * Get bot star balance (cached via KV)
   */
  async getBotStarBalance(): Promise<{ balance: number; cachedAt: string; expiresAt: string }> {
    const cached = await this.env.SESSIONS.get<{ balance: number; cachedAt: string }>('bot_star_balance', 'json');

    if (cached && typeof cached === 'object' && 'cachedAt' in cached && Date.now() - new Date(cached.cachedAt).getTime() < 300000) { // 5 min cache
      return {
        balance: cached.balance,
        cachedAt: cached.cachedAt,
        expiresAt: new Date(new Date(cached.cachedAt).getTime() + 300000).toISOString(),
      };
    }

    // Fetch fresh balance
    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    // Note: Telegram Stars balance is calculated from transactions
    // For now, we return 0. In production, sum up transaction amounts
    await bot.api.getStarTransactions({ limit: 1 });

    const cachedAt = new Date().toISOString();
    await this.env.SESSIONS.put('bot_star_balance', JSON.stringify({
      balance: 0, // TODO: Calculate actual balance from transactions
      cachedAt,
    }), { expirationTtl: 300 });

    return {
      balance: 0,
      cachedAt,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
  }

  /**
   * Clear bot balance cache
   */
  async clearBalanceCache() {
    await this.env.SESSIONS.delete('bot_star_balance');
  }
}
