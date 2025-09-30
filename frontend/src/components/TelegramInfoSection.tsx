interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramInfoSectionProps {
  user: TelegramUser | null;
  isAdmin?: boolean;
}

export function TelegramInfoSection({ user, isAdmin }: TelegramInfoSectionProps) {
  if (!user) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Telegram Information
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

        <div className="flex gap-2">
          {user.is_premium && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              ⭐ Premium User
            </span>
          )}
          {isAdmin && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              🔴 ADMIN
            </span>
          )}
        </div>
      </div>
    </div>
  );
}