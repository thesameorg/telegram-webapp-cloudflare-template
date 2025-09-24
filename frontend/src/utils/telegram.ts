import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

declare global {
  interface Window {
    Telegram?: {
      WebApp: typeof WebApp
    }
  }
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: any
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: any
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  ready: () => void
  expand: () => void
  close: () => void
  sendData: (data: string) => void
  onEvent: (eventType: string, eventHandler: () => void) => void
  offEvent: (eventType: string, eventHandler: () => void) => void
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isWebAppReady, setIsWebAppReady] = useState(false)

  useEffect(() => {
    const initializeTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp

        setWebApp(tg as any)
        setUser(tg.initDataUnsafe?.user || null)

        tg.ready()
        tg.expand()

        setIsWebAppReady(true)

        const handleThemeChanged = () => {
          console.log('Theme changed to:', tg.colorScheme)
        }

        const handleViewportChanged = () => {
          console.log('Viewport changed:', {
            height: tg.viewportHeight,
            stableHeight: tg.viewportStableHeight,
            isExpanded: tg.isExpanded
          })
        }

        tg.onEvent('themeChanged', handleThemeChanged)
        tg.onEvent('viewportChanged', handleViewportChanged)

        return () => {
          tg.offEvent('themeChanged', handleThemeChanged)
          tg.offEvent('viewportChanged', handleViewportChanged)
        }
      } else {
        console.warn('Telegram Web App SDK not available')
        setIsWebAppReady(false)
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeTelegram)
    } else {
      initializeTelegram()
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeTelegram)
    }
  }, [])

  const sendData = (data: any) => {
    if (webApp) {
      webApp.sendData(JSON.stringify(data))
    } else {
      console.warn('Telegram Web App not available')
    }
  }

  const closeTelegram = () => {
    if (webApp) {
      webApp.close()
    }
  }

  return {
    webApp,
    user,
    isWebAppReady,
    sendData,
    closeTelegram
  }
}

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) {
    return false
  }

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')

    if (!hash) {
      return false
    }

    urlParams.delete('hash')
    // const dataCheckString = Array.from(urlParams.entries())
    //   .sort(([a], [b]) => a.localeCompare(b))
    //   .map(([key, value]) => `${key}=${value}`)
    //   .join('\n')

    // TODO: Implement proper HMAC validation
    return true

  } catch (error) {
    console.error('Error validating Telegram init data:', error)
    return false
  }
}