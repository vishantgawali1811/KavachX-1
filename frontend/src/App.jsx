import { useState } from 'react'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const [page, setPage]         = useState('landing')
  const [activeNav, setActiveNav] = useState('scan')

  const goToDashboard = (nav = 'scan') => { setActiveNav(nav); setPage('dashboard') }
  const goToLanding   = () => setPage('landing')

  if (page === 'landing') return <Landing onLaunchApp={goToDashboard} />
  return <Dashboard activeNav={activeNav} setActiveNav={setActiveNav} onGoHome={goToLanding} />
}

// ─── legacy exports below kept so StatChart etc. still resolve ───────────────
const _UNUSED_API_URL = 'http://localhost:5001'


