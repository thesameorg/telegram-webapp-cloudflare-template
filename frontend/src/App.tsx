import { useEffect } from 'react'
import HelloWorld from './components/HelloWorld'
import { useTelegram } from './utils/telegram'
import { AuthProvider, withAuth } from './contexts/auth-context'
import './index.css'

// Protected HelloWorld component
const ProtectedHelloWorld = withAuth(HelloWorld)

function AppContent() {
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
    <div className="App min-h-screen">
      <ProtectedHelloWorld />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App