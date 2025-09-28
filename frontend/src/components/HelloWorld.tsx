import { useTelegram } from '../utils/telegram'
import { useAuth } from '../contexts/auth-context'
import { useState, useEffect } from 'react'

export default function HelloWorld() {
  const { webApp, isWebAppReady } = useTelegram()
  const { user, sessionId, expiresAt, authSource } = useAuth()
  const [healthStatus, setHealthStatus] = useState('Checking...')
  const [healthTimestamp, setHealthTimestamp] = useState('-')
  const [kvStatus, setKvStatus] = useState('Checking...')
  const [timeLeft, setTimeLeft] = useState('N/A')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        setHealthStatus(data.status)
        setHealthTimestamp(new Date(data.timestamp).toLocaleString())

        // Extract KV status
        if (data.services?.kv) {
          const kv = data.services.kv
          const status = kv.available ? 'healthy' : 'unavailable'
          setKvStatus(`${status} (SESSIONS)${kv.error ? ' - ' + kv.error : ''}`)
        } else {
          setKvStatus('Not available')
        }
      })
      .catch(() => {
        setHealthStatus('Error')
        setKvStatus('Error')
      })
  }, [])

  // Update time left countdown
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('N/A')
      return
    }

    const updateTimeLeft = () => {
      const now = Date.now()
      const timeLeftMs = expiresAt - now

      if (timeLeftMs > 0) {
        const minutes = Math.floor(timeLeftMs / 60000)
        const seconds = Math.floor((timeLeftMs % 60000) / 1000)
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft('Expired')
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

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
            <p><strong>Backend Status:</strong> <span>{healthStatus}</span></p>
            <p><strong>KV Status:</strong> <span>{kvStatus}</span></p>
            <p><strong>Session ID:</strong> <span>{sessionId ? sessionId.slice(0, 8) + '...' : 'None'}</span></p>
            <p><strong>Auth Source:</strong> <span>{authSource || 'None'}</span></p>
            <p><strong>Time Left:</strong> <span>{timeLeft}</span></p>
            <p><strong>Last Check:</strong> <span>{healthTimestamp}</span></p>
          </div>
        </div>

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
                    <p><strong>User:</strong> {user.first_name} {user.last_name || ''}</p>
                    {user.username && <p><strong>Username:</strong> @{user.username}</p>}
                  </div>
                </div>
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