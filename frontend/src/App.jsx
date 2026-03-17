import { useState, useEffect, useMemo } from 'react'

import MetricCards           from './components/MetricCards.jsx'
import TrendChart            from './components/TrendChart.jsx'
import DistributionChart     from './components/DistributionChart.jsx'
import ActivityLog           from './components/ActivityLog.jsx'
import ScanModal             from './components/ScanModal.jsx'
import ThreatIntel           from './components/ThreatIntel.jsx'
import MessageScanner        from './components/MessageScanner.jsx'
import MessageActivityLog    from './components/MessageActivityLog.jsx'
import MessageDetailModal    from './components/MessageDetailModal.jsx'
import DeepfakeScanner       from './components/DeepfakeScanner.jsx'
import DeepfakeActivityLog   from './components/DeepfakeActivityLog.jsx'
import DeepfakeDetailModal   from './components/DeepfakeDetailModal.jsx'
import DfMetricCards         from './components/DfMetricCards.jsx'
import { DEMO_SCANS }        from './components/demoData.js'
import { DEMO_DF_SCANS }     from './components/dfDemoData.js'

const API_URL = 'http://localhost:5001'

// ── Security Glimpse — aggregated advisory stats ──────────────────────────────
function SecurityGlimpse({ scans }) {
  const stats = useMemo(() => {
    if (!scans.length) return null

    let highCount = 0, medCount = 0, lowCount = 0
    const attackFreq = {}

    scans.forEach(s => {
      const sev = s.highest_severity
      if (sev === 'High')   highCount++
      else if (sev === 'Medium') medCount++
      else if (sev === 'Low')    lowCount++

      ;(s.security_analysis ?? []).forEach(e => {
        e.possible_attacks.forEach(atk => {
          attackFreq[atk] = (attackFreq[atk] ?? 0) + 1
        })
      })
    })

    const topAttack = Object.entries(attackFreq)
      .sort((a, b) => b[1] - a[1])[0]

    const threats = scans.filter(s => s.status === 'Phishing' || s.status === 'Suspicious').length

    return { highCount, medCount, lowCount, topAttack, threats }
  }, [scans])

  if (!stats) return null

  return (
    <div className="glimpse-grid">
      <div className="glimpse-card gc-red">
        <div className="glimpse-val">{stats.threats}</div>
        <div className="glimpse-label">Threats Detected</div>
        <div className="glimpse-icon">🚨</div>
      </div>
      <div className="glimpse-card gc-orange">
        <div className="glimpse-val">{stats.highCount}</div>
        <div className="glimpse-label">High Severity Alerts</div>
        <div className="glimpse-icon">🔴</div>
      </div>
      <div className="glimpse-card gc-yellow">
        <div className="glimpse-val">{stats.medCount}</div>
        <div className="glimpse-label">Medium Severity</div>
        <div className="glimpse-icon">🟡</div>
      </div>
      <div className="glimpse-card gc-blue">
        <div className="glimpse-val">{stats.topAttack ? stats.topAttack[0] : '—'}</div>
        <div className="glimpse-label">
          Most Common Attack{stats.topAttack ? ` (${stats.topAttack[1]}×)` : ''}
        </div>
        <div className="glimpse-icon">🎯</div>
      </div>
    </div>
  )
}

// ── Message Glimpse — summary stats for message scans ────────────────────────
function MessageGlimpse({ scans }) {
  const stats = useMemo(() => {
    if (!scans.length) return null

    const phishing   = scans.filter(s => s.status === 'Phishing').length
    const suspicious = scans.filter(s => s.status === 'Suspicious').length
    const safe       = scans.filter(s => s.status === 'Safe').length

    // Count indicator frequency
    const indFreq = { urgency: 0, credential_request: 0, impersonation: 0, financial_scam: 0, suspicious_links: 0 }
    scans.forEach(s => {
      const ind = s.indicators || {}
      if (ind.urgency)            indFreq.urgency++
      if (ind.credential_request) indFreq.credential_request++
      if (ind.impersonation)      indFreq.impersonation++
      if (ind.financial_scam)     indFreq.financial_scam++
      if (ind.suspicious_links?.length) indFreq.suspicious_links++
    })

    const topInd = Object.entries(indFreq).sort((a, b) => b[1] - a[1])[0]
    const indLabels = {
      urgency: 'Urgency', credential_request: 'Credential Harvesting',
      impersonation: 'Impersonation', financial_scam: 'Financial Scam',
      suspicious_links: 'Suspicious Links',
    }

    return {
      phishing, suspicious, safe,
      topIndicator: topInd && topInd[1] > 0 ? `${indLabels[topInd[0]]}` : '—',
      topIndicatorCount: topInd ? topInd[1] : 0,
    }
  }, [scans])

  if (!stats) return null

  return (
    <div className="glimpse-grid">
      <div className="glimpse-card gc-red">
        <div className="glimpse-val">{stats.phishing}</div>
        <div className="glimpse-label">Phishing Messages</div>
        <div className="glimpse-icon">🚨</div>
      </div>
      <div className="glimpse-card gc-orange">
        <div className="glimpse-val">{stats.suspicious}</div>
        <div className="glimpse-label">Suspicious Messages</div>
        <div className="glimpse-icon">⚠️</div>
      </div>
      <div className="glimpse-card gc-yellow">
        <div className="glimpse-val">{stats.safe}</div>
        <div className="glimpse-label">Safe Messages</div>
        <div className="glimpse-icon">✅</div>
      </div>
      <div className="glimpse-card gc-blue">
        <div className="glimpse-val">{stats.topIndicator}</div>
        <div className="glimpse-label">
          Top Indicator{stats.topIndicatorCount > 0 ? ` (${stats.topIndicatorCount}×)` : ''}
        </div>
        <div className="glimpse-icon">🎯</div>
      </div>
    </div>
  )
}

// ── Deepfake Glimpse — summary stats for deepfake scans ──────────────────────
function DeepfakeGlimpse({ scans }) {
  const stats = useMemo(() => {
    if (!scans.length) return null

    const deepfakes = scans.filter(s => s.verdict === 'Deepfake').length
    const uncertain = scans.filter(s => s.verdict === 'Uncertain').length
    const real      = scans.filter(s => s.verdict === 'Real').length

    const videoScans = scans.filter(s => s.file_type === 'video').length
    const audioScans = scans.filter(s => s.file_type === 'audio').length

    const avgScore = scans.length
      ? (scans.reduce((sum, s) => sum + (s.risk_pct ?? Math.round(s.final_score * 100)), 0) / scans.length).toFixed(1)
      : 0

    return { deepfakes, uncertain, real, videoScans, audioScans, avgScore }
  }, [scans])

  if (!stats) return null

  return (
    <div className="glimpse-grid">
      <div className="glimpse-card gc-red">
        <div className="glimpse-val">{stats.deepfakes}</div>
        <div className="glimpse-label">Deepfakes Detected</div>
        <div className="glimpse-icon">🚨</div>
      </div>
      <div className="glimpse-card gc-yellow">
        <div className="glimpse-val">{stats.uncertain}</div>
        <div className="glimpse-label">Uncertain Results</div>
        <div className="glimpse-icon">⚠️</div>
      </div>
      <div className="glimpse-card gc-orange">
        <div className="glimpse-val">{stats.avgScore}%</div>
        <div className="glimpse-label">Avg. Risk Score</div>
        <div className="glimpse-icon">📊</div>
      </div>
      <div className="glimpse-card gc-blue">
        <div className="glimpse-val">{stats.videoScans}V / {stats.audioScans}A</div>
        <div className="glimpse-label">Video / Audio Scans</div>
        <div className="glimpse-icon">🎬</div>
      </div>
    </div>
  )
}

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
  const [activeTab,   setActiveTab]   = useState('url')
  const [history,     setHistory]     = useState(DEMO_SCANS)
  const [msgHistory,  setMsgHistory]  = useState([])
  const [dfHistory,   setDfHistory]   = useState(DEMO_DF_SCANS)
  const [selected,    setSelected]    = useState(null)
  const [msgSelected, setMsgSelected] = useState(null)
  const [dfSelected,  setDfSelected]  = useState(null)
  const [modelOk,     setModelOk]     = useState(true)
  const [loadingHist, setLoadingHist] = useState(false)
  const [loadingMsg,  setLoadingMsg]  = useState(true)
  const [loadingDf,   setLoadingDf]   = useState(false)
  const [theme,       setTheme]       = useState(() => localStorage.getItem('kavach-theme') || 'dark')

  // Apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kavach-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  // Fetch health + persisted scan history on mount
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.ok ? setModelOk(true) : setModelOk(false))
      .catch(() => setModelOk(false))

    fetch(`${API_URL}/history`)
      .then(r => r.json())
      .then(data => {
        const real = Array.isArray(data) ? data : []
        setHistory(real.length > 0 ? [...real, ...DEMO_SCANS] : DEMO_SCANS)
        setLoadingHist(false)
      })
      .catch(() => setLoadingHist(false))

    fetch(`${API_URL}/message-history`)
      .then(r => r.json())
      .then(data => { setMsgHistory(Array.isArray(data) ? data : []); setLoadingMsg(false) })
      .catch(() => setLoadingMsg(false))

    fetch(`${API_URL}/deepfake-history`)
      .then(r => r.json())
      .then(data => {
        const real = Array.isArray(data) ? data : []
        setDfHistory(real.length > 0 ? [...real, ...DEMO_DF_SCANS] : DEMO_DF_SCANS)
        setLoadingDf(false)
      })
      .catch(() => setLoadingDf(false))
  }, [])

  const addScan    = (scan) => setHistory(prev => [scan, ...prev])
  const addMsgScan = (scan) => setMsgHistory(prev => [scan, ...prev])
  const addDfScan  = (scan) => setDfHistory(prev => [scan, ...prev])

  const clearHistory = async () => {
    await fetch(`${API_URL}/history`, { method: 'DELETE' }).catch(() => {})
    setHistory(DEMO_SCANS)
  }

  const clearMsgHistory = async () => {
    await fetch(`${API_URL}/message-history`, { method: 'DELETE' }).catch(() => {})
    setMsgHistory([])
  }

  const clearDfHistory = async () => {
    await fetch(`${API_URL}/deepfake-history`, { method: 'DELETE' }).catch(() => {})
    setDfHistory(DEMO_DF_SCANS)
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
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className={`status-pill ${modelOk ? 'pill-ok' : 'pill-err'}`}>
              <span className="pulse-dot" />
              <span>{modelOk ? 'Model Online' : 'Model Offline'}</span>
            </div>
            <button
              className="clear-history-btn"
              onClick={activeTab === 'url' ? clearHistory : activeTab === 'message' ? clearMsgHistory : clearDfHistory}
              disabled={activeTab === 'url' ? history.length === 0 : activeTab === 'message' ? msgHistory.length === 0 : dfHistory.length === 0}
              title="Clear scan history"
            >
              ↺ Clear
            </button>
          </div>
        </header>

        {/* ── Tab Navigation ── */}
        <div className="dash-tab-bar">
          <button
            className={`dash-tab ${activeTab === 'url' ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            🔗 URL Analysis
          </button>
          <button
            className={`dash-tab ${activeTab === 'message' ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab('message')}
          >
            💬 Message Analysis
          </button>
          <button
            className={`dash-tab ${activeTab === 'deepfake' ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab('deepfake')}
          >
            🎬 Deepfake Detective
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            URL ANALYSIS TAB
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'url' && (
          <>
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

            {/* ── Security Glimpse ── */}
            {!loadingHist && history.length > 0 && (
              <section id="glimpse" className="dash-section">
                <SectionHead icon="🛡" title="Top Security Risks Detected" sub="Aggregated threat intelligence from all scanned URLs" />
                <SecurityGlimpse scans={history} />
              </section>
            )}

            {/* ── Charts ── */}
            <section id="charts" className="dash-section">
              <SectionHead icon="📈" title="Risk Analytics" sub="Trend analysis and distribution of threat classifications" />
              {loadingHist
                ? <div className="data-loading"><span className="spinner" /> Loading history…</div>
                : (
                <div className="charts-row">
                  <div className="chart-col-wide"><TrendChart scans={history} theme={theme} /></div>
                  <div className="chart-col-narrow"><DistributionChart scans={history} theme={theme} /></div>
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
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            MESSAGE ANALYSIS TAB
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'message' && (
          <>
            {/* ── Message Scanner ── */}
            <section id="msg-scanner" className="dash-section">
              <MessageScanner onResult={addMsgScan} />
            </section>

            {/* ── Message Stats Glimpse ── */}
            {!loadingMsg && msgHistory.length > 0 && (
              <section id="msg-glimpse" className="dash-section">
                <SectionHead icon="🛡" title="Message Threat Overview" sub="Aggregated statistics from all analyzed messages" />
                <MessageGlimpse scans={msgHistory} />
              </section>
            )}

            {/* ── Message Scan History ── */}
            <section id="msg-log" className="dash-section">
              <MessageActivityLog scans={msgHistory} onSelect={setMsgSelected} loading={loadingMsg} />
            </section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            DEEPFAKE DETECTIVE TAB
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'deepfake' && (
          <>
            {/* ── Deepfake Scanner ── */}
            <section id="df-scanner" className="dash-section">
              <DeepfakeScanner onResult={addDfScan} />
            </section>

            {/* ── KPI Cards ── */}
            <section id="df-metrics" className="dash-section">
              <SectionHead icon="📊" title="Overview" sub="Real-time deepfake detection statistics across all analyzed media" />
              {loadingDf
                ? <div className="data-loading"><span className="spinner" /> Loading history…</div>
                : <DfMetricCards scans={dfHistory} />}
            </section>

            {/* ── Deepfake Glimpse ── */}
            {!loadingDf && dfHistory.length > 0 && (
              <section id="df-glimpse" className="dash-section">
                <SectionHead icon="🎭" title="Deepfake Threat Overview" sub="Aggregated statistics from all analyzed media files" />
                <DeepfakeGlimpse scans={dfHistory} />
              </section>
            )}

            {/* ── Media Scan Log ── */}
            <section id="df-log" className="dash-section">
              <DeepfakeActivityLog scans={dfHistory} onSelect={setDfSelected} loading={loadingDf} />
            </section>
          </>
        )}

        <div className="dashboard-footer">
          KavachX · AI-Powered Threat Detection · URL Analysis + Message Analysis + Deepfake Detective · DistilBERT + Random Forest + DeepfakeDetector
        </div>
      </div>

      {/* ── URL Scan detail modal ── */}
      {selected && (
        <ScanModal scan={selected} onClose={() => setSelected(null)} theme={theme} />
      )}

      {/* ── Message detail modal ── */}
      {msgSelected && (
        <MessageDetailModal scan={msgSelected} onClose={() => setMsgSelected(null)} theme={theme} />
      )}

      {/* ── Deepfake detail modal ── */}
      {dfSelected && (
        <DeepfakeDetailModal scan={dfSelected} onClose={() => setDfSelected(null)} theme={theme} />
      )}
    </div>
  )
}
