import { useSimpleAuth } from '../hooks/use-simple-auth';
import { useTelegram } from '../utils/telegram';

export default function Account() {
  const { user, sessionId, expiresAt } = useSimpleAuth();
  const { webApp } = useTelegram();

  const formatExpiryDate = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account</h1>
      </div>

      {/* Account Info */}
      <div className="p-4 space-y-6">
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              User Information
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Name</span>
                <p className="text-gray-900 dark:text-white">
                  {user.first_name} {user.last_name || ''}
                </p>
              </div>

              {user.username && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Username</span>
                  <p className="text-gray-900 dark:text-white">@{user.username}</p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">User ID</span>
                <p className="text-gray-900 dark:text-white">{user.id}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Language</span>
                <p className="text-gray-900 dark:text-white">{user.language_code}</p>
              </div>

              {user.is_premium && (
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    ⭐ Premium User
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Session Information
          </h2>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Session ID</span>
              <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                {sessionId || 'Not available'}
              </p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Session Expires</span>
              <p className="text-gray-900 dark:text-white">
                {formatExpiryDate(expiresAt)}
              </p>
            </div>
          </div>
        </div>

        {/* App Info */}
        {webApp && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              App Information
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Platform</span>
                <p className="text-gray-900 dark:text-white">{webApp.platform}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Version</span>
                <p className="text-gray-900 dark:text-white">{webApp.version}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Theme</span>
                <p className="text-gray-900 dark:text-white capitalize">{webApp.colorScheme}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}