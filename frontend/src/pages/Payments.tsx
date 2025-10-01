import { useState, useEffect } from 'react';
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
  const [limit] = useState(50);
  const [offset] = useState(0);

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
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Post ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stars
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Charge ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No payments yet
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => navigate(`/profile/${payment.userId}`)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {payment.userId}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {payment.postId || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {payment.starAmount}
                        </span>
                        <span>⭐️</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {payment.telegramPaymentChargeId ? (
                        <span title={payment.telegramPaymentChargeId}>
                          {payment.telegramPaymentChargeId.substring(0, 12)}...
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
