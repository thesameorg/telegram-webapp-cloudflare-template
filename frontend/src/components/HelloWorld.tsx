import { useTelegram } from '../utils/telegram'

export default function HelloWorld() {
  const { webApp, user, isWebAppReady } = useTelegram()

  return (
    <div
      data-testid="hello-world-container"
      className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-gray-900"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-blue-600 mb-8">
          Hello World
        </h1>

        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <p className="text-lg font-semibold text-green-600">
            Welcome to Telegram Web App!
          </p>

          <div className="text-sm text-gray-600">
            <p><strong>Backend Status:</strong> <span id="health-status">Checking...</span></p>
            <p><strong>Last Check:</strong> <span id="health-timestamp">-</span></p>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
            fetch('/health')
              .then(r => r.json())
              .then(data => {
                document.getElementById('health-status').textContent = data.status;
                document.getElementById('health-timestamp').textContent = new Date(data.timestamp).toLocaleString();
              })
              .catch(() => {
                document.getElementById('health-status').textContent = 'Error';
              });
          `
        }} />

        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">
            Telegram Web App Status
          </h2>

          <div className="text-sm space-y-2">
            <p>
              <strong>Telegram Web App:</strong>{' '}
              <span className={isWebAppReady ? 'text-green-600' : 'text-red-600'}>
                {isWebAppReady ? 'Connected' : 'Not Connected'}
              </span>
            </p>

            {user && (
              <div className="text-left">
                <p><strong>User:</strong> {user.first_name} {user.last_name || ''}</p>
                {user.username && <p><strong>Username:</strong> @{user.username}</p>}
                <p><strong>Language:</strong> {user.language_code || 'Unknown'}</p>
              </div>
            )}

            {webApp && (
              <div className="text-left">
                <p><strong>Platform:</strong> {webApp.platform}</p>
                <p><strong>Version:</strong> {webApp.version}</p>
                <p><strong>Theme:</strong> {webApp.colorScheme}</p>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-500">
          🚀 Telegram Web App + Bot Template
        </div>
      </div>
    </div>
  )
}