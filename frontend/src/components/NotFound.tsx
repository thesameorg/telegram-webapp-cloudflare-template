import { useNavigate, useLocation } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4">
      <div className="max-w-md text-center bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-lg mb-4 opacity-90">
          The page <code className="bg-black/20 px-2 py-1 rounded font-mono">{location.pathname}</code> doesn't exist.
        </p>
        <p className="text-base mb-6 opacity-80">
          You might be looking for the main app or our API endpoints.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}

export default NotFound