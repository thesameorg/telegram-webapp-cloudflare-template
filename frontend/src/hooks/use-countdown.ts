import { useState, useEffect } from 'react'

export function useCountdown(expiresAt: number | null | undefined) {
  const [timeLeft, setTimeLeft] = useState('N/A')

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

  return timeLeft
}