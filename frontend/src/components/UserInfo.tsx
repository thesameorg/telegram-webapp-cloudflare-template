interface User {
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="text-left space-y-3">
      <div className="flex items-center space-x-3">
        {user.photo_url ? (
          <img
            src={user.photo_url}
            alt={`${user.first_name}'s avatar`}
            className="w-12 h-12 rounded-full border-2 border-blue-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {user.first_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p>
            <strong>User:</strong> {user.first_name} {user.last_name || ""}
          </p>
          {user.username && (
            <p>
              <strong>Username:</strong> @{user.username}
            </p>
          )}
        </div>
      </div>
      <p>
        <strong>Language:</strong> {user.language_code || "Unknown"}
      </p>
    </div>
  );
}
