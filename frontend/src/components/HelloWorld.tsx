import { useState, useEffect } from 'react'
import { useTelegram } from '../utils/telegram'

interface HelloResponse {
  message: string
  timestamp: string
  environment: string
}

export default function HelloWorld() {
  const [helloData, setHelloData] = useState<HelloResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { webApp, user, isWebAppReady } = useTelegram()

  useEffect(() => {
    const fetchHello = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/hello')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        setHelloData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hello data')
      } finally {
        setLoading(false)
      }
    }

    fetchHello()
  }, [])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div
      data-testid="hello-world-container"
      className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-gray-900"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-blue-600 mb-8">
          Hello World
        </h1>

        {loading && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {helloData && (
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <p className="text-lg font-semibold text-green-600">
              {helloData.message}
            </p>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Environment:</strong> {helloData.environment}</p>
              <p><strong>Last updated:</strong> {formatTimestamp(helloData.timestamp)}</p>
            </div>
          </div>
        )}

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