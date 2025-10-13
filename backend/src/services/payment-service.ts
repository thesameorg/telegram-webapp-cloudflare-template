import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "../db";
import { payments, posts } from "../db/schema";
import type { Env } from "../types/env";
import { Bot } from "grammy";

export type PaymentStatus =
  | "created"
  | "pending"
  | "succeeded"
  | "failed"
  | "refunded";

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

export interface ReconciliationResult {
  updated: Array<{ paymentId: string; oldStatus: string; newStatus: string }>;
  unchanged: number;
  notFoundInTelegram: Array<{
    paymentId: string;
    status: string;
    createdAt: string;
  }>;
  errors: Array<{ paymentId: string; error: string }>;
}

export class PaymentService {
  constructor(
    private readonly db: Database,
    private readonly env: Env,
  ) {}

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
    const [newPayment] = await this.db
      .insert(payments)
      .values({
        id: paymentId,
        invoicePayload,
        userId: input.userId,
        postId: input.postId,
        starAmount: input.starAmount,
        status: "created",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Generate invoice link using Telegram Bot API
    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    const invoiceLink = await bot.api.createInvoiceLink(
      "Make Post Premium",
      `Upgrade your post with ${input.starAmount} star${input.starAmount > 1 ? "s" : ""}`,
      invoicePayload,
      "", // provider_token is empty for Telegram Stars
      "XTR", // currency
      [{ label: "Stars", amount: input.starAmount }],
    );

    // Update post to show payment pending
    await this.db
      .update(posts)
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
  async updatePaymentStatus(
    paymentId: string,
    input: UpdatePaymentStatusInput,
  ) {
    const now = new Date().toISOString();

    const [updatedPayment] = await this.db
      .update(payments)
      .set({
        status: input.status,
        telegramPaymentChargeId: input.telegramPaymentChargeId,
        providerPaymentChargeId: input.providerPaymentChargeId,
        rawUpdate: input.rawUpdate
          ? JSON.stringify(input.rawUpdate)
          : undefined,
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
  async getBotStarBalance(): Promise<{
    balance: number;
    cachedAt: string;
    expiresAt: string;
  }> {
    const cached = await this.env.SESSIONS.get<{
      balance: number;
      cachedAt: string;
    }>("bot_star_balance", "json");

    if (
      cached &&
      typeof cached === "object" &&
      "cachedAt" in cached &&
      Date.now() - new Date(cached.cachedAt).getTime() < 300000
    ) {
      // 5 min cache
      return {
        balance: cached.balance,
        cachedAt: cached.cachedAt,
        expiresAt: new Date(
          new Date(cached.cachedAt).getTime() + 300000,
        ).toISOString(),
      };
    }

    // Fetch fresh balance
    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    // Note: Telegram Stars balance is calculated from transactions
    // For now, we return 0. In production, sum up transaction amounts
    await bot.api.getStarTransactions({ limit: 1 });

    const cachedAt = new Date().toISOString();
    await this.env.SESSIONS.put(
      "bot_star_balance",
      JSON.stringify({
        balance: 0, // TODO: Calculate actual balance from transactions
        cachedAt,
      }),
      { expirationTtl: 300 },
    );

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
    await this.env.SESSIONS.delete("bot_star_balance");
  }

  // Helper: Validate refund eligibility
  private validateRefundEligibility(payment: {
    status: string;
    createdAt: string;
    telegramPaymentChargeId: string | null;
  }): { error?: string } {
    if (payment.status !== "succeeded") {
      return { error: `Cannot refund payment with status '${payment.status}'` };
    }

    const paymentAge = Date.now() - new Date(payment.createdAt).getTime();
    const SEVEN_DAYS_MS = 168 * 60 * 60 * 1000;
    if (paymentAge > SEVEN_DAYS_MS) {
      return { error: "Payment is older than 7 days and cannot be refunded" };
    }

    if (!payment.telegramPaymentChargeId) {
      return { error: "Payment missing telegram_payment_charge_id" };
    }

    return {};
  }

  // Helper: Check if error is permanent
  private isPermanentRefundError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      typeof error === "object" && error !== null && "error_code" in error
        ? (error.error_code as number)
        : undefined;

    return (
      errorMessage.includes("payment not found") ||
      errorMessage.includes("already refunded") ||
      errorMessage.includes("PAYMENT_NOT_FOUND") ||
      errorMessage.includes("PAYMENT_ALREADY_REFUNDED") ||
      errorCode === 400
    );
  }

  // Helper: Check if error is transient
  private isTransientRefundError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      typeof error === "object" && error !== null && "error_code" in error
        ? (error.error_code as number)
        : undefined;

    return (
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNRESET") ||
      (errorCode !== undefined && (errorCode === 429 || errorCode >= 500))
    );
  }

  // Helper: Handle refund retry logic
  private async handleRefundRetry(
    error: unknown,
    attempt: number,
    maxRetries: number,
  ): Promise<{ shouldRetry: boolean; errorMessage?: string }> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.isPermanentRefundError(error)) {
      console.error(`[Refund] Permanent error, not retrying:`, errorMessage);
      return { shouldRetry: false, errorMessage };
    }

    if (!this.isTransientRefundError(error) && attempt === maxRetries) {
      return { shouldRetry: false, errorMessage };
    }

    if (attempt < maxRetries) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[Refund] Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { shouldRetry: true };
    }

    return { shouldRetry: false, errorMessage };
  }

  /**
   * Refund a payment (admin only)
   * Validates 7-day window and calls Telegram API
   */
  async refundPayment(
    paymentId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const validationResult = this.validateRefundEligibility(payment);
    if (validationResult.error) {
      return { success: false, error: validationResult.error };
    }

    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Refund] Attempt ${attempt}/${maxRetries} for payment ${paymentId}`,
        );

        await bot.api.refundStarPayment(
          payment.userId,
          payment.telegramPaymentChargeId!,
        );

        console.log(`[Refund] Success for payment ${paymentId}`);
        return { success: true };
      } catch (error) {
        lastError = error;
        console.error(`[Refund] Attempt ${attempt} failed:`, error);

        const retryResult = await this.handleRefundRetry(
          error,
          attempt,
          maxRetries,
        );

        if (!retryResult.shouldRetry) {
          return { success: false, error: retryResult.errorMessage };
        }
      }
    }

    return {
      success: false,
      error:
        lastError instanceof Error
          ? lastError.message
          : "Refund failed after all retries",
    };
  }

  // Helper: Fetch all Telegram star transactions
  private async fetchTelegramTransactions(bot: Bot) {
    const allTransactions: Array<{
      id: string;
      amount: number;
      source?: unknown;
      receiver?: unknown;
    }> = [];
    let offset = 0;
    const limit = 100;
    const maxPages = 10;

    console.log("[Reconcile] Fetching Telegram star transactions...");

    for (let page = 0; page < maxPages; page++) {
      const response = await bot.api.getStarTransactions({ offset, limit });

      if (!response.transactions || response.transactions.length === 0) {
        break;
      }

      allTransactions.push(...response.transactions);
      console.log(
        `[Reconcile] Fetched ${response.transactions.length} transactions (page ${page + 1})`,
      );

      if (response.transactions.length < limit) {
        break;
      }

      offset += limit;
    }

    console.log(
      `[Reconcile] Total Telegram transactions: ${allTransactions.length}`,
    );
    return allTransactions;
  }

  // Helper: Determine payment status from Telegram transaction
  private getExpectedStatusFromTelegram(tx: {
    amount: number;
    source?: unknown;
    receiver?: unknown;
  }): PaymentStatus | null {
    const isRefund = tx.amount < 0 || tx.receiver;

    if (isRefund) {
      return "refunded";
    } else if (tx.source) {
      return "succeeded";
    }

    return null;
  }

  // Helper: Process single payment reconciliation
  private async processPaymentReconciliation(
    payment: {
      id: string;
      status: string;
      telegramPaymentChargeId: string | null;
      postId: number | null;
      createdAt: string;
    },
    telegramTxMap: Map<
      string,
      { id: string; amount: number; source?: unknown; receiver?: unknown }
    >,
    result: ReconciliationResult,
  ) {
    if (!payment.telegramPaymentChargeId) {
      return;
    }

    const telegramTx = telegramTxMap.get(payment.telegramPaymentChargeId);

    if (!telegramTx) {
      if (payment.status === "succeeded") {
        result.notFoundInTelegram.push({
          paymentId: payment.id,
          status: payment.status,
          createdAt: payment.createdAt,
        });
      }
      return;
    }

    const expectedStatus = this.getExpectedStatusFromTelegram(telegramTx);

    if (expectedStatus && expectedStatus !== payment.status) {
      console.log(
        `[Reconcile] Updating payment ${payment.id}: ${payment.status} -> ${expectedStatus}`,
      );

      await this.updatePaymentStatus(payment.id, {
        status: expectedStatus,
        rawUpdate: { reconciled: true, telegramTx },
      });

      result.updated.push({
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus: expectedStatus,
      });

      if (expectedStatus === "refunded" && payment.postId) {
        await this.db
          .update(posts)
          .set({
            starCount: 0,
            paymentId: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(posts.id, payment.postId));
      }
    } else {
      result.unchanged++;
    }
  }

  /**
   * Reconcile payments with Telegram Star transactions (admin only)
   * Syncs local DB payment statuses with actual Telegram transaction states
   */
  async reconcilePayments(): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      updated: [],
      unchanged: 0,
      notFoundInTelegram: [],
      errors: [],
    };

    try {
      const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
      const allTransactions = await this.fetchTelegramTransactions(bot);

      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const dbPayments = await this.db
        .select()
        .from(payments)
        .where(sql`${payments.createdAt} >= ${thirtyDaysAgo}`)
        .orderBy(desc(payments.createdAt));

      console.log(
        `[Reconcile] DB payments (last 30 days): ${dbPayments.length}`,
      );

      const telegramTxMap = new Map(
        allTransactions.filter((tx) => tx.id).map((tx) => [tx.id, tx]),
      );

      for (const payment of dbPayments) {
        try {
          await this.processPaymentReconciliation(
            payment,
            telegramTxMap,
            result,
          );
        } catch (error) {
          console.error(
            `[Reconcile] Error processing payment ${payment.id}:`,
            error,
          );
          result.errors.push({
            paymentId: payment.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log("[Reconcile] Summary:", {
        updated: result.updated.length,
        unchanged: result.unchanged,
        notFound: result.notFoundInTelegram.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      console.error("[Reconcile] Fatal error:", error);
      throw new Error(
        `Reconciliation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
