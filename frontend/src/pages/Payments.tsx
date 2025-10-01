import { useState, useEffect, useRef } from 'react';
import { useSimpleAuth } from '../hooks/use-simple-auth';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Payment {
  id: string;
  userId: number;
  postId: number;
  starAmount: number;
  status: string;
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  createdAt: string;
}

interface BalanceData {
  star_balance: number;
  cached_at: string;
  expires_at: string;
}

export default function Payments() {
  const { isAdmin, isLoading: authLoading } = useSimpleAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [refundingPaymentId, setRefundingPaymentId] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<{ id: string; starAmount: number; userId: number } | null>(null);
  const [limit] = useState(50);
  const [offset] = useState(0);
  const pollIntervalRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Redirect if not admin (but wait for auth to load first)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);

  // Fetch payments and balance
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        const sessionId = localStorage.getItem('telegram_session_id');
        if (!sessionId) {
          throw new Error('Not authenticated');
        }

        // Fetch payments
        const paymentsResponse = await fetch(
          `/api/payments?limit=${limit}&offset=${offset}`,
          {
            headers: { 'Authorization': `Bearer ${sessionId}` },
          }
        );

        if (!paymentsResponse.ok) {
          throw new Error('Failed to fetch payments');
        }

        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.payments);

        // Fetch balance
        const balanceResponse = await fetch('/api/payments/balance', {
          headers: { 'Authorization': `Bearer ${sessionId}` },
        });

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setBalance(balanceData);
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to load payments',
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, limit, offset, showToast]);

  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      const sessionId = localStorage.getItem('telegram_session_id');
      if (!sessionId) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/payments/refresh-balance', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh balance');
      }

      const balanceData = await response.json();
      setBalance(balanceData);
      showToast('Balance refreshed', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to refresh balance',
        'error'
      );
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const sessionId = localStorage.getItem('telegram_session_id');
      if (!sessionId) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/payments/reconcile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });

      if (!response.ok) {
        throw new Error('Failed to reconcile payments');
      }

      const data = await response.json();

      // Refresh payments list
      const updatedPayments = await fetchPayments();
      if (updatedPayments) {
        setPayments(updatedPayments);
      }

      // Show success message with summary
      const { summary } = data;
      if (summary.updated > 0) {
        showToast(
          `Reconciled: ${summary.updated} updated, ${summary.unchanged} unchanged`,
          'success'
        );
      } else {
        showToast('All payments already in sync', 'success');
      }

      // Show warnings if any
      if (summary.notFoundInTelegram > 0) {
        console.warn(`${summary.notFoundInTelegram} payments not found in Telegram`);
      }
      if (summary.errors > 0) {
        console.error(`${summary.errors} errors during reconciliation`);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to reconcile payments',
        'error'
      );
    } finally {
      setIsReconciling(false);
    }
  };

  const fetchPayments = async () => {
    const sessionId = localStorage.getItem('telegram_session_id');
    if (!sessionId) return null;

    try {
      const response = await fetch(
        `/api/payments?limit=${limit}&offset=${offset}`,
        {
          headers: { 'Authorization': `Bearer ${sessionId}` },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.payments;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return null;
    }
  };

  const pollForRefundStatus = (paymentId: string) => {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max (500ms * 20)

    pollIntervalRef.current = window.setInterval(async () => {
      attempts++;

      const updatedPayments = await fetchPayments();
      if (updatedPayments) {
        const refundedPayment = updatedPayments.find((p: Payment) => p.id === paymentId);

        if (refundedPayment?.status === 'refunded') {
          // Refund processed! Update UI
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPayments(updatedPayments);
          setRefundingPaymentId(null);
          setConfirmRefund(null);
          showToast('Refund completed successfully', 'success');
          return;
        }
      }

      // Stop polling after max attempts
      if (attempts >= maxAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        // Refresh one last time
        const finalPayments = await fetchPayments();
        if (finalPayments) setPayments(finalPayments);
        setRefundingPaymentId(null);
        setConfirmRefund(null);
      }
    }, 500);
  };

  const handleRefund = async (paymentId: string) => {
    setRefundingPaymentId(paymentId);
    try {
      const sessionId = localStorage.getItem('telegram_session_id');
      if (!sessionId) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refund payment');
      }

      showToast('Refund initiated, waiting for confirmation...', 'success');

      // Start polling for refund status
      pollForRefundStatus(paymentId);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to refund payment',
        'error'
      );
      setRefundingPaymentId(null);
      setConfirmRefund(null);
    }
  };

  const canRefund = (payment: Payment) => {
    // Can only refund succeeded payments
    if (payment.status !== 'succeeded') return false;

    // Check 7-day (168 hours) window
    const paymentAge = Date.now() - new Date(payment.createdAt).getTime();
    const SEVEN_DAYS_MS = 168 * 60 * 60 * 1000;
    return paymentAge <= SEVEN_DAYS_MS;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      created: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || styles.created
        }`}
      >
        {status}
      </span>
    );
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will be redirected
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 -mx-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payments</h1>
      </div>

      {/* Bot Balance */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Bot Balance
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {balance?.star_balance ?? 0}
              </span>
              <span className="text-2xl">⭐️</span>
            </div>
            {balance && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last updated: {formatDate(balance.cached_at)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefreshBalance}
              disabled={isRefreshingBalance}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isRefreshingBalance ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-gray-300"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
            <button
              onClick={handleReconcile}
              disabled={isReconciling}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 border border-blue-600 dark:border-blue-700 rounded-lg text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
              title="Sync payments with Telegram server"
            >
              {isReconciling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Reconcile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Payments List - Compact Card Layout */}
      <div className="space-y-2">
        {payments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No payments yet
          </div>
        ) : (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Line 1: User, Stars, Status, Action */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => navigate(`/profile/${payment.userId}`)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium truncate"
                  >
                    User {payment.userId}
                  </button>
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white shrink-0">
                    <span>{payment.starAmount}</span>
                    <span>⭐️</span>
                  </div>
                  <span className="hidden sm:inline">
                    {getStatusBadge(payment.status)}
                  </span>
                </div>
                <div className="shrink-0">
                  {canRefund(payment) ? (
                    <button
                      onClick={() => setConfirmRefund({ id: payment.id, starAmount: payment.starAmount, userId: payment.userId })}
                      disabled={refundingPaymentId === payment.id}
                      className="px-2 py-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title="Refund payment"
                    >
                      {refundingPaymentId === payment.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-600 dark:border-orange-400"></div>
                      ) : '↩️'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600 px-2">
                      {payment.status === 'refunded' ? '✓' :
                       payment.status !== 'succeeded' ? '-' :
                       '✗'}
                    </span>
                  )}
                </div>
              </div>

              {/* Line 2: Date, Post ID, Charge ID, Status (mobile) */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="shrink-0">{formatDate(payment.createdAt)}</span>
                <span>•</span>
                <span className="shrink-0">Post {payment.postId || '-'}</span>
                {payment.telegramPaymentChargeId && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline font-mono truncate" title={payment.telegramPaymentChargeId}>
                      {payment.telegramPaymentChargeId.substring(0, 8)}...
                    </span>
                  </>
                )}
                <span className="sm:hidden ml-auto">
                  {getStatusBadge(payment.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {confirmRefund && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm Refund
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to refund <strong>{confirmRefund.starAmount} star{confirmRefund.starAmount > 1 ? 's' : ''}</strong> to user <strong>{confirmRefund.userId}</strong>?
              <br /><br />
              This action will revert the post to a regular (not-starred) post and return the stars to the user.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmRefund(null)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefund(confirmRefund.id)}
                disabled={refundingPaymentId !== null}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refundingPaymentId ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
