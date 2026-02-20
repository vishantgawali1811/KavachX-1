import { useState, useEffect } from 'react'

import MetricCards        from './components/MetricCards.jsx'
import TrendChart         from './components/TrendChart.jsx'
import DistributionChart  from './components/DistributionChart.jsx'
import ActivityLog        from './components/ActivityLog.jsx'
import ScanModal          from './components/ScanModal.jsx'
import ThreatIntel        from './components/ThreatIntel.jsx'

const API_URL = 'http://localhost:5001'

// ── URL Scanner card ──────────────────────────────────────────────────────────
function Scanner({ onResult }) {
  const [url, setUrl]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = url.trim()
    if (!trimmed)                                      { setError('Please enter a URL.'); return }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError("URL must start with 'http://' or 'https://'"); return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Server error')
      } else {
        // Backend now returns a full scan entry — pass through directly
        onResult(data)
        setUrl('')
      }
    } catch {
      setError('Could not connect to the backend. Is the Flask server running on port 5001?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scanner-card">
      <div className="scanner-head">
        <div>
          <div className="scanner-title">Scan a URL</div>
          <div className="scanner-sub">Paste any URL — AI model will classify it in real-time</div>
        </div>
        <span className="scanner-badge">🤖 Random Forest</span>
      </div>
      <form className="scanner-form" onSubmit={handleSubmit}>
        <div className="scanner-icon">🔍</div>
        <input
          type="text"
          className="scanner-input"
          placeholder="https://example.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="scanner-btn" disabled={loading}>
          {loading ? (
            <><span className="spinner" /> Scanning…</>
          ) : 'Classify URL →'}
        </button>
      </form>
      {error && <div className="scanner-error">⚠️ {error}</div>}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub, action }) {
  return (
    <div className="section-head">
      <div className="section-head-left">
        <span className="section-head-icon">{icon}</span>
        <div>
          <div className="section-head-title">{title}</div>
          {sub && <div className="section-head-sub">{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [history,     setHistory]     = useState([])
  const [selected,    setSelected]    = useState(null)
  const [modelOk,     setModelOk]     = useState(true)
  const [loadingHist, setLoadingHist] = useState(true)

  // Fetch health + persisted scan history on mount
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.ok ? setModelOk(true) : setModelOk(false))
      .catch(() => setModelOk(false))

    fetch(`${API_URL}/history`)
      .then(r => r.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); setLoadingHist(false) })
      .catch(() => setLoadingHist(false))
  }, [])

  const addScan = (scan) => setHistory(prev => [scan, ...prev])

  const clearHistory = async () => {
    await fetch(`${API_URL}/history`, { method: 'DELETE' }).catch(() => {})
    setHistory([])
  }

  return (
    <div className="dashboard-root">
      <div className="dashboard-main">
        {/* ── Header ── */}
        <header className="topbar">
          <div className="topbar-brand">
            <span className="topbar-logo">🛡️</span>
            <div>
              <div className="topbar-name">KavachX</div>
              <div className="topbar-tagline">Phishing Intelligence Platform</div>
            </div>
          </div>

          <div className="topbar-center">
            <span className="topbar-title">Phishing Intelligence Dashboard</span>
            <span className="topbar-date">{new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>
          </div>

          <div className="topbar-right">
            <div className={`status-pill ${modelOk ? 'pill-ok' : 'pill-err'}`}>
              <span className="pulse-dot" />
              <span>{modelOk ? 'Model Online' : 'Model Offline'}</span>
            </div>
            <button
              className="clear-history-btn"
              onClick={clearHistory}
              disabled={history.length === 0}
              title="Clear all scan history"
            >
              ↺ Clear
            </button>
          </div>
        </header>

        {/* ── Scanner ── */}
        <section id="scanner" className="dash-section">
          <Scanner onResult={addScan} />
        </section>

        {/* ── KPI Cards ── */}
        <section id="metrics" className="dash-section">
          <SectionHead icon="📊" title="Overview" sub="Real-time threat statistics across all scanned URLs" />
          {loadingHist
            ? <div className="data-loading"><span className="spinner" /> Loading history…</div>
            : <MetricCards scans={history} />}
        </section>

        {/* ── Charts ── */}
        <section id="charts" className="dash-section">
          <SectionHead icon="📈" title="Risk Analytics" sub="Trend analysis and distribution of threat classifications" />
          {loadingHist
            ? <div className="data-loading"><span className="spinner" /> Loading history…</div>
            : (
            <div className="charts-row">
              <div className="chart-col-wide"><TrendChart scans={history} /></div>
              <div className="chart-col-narrow"><DistributionChart scans={history} /></div>
            </div>
          )}
        </section>

        {/* ── Activity Log ── */}
        <section id="log" className="dash-section">
          <ActivityLog scans={history} onSelect={setSelected} loading={loadingHist} />
        </section>

        {/* ── Threat Intelligence ── */}
        <section id="intel" className="dash-section">
          <SectionHead icon="⚡" title="Threat Intelligence" sub="Pattern analysis derived from detected threats" />
          {loadingHist
            ? <div className="data-loading"><span className="spinner" /> Loading history…</div>
            : <ThreatIntel scans={history} />}
        </section>

        <div className="dashboard-footer">
          KavachX · AI-Powered Phishing Detection · Random Forest Classifier · 21-feature model
        </div>
      </div>

      {/* ── Scan detail modal ── */}
      {selected && (
        <ScanModal scan={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
