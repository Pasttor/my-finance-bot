import Dashboard from './pages/Dashboard'
import './index.css'

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* YouTube Video Background */}
      <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/jtjVORGeGFg?autoplay=1&mute=1&loop=1&playlist=jtjVORGeGFg&controls=0&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1"
          title="Background Video"
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 scale-150"
          style={{ aspectRatio: '16/9' }}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/70" />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10">
        <Dashboard />
      </div>
    </div>
  )
}

export default App
