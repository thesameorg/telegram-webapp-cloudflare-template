export default function AuthRequired() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Required
        </h1>
        <p className="text-gray-600 mb-6">
          Please open this application from Telegram to continue.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            This app requires Telegram Web App authentication.
          </p>
        </div>
      </div>
    </div>
  );
}