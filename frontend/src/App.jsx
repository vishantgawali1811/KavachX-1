import { useState } from 'react'
import StatChart from './StatChart.jsx'

const API_URL = 'http://localhost:5001'

function ResultBadge({ result }) {
  const isPhishing = result === 'Phishing'
  return (
    <span className={`badge ${isPhishing ? 'badge-phishing' : 'badge-legitimate'}`}>
      {isPhishing ? '🚨 Phishing' : '✅ Legitimate'}
    </span>
  )
}

function RiskMeter({ score }) {
  const pct = Math.min(100, Math.max(0, score))
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low'
  const label = pct >= 70 ? 'High Risk' : pct >= 40 ? 'Moderate Risk' : 'Low Risk'
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981'

  // Arc parameters
  const r = 60, cx = 90, cy = 80
  const startAngle = -180, totalAngle = 180
  const toRad = d => (d * Math.PI) / 180
  const arcX = (a) => cx + r * Math.cos(toRad(a))
  const arcY = (a) => cy + r * Math.sin(toRad(a))
  const endAngle = startAngle + (totalAngle * pct) / 100
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  const trackPath = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 1 1 ${arcX(startAngle + totalAngle - 0.01)} ${arcY(startAngle + totalAngle - 0.01)}`
  const fillPath = pct > 0
    ? `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endAngle)} ${arcY(endAngle)}`
    : ''

  return (
    <div className="risk-meter">
      <div className="risk-meter-inner">
        <svg viewBox="0 0 180 90" className="risk-arc">
          <defs>
            <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={pct >= 70 ? '#7f1d1d' : pct >= 40 ? '#78350f' : '#064e3b'} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <path d={trackPath} fill="none" stroke="#1a2540" strokeWidth="10" strokeLinecap="round" />
          {fillPath && (
            <path d={fillPath} fill="none" stroke="url(#riskGrad)" strokeWidth="10" strokeLinecap="round" />
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="Inter, sans-serif">
            {pct}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">
            PHISHING RISK
          </text>
        </svg>

        <div className="risk-scale">
          <span className="scale-low">Low</span>
          <span className="scale-mid">Medium</span>
          <span className="scale-high">High</span>
        </div>

        <span className={`risk-label-chip risk-${level}`}>{label}</span>
      </div>
    </div>
  )
}

function FeatureBreakdown({ breakdown, riskScore }) {
  const maxImportance = Math.max(...breakdown.map(f => f.importance))
  const structuralFeatures = breakdown.filter(f => f.type === 'structural')
  const statisticalFeatures = breakdown.filter(f => f.type === 'statistical')
  const triggeredCount = structuralFeatures.filter(f => f.value === 1).length

  return (
    <div className="breakdown">

      {/* ── Structural ── */}
      <div className="breakdown-section">
        <div className="section-header">
          <div className="section-header-left">
            <span className="section-icon">🔒</span>
            <div>
              <div className="section-title">Structural Features</div>
              <div className="section-hint">Binary flags — detected from URL structure</div>
            </div>
          </div>
          <div className={`struct-summary ${triggeredCount > 0 ? 'summary-warn' : 'summary-ok'}`}>
            <span className="summary-num">{triggeredCount}</span>
            <span className="summary-label">/ {structuralFeatures.length} flagged</span>
          </div>
        </div>

        <table className="feat-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Status</th>
              <th>Model Importance</th>
            </tr>
          </thead>
          <tbody>
            {structuralFeatures.map(f => {
              const triggered = f.value === 1
              const pct = ((f.importance / maxImportance) * 100).toFixed(0)
              return (
                <tr key={f.key} className={triggered ? 'row-flagged' : ''}>
                  <td className="feat-name">{f.label}</td>
                  <td>
                    <span className={`status-chip ${triggered ? 'chip-danger' : 'chip-safe'}`}>
                      {triggered ? '⚠ Detected' : '✓ Clear'}
                    </span>
                  </td>
                  <td>
                    <div className="imp-cell">
                      <div className="imp-track">
                        <div
                          className={`imp-fill ${triggered ? 'imp-fill-danger' : 'imp-fill-normal'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="imp-pct">{(f.importance * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Statistical ── */}
      <div className="breakdown-section">
        <div className="section-header">
          <div className="section-header-left">
            <span className="section-icon">📊</span>
            <div>
              <div className="section-title">Statistical Features</div>
              <div className="section-hint">Numeric values extracted from the URL</div>
            </div>
          </div>
        </div>
        <StatChart features={statisticalFeatures} />
      </div>

      {/* ── Risk Score ── */}
      <div className="breakdown-footer">
        <div className="risk-footer-row">
          <div className="risk-footer-left">
            <div className="risk-footer-title">Overall Phishing Risk Score</div>
            <div className="risk-footer-sub">Confidence from Random Forest model · based on {breakdown.length} features</div>
          </div>
        </div>
        <RiskMeter score={riskScore} />
        <div className="imp-note">Importance % = feature's relative weight in the model decision</div>
      </div>
    </div>
  )
}

function ResultItem({ item }) {
  const [open, setOpen] = useState(false)
  const isPhishing = item.result === 'Phishing'

  return (
    <li className={`result-item ${isPhishing ? 'item-phishing' : 'item-legitimate'}`}>
      <div className="result-top">
        <span className="result-url">{item.url}</span>
        <div className="result-actions">
          <ResultBadge result={item.result} />
          <button className="details-btn" onClick={() => setOpen(o => !o)}>
            {open ? 'Hide Details ▲' : 'Show Details ▼'}
          </button>
        </div>
      </div>
      {open && item.breakdown && <FeatureBreakdown breakdown={item.breakdown} riskScore={item.risk_score} />}
    </li>
  )
}

export default function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = url.trim()
    if (!trimmed) { setError('Please enter a URL.'); return }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError("URL must start with 'http://' or 'https://'"); return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Server error')
      } else {
        setHistory(prev => [{ ...data, id: Date.now() }, ...prev])
        setUrl('')
      }
    } catch {
      setError('Could not connect to the backend. Make sure api.py is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header>
        <div className="header-badge">🤖 Random Forest Classifier</div>
        <h1>🔍 URL Phishing Classifier</h1>
        <p className="subtitle">Paste any URL to instantly detect whether it's legitimate or a phishing attempt.</p>
      </header>

      <div className="search-card">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="url-input"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Checking...' : 'Classify URL'}
          </button>
        </form>
        {error && <div className="error-box">⚠️ {error}</div>}
      </div>

      {history.length > 0 && (
        <section className="history">
          <div className="history-header">
            <h2>Results</h2>
            <button className="clear-btn" onClick={() => setHistory([])}>Clear</button>
          </div>
          <ul className="result-list">
            {history.map(item => <ResultItem key={item.id} item={item} />)}
          </ul>
        </section>
      )}
    </div>
  )
}
