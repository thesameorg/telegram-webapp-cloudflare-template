import { useTelegram } from '../utils/telegram'
import { useSimpleAuth } from '../hooks/use-simple-auth'
import { useHealthCheck } from '../hooks/use-health-check'
import { useCountdown } from '../hooks/use-countdown'
import StatusDisplay from './StatusDisplay'
import UserInfo from './UserInfo'

export default function HelloWorld() {
  const { webApp, isWebAppReady } = useTelegram()
  const { user, sessionId, expiresAt } = useSimpleAuth()
  const { healthStatus, healthTimestamp, kvStatus } = useHealthCheck()
  const timeLeft = useCountdown(expiresAt)

  return (
    <div
      data-testid="hello-world-container"
      className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-gray-900"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-blue-600 mb-8">
          Hello World
        </h1>

        <StatusDisplay
          healthStatus={healthStatus}
          kvStatus={kvStatus}
          sessionId={sessionId}
          timeLeft={timeLeft}
          healthTimestamp={healthTimestamp}
        />

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

            {user && <UserInfo user={user} />}

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