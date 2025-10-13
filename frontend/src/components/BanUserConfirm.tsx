import { useState } from "react";
import { useToast } from "../hooks/use-toast";

interface BanUserConfirmProps {
  readonly telegramId: number;
  readonly username?: string;
  readonly isBanned: boolean;
  readonly onClose: () => void;
  readonly onActionCompleted?: () => void;
}

export default function BanUserConfirm({
  telegramId,
  username,
  isBanned,
  onClose,
  onActionCompleted,
}: BanUserConfirmProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const action = isBanned ? "unban" : "ban";
  const actionTitle = isBanned ? "Unban User" : "Ban User";
  const actionVerb = isBanned ? "Unban" : "Ban";

  const handleAction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionId = localStorage.getItem("telegram_session_id");
      if (!sessionId) {
        throw new Error("Not authenticated");
      }

      const endpoint = `/api/admin/${action}/${telegramId}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} user`);
      }

      showToast(`User ${action}ned successfully!`, "success");
      onActionCompleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {actionTitle}?
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Are you sure you want to {action}{" "}
              {username ? (
                <span className="font-medium">@{username}</span>
              ) : (
                "this user"
              )}
              ?
            </p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                This will:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {isBanned ? (
                  <>
                    <li>• Allow them to log in again</li>
                    <li>• Show their posts in feed</li>
                  </>
                ) : (
                  <>
                    <li>• Prevent login/authentication</li>
                    <li>• Hide all their posts from feed</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isBanned
                  ? "bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  : "bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
              } disabled:cursor-not-allowed`}
            >
              {isLoading ? `${actionVerb}ning...` : `${actionVerb} User`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
