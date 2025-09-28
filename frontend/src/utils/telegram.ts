import { useState, useEffect } from 'react';
import { WebApp, WebAppUser } from '@twa-dev/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [user, setUser] = useState<WebAppUser | null>(null);
  const [isWebAppReady, setIsWebAppReady] = useState(false)

  useEffect(() => {
    const initializeTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp

        setWebApp(tg)
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

  const sendData = (data: unknown) => {
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
