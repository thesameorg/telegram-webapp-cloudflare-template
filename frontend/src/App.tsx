import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HelloWorld from './components/HelloWorld'
import NotFound from './components/NotFound'
import { useTelegram } from './utils/telegram'
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
    <div className="App min-h-screen">
      <Router>
        <Routes>
          <Route path="/" element={<HelloWorld />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App