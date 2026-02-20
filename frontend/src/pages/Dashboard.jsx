import Sidebar from '../components/Sidebar.jsx'
import RealtimeScan  from './RealtimeScan.jsx'
import ScanHistory   from './ScanHistory.jsx'
import Analytics     from './Analytics.jsx'
import ThreatFeed    from './ThreatFeed.jsx'
import Institution   from './Institution.jsx'
import Extension     from './Extension.jsx'
import TechPage      from './TechPage.jsx'

const PAGE_TITLES = {
  scan:        { title: 'Real-Time URL Scanner', sub: 'AI-powered phishing detection' },
  history:     { title: 'Scan History',          sub: 'All previously analysed URLs' },
  analytics:   { title: 'Risk Analytics',        sub: 'Phishing trends & threat intelligence' },
  feed:        { title: 'Live Threat Feed',       sub: 'Real-time phishing alerts' },
  institution: { title: 'Institution Dashboard',  sub: 'Aggregate attack intelligence' },
  extension:   { title: 'Extension Companion',   sub: 'Chrome extension sync & settings' },
  tech:        { title: 'Technical Architecture', sub: 'How KavachX works under the hood' },
}

export default function Dashboard({ activeNav, setActiveNav, onGoHome }) {
  const meta = PAGE_TITLES[activeNav] || PAGE_TITLES.scan

  const renderPage = () => {
    switch (activeNav) {
      case 'scan':        return <RealtimeScan />
      case 'history':     return <ScanHistory />
      case 'analytics':   return <Analytics />
      case 'feed':        return <ThreatFeed />
      case 'institution': return <Institution />
      case 'extension':   return <Extension />
      case 'tech':        return <TechPage />
      default:            return <RealtimeScan />
    }
  }

  return (
    <div className="app-shell">
      <Sidebar active={activeNav} onNav={setActiveNav} onGoHome={onGoHome} />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{meta.title}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 10 }}>{meta.sub}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-indicator">
              <span className="dot-live" />
              Backend Online
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onGoHome}
              style={{ fontSize: '0.78rem' }}
            >
              ← Landing Page
            </button>
          </div>
        </header>
        <main className="page-content">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
