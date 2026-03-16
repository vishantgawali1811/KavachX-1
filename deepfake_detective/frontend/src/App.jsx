import { useState, useEffect, useMemo } from 'react'

import MetricCards        from './components/MetricCards.jsx'
import TrendChart         from './components/TrendChart.jsx'
import DistributionChart  from './components/DistributionChart.jsx'
import ActivityLog        from './components/ActivityLog.jsx'
import ScanModal          from './components/ScanModal.jsx'
import MediaScanner       from './components/MediaScanner.jsx'

const API_URL = 'http://localhost:5002'

// ── Detection Glimpse — aggregated threat stats ──────────────────────────────
function DetectionGlimpse({ scans }) {
  const stats = useMemo(() => {
    if (!scans.length) return null

    const deepfakes  = scans.filter(s => s.verdict === 'Deepfake').length
    const uncertain  = scans.filter(s => s.verdict === 'Uncertain').length
    const real       = scans.filter(s => s.verdict === 'Real').length
    const videoScans = scans.filter(s => s.file_type === 'video').length
    const audioScans = scans.filter(s => s.file_type === 'audio').length

    // Find most common anomaly
    const anomalyFreq = {}
    scans.forEach(s => {
      const anomalies = s.audio_analysis?.anomalies || {}
      Object.entries(anomalies).forEach(([key, info]) => {
        if (info.detected) anomalyFreq[key] = (anomalyFreq[key] ?? 0) + 1
      })
    })
    const topAnomaly = Object.entries(anomalyFreq).sort((a, b) => b[1] - a[1])[0]
    const anomalyLabels = {
      pitch_stability: 'Pitch Stability',
      breath_patterns: 'Breath Patterns',
      spectral_flatness: 'Spectral Flatness',
      frequency_cutoff: 'Frequency Cutoff',
    }

    return {
      deepfakes, uncertain, real, videoScans, audioScans,
      topAnomaly: topAnomaly ? anomalyLabels[topAnomaly[0]] || topAnomaly[0] : '—',
      topAnomalyCount: topAnomaly ? topAnomaly[1] : 0,
    }
  }, [scans])

  if (!stats) return null

  return (
    <div className="glimpse-grid">
      <div className="glimpse-card gc-red">
        <div className="glimpse-val">{stats.deepfakes}</div>
        <div className="glimpse-label">Deepfakes Detected</div>
        <div className="glimpse-icon">&#128680;</div>
      </div>
      <div className="glimpse-card gc-orange">
        <div className="glimpse-val">{stats.uncertain}</div>
        <div className="glimpse-label">Uncertain Scans</div>
        <div className="glimpse-icon">&#9888;&#65039;</div>
      </div>
      <div className="glimpse-card gc-green">
        <div className="glimpse-val">{stats.real}</div>
        <div className="glimpse-label">Authentic Media</div>
        <div className="glimpse-icon">&#9989;</div>
      </div>
      <div className="glimpse-card gc-blue">
        <div className="glimpse-val">{stats.topAnomaly}</div>
        <div className="glimpse-label">
          Top Audio Anomaly{stats.topAnomalyCount > 0 ? ` (${stats.topAnomalyCount}\u00d7)` : ''}
        </div>
        <div className="glimpse-icon">&#127925;</div>
      </div>
    </div>
  )
}

// ── Section heading ──────────────────────────────────────────────────────────
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

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [history,     setHistory]     = useState([])
  const [selected,    setSelected]    = useState(null)
  const [modelOk,     setModelOk]     = useState(true)
  const [loadingHist, setLoadingHist] = useState(true)

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
            <span className="topbar-logo">&#128373;</span>
            <div>
              <div className="topbar-name">Deepfake Detective</div>
              <div className="topbar-tagline">AI Media Forensics Platform</div>
            </div>
          </div>

          <div className="topbar-center">
            <span className="topbar-title">Media Forensics Dashboard</span>
            <span className="topbar-date">{new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</span>
          </div>

          <div className="topbar-right">
            <div className={`status-pill ${modelOk ? 'pill-ok' : 'pill-err'}`}>
              <span className="pulse-dot" />
              <span>{modelOk ? 'Models Online' : 'Models Offline'}</span>
            </div>
            <button
              className="clear-history-btn"
              onClick={clearHistory}
              disabled={history.length === 0}
              title="Clear scan history"
            >
              &#8634; Clear
            </button>
          </div>
        </header>

        {/* ── Scanner ── */}
        <section id="scanner" className="dash-section">
          <MediaScanner onResult={addScan} />
        </section>

        {/* ── KPI Cards ── */}
        <section id="metrics" className="dash-section">
          <SectionHead icon="&#128202;" title="Overview" sub="Real-time detection statistics across all scanned media" />
          {loadingHist
            ? <div className="data-loading"><span className="spinner" /> Loading history...</div>
            : <MetricCards scans={history} />}
        </section>

        {/* ── Detection Glimpse ── */}
        {!loadingHist && history.length > 0 && (
          <section id="glimpse" className="dash-section">
            <SectionHead icon="&#128737;" title="Detection Intelligence" sub="Aggregated forensic analysis from all scanned media" />
            <DetectionGlimpse scans={history} />
          </section>
        )}

        {/* ── Charts ── */}
        <section id="charts" className="dash-section">
          <SectionHead icon="&#128200;" title="Risk Analytics" sub="Trend analysis and distribution of detection outcomes" />
          {loadingHist
            ? <div className="data-loading"><span className="spinner" /> Loading history...</div>
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

        <div className="dashboard-footer">
          Deepfake Detective &middot; AI-Powered Media Forensics &middot; MesoInception4 + Audio CNN + Grad-CAM + MC Dropout
        </div>
      </div>

      {/* ── Detail modal ── */}
      {selected && (
        <ScanModal scan={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
