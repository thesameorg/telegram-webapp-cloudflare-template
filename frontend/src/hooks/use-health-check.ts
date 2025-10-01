import { useState, useEffect } from 'react'
import { config } from '../config'

interface HealthData {
  status: string
  timestamp: string
  services?: {
    kv?: {
      available: boolean
      error?: string
    }
  }
}

export function useHealthCheck() {
  const [healthStatus, setHealthStatus] = useState('Checking...')
  const [healthTimestamp, setHealthTimestamp] = useState('-')
  const [kvStatus, setKvStatus] = useState('Checking...')

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/api/health`, {
      credentials: 'include'
    })
      .then(r => r.json())
      .then((data: HealthData) => {
        setHealthStatus(data.status)
        setHealthTimestamp(new Date(data.timestamp).toLocaleString())

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

  return { healthStatus, healthTimestamp, kvStatus }
}