import { useEffect } from 'react'
import { useTelegram } from './utils/telegram'
import Router from './Router'
import { ToastProvider } from './hooks/use-toast'
import './index.css'

function App() {
  const { webApp, isWebAppReady } = useTelegram()

  useEffect(() => {
    if (isWebAppReady && webApp) {
      document.body.style.backgroundColor = webApp.backgroundColor
      document.body.style.color = webApp.themeParams.text_color || '#000000'

      if (webApp.colorScheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [webApp, isWebAppReady])

  return (
    <ToastProvider>
      <div className="App min-h-screen">
        <Router />
      </div>
    </ToastProvider>
  )
}

export default App