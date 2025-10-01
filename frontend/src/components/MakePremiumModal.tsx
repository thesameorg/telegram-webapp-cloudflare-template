import { useState } from 'react';
import { useToast } from '../hooks/use-toast';

interface MakePremiumModalProps {
  postId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MakePremiumModal({ postId, onClose, onSuccess }: MakePremiumModalProps) {
  const [starCount, setStarCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  // Calculate golden gradient preview
  const getGradientPreview = (stars: number) => {
    const intensity = stars / 10;
    const lightness = 90 - (intensity * 30);
    const saturation = 70 + (intensity * 20);
    return `linear-gradient(135deg, hsl(45, ${saturation}%, ${lightness}%), hsl(39, ${saturation + 10}%, ${lightness - 5}%))`;
  };

  const handleConfirm = async () => {
    if (starCount < 1 || starCount > 10) {
      showToast('Please select between 1 and 10 stars', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const sessionId = localStorage.getItem('telegram_session_id');
      if (!sessionId) {
        throw new Error('Not authenticated');
      }

      // Create payment and get invoice URL
      const response = await fetch(`/api/posts/${postId}/make-premium`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ star_count: starCount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      const { invoice_url } = await response.json();

      // Open invoice with Telegram WebApp
      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(invoice_url, async (status) => {
          setIsProcessing(false);

          if (status === 'paid') {
            showToast(`Payment successful! Your post is now premium ⭐️`, 'success');
            onSuccess?.();
            onClose();
          } else if (status === 'cancelled') {
            // Clear pending flag
            await fetch(`/api/posts/${postId}/clear-pending`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${sessionId}` },
            });
            showToast('Payment cancelled', 'info');
            onSuccess?.(); // Refresh to clear loading state
          } else if (status === 'failed') {
            // Clear pending flag
            await fetch(`/api/posts/${postId}/clear-pending`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${sessionId}` },
            });
            showToast('Payment failed', 'error');
            onSuccess?.(); // Refresh to clear loading state
          }
        });
      } else {
        throw new Error('Telegram WebApp API not available');
      }
    } catch (error) {
      setIsProcessing(false);
      showToast(error instanceof Error ? error.message : 'Failed to process payment', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
      tabIndex={-1}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Make Post Premium
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Star selector */}
          <div className="space-y-3">
            <label htmlFor="star-count" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Stars (1-10)
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="star-count"
                type="range"
                min="1"
                max="10"
                value={starCount}
                onChange={(e) => setStarCount(parseInt(e.target.value))}
                disabled={isProcessing}
                className="flex-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 touch-slider"
                style={{
                  height: '40px',
                  background: `linear-gradient(to right, #FFD700 0%, #FFA500 ${(starCount / 10) * 100}%, #e5e7eb ${(starCount / 10) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex items-center space-x-1 min-w-[4rem] justify-end">
                <span className="text-2xl">⭐️</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{starCount}</span>
              </div>
            </div>
            <style>{`
              .touch-slider::-webkit-slider-thumb {
                appearance: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                border: 3px solid white;
              }
              .touch-slider::-moz-range-thumb {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                border: 3px solid white;
              }
              .touch-slider::-webkit-slider-thumb:active {
                transform: scale(1.2);
              }
              .touch-slider::-moz-range-thumb:active {
                transform: scale(1.2);
              }
            `}</style>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview
            </div>
            <div
              className="p-4 rounded-lg border-2"
              style={{
                background: getGradientPreview(starCount),
                borderImage: 'linear-gradient(135deg, #FFD700, #FFA500) 1',
                boxShadow: `0 0 ${10 + starCount * 2}px rgba(255, 215, 0, ${0.3 + (starCount / 10) * 0.4})`,
              }}
            >
              <p className="text-gray-800 dark:text-gray-900 font-medium">
                This is how your premium post will look!
              </p>
            </div>
          </div>

          {/* Cost info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Cost:</strong> {starCount} Telegram Star{starCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              You&apos;ll be redirected to Telegram&apos;s payment interface
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                ⭐️ Make Premium
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
