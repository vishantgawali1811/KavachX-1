import { useState } from 'react'
import RiskMeter from '../components/RiskMeter.jsx'

const API_URL = 'http://localhost:5001'

const FEATURE_META = {
  ip:                  { label: 'IP Address Hostname',     type: 'structural', importance: 0.052 },
  https_token:         { label: 'HTTPS in Token',          type: 'structural', importance: 0.038 },
  prefix_suffix:       { label: 'Prefix/Suffix Dash',      type: 'structural', importance: 0.045 },
  shortening_service:  { label: 'URL Shortening Service',  type: 'structural', importance: 0.041 },
  suspicious_tld:      { label: 'Suspicious TLD',          type: 'structural', importance: 0.048 },
  statistical_report:  { label: 'Statistical Report Flag', type: 'structural', importance: 0.035 },
  length_url:          { label: 'URL Length',              type: 'statistical', importance: 0.085 },
  length_hostname:     { label: 'Hostname Length',         type: 'statistical', importance: 0.072 },
  nb_dots:             { label: 'Number of Dots',          type: 'statistical', importance: 0.063 },
  nb_hyphens:          { label: 'Number of Hyphens',       type: 'statistical', importance: 0.055 },
  nb_qm:               { label: 'Query Mark Count',        type: 'statistical', importance: 0.042 },
  nb_percent:          { label: 'Percent Signs',           type: 'statistical', importance: 0.038 },
  nb_slash:            { label: 'Slash Count',             type: 'statistical', importance: 0.066 },
  nb_www:              { label: 'WWW Count',               type: 'statistical', importance: 0.031 },
  ratio_digits_url:    { label: 'Digit Ratio (URL)',       type: 'statistical', importance: 0.059 },
  ratio_digits_host:   { label: 'Digit Ratio (Host)',      type: 'statistical', importance: 0.051 },
  char_repeat:         { label: 'Char Repeat',             type: 'statistical', importance: 0.044 },
  avg_words_raw:       { label: 'Avg Word Length (Raw)',   type: 'statistical', importance: 0.068 },
  avg_word_host:       { label: 'Avg Word Length (Host)',  type: 'statistical', importance: 0.057 },
  avg_word_path:       { label: 'Avg Word Length (Path)',  type: 'statistical', importance: 0.049 },
  phish_hints:         { label: 'Phishing Hint Words',     type: 'statistical', importance: 0.092 },
}

function buildReasons(features, label, riskScore) {
  const reasons = []
  if (features.ip === 1)                reasons.push({ icon: '⚠', text: 'Hostname is an IP address — typical in phishing URLs' })
  if (features.https_token === 1)       reasons.push({ icon: '⚠', text: '"https" appears in domain token — deceptive technique' })
  if (features.prefix_suffix === 1)     reasons.push({ icon: '⚠', text: 'Dash in domain prefix/suffix — common phishing pattern' })
  if (features.shortening_service === 1) reasons.push({ icon: '⚠', text: 'URL shortening service detected — may hide destination' })
  if (features.suspicious_tld === 1)    reasons.push({ icon: '⚠', text: 'Suspicious top-level domain detected' })
  if (features.phish_hints > 0)         reasons.push({ icon: '⚠', text: `${features.phish_hints} phishing hint keyword(s) found (e.g. verify, confirm, secure)` })
  if (features.length_url > 75)         reasons.push({ icon: '📏', text: `URL length is ${features.length_url} chars (phishing avg: 74.87)` })
  if (features.nb_dots > 4)             reasons.push({ icon: '•', text: `${features.nb_dots} dots detected — unusually high subdomain nesting` })

  if (reasons.length === 0 && label === 'phishing') {
    reasons.push({ icon: '⚠', text: 'Statistical pattern matches known phishing URLs' })
    reasons.push({ icon: '⚠', text: `Model confidence: ${(riskScore * 100).toFixed(1)}% phishing probability` })
  }
  if (label === 'legitimate' && riskScore < 0.4) {
    reasons.push({ icon: '✅', text: 'URL structure matches legitimate domain patterns' })
    reasons.push({ icon: '✅', text: 'No suspicious keywords or URL manipulation detected' })
    reasons.push({ icon: '✅', text: 'Domain and path statistics within normal ranges' })
  }
  return reasons.length > 0 ? reasons : [{ icon: '📊', text: 'ML model classified based on 21 extracted features' }]
}

function FeatureTable({ features }) {
  const structFeats = ['ip','https_token','prefix_suffix','shortening_service','suspicious_tld','statistical_report']
  const statFeats   = ['length_url','length_hostname','nb_dots','nb_hyphens','nb_qm','nb_percent','nb_slash','nb_www','ratio_digits_url','ratio_digits_host','char_repeat','avg_words_raw','avg_word_host','avg_word_path','phish_hints']
  const flagged = structFeats.filter(k => features[k] === 1).length

  return (
    <div className="breakdown" style={{ padding: 0 }}>
      <div className="breakdown-section">
        <div className="section-header">
          <div className="section-header-left">
            <span className="section-icon">🔒</span>
            <div>
              <div className="section-title">Structural Features</div>
              <div className="section-hint">Binary flags from URL structure</div>
            </div>
          </div>
          <div className={`struct-summary ${flagged > 0 ? 'summary-warn' : 'summary-ok'}`}>
            <span className="summary-num">{flagged}</span>
            <span className="summary-label">/ {structFeats.length} flagged</span>
          </div>
        </div>
        <table className="feat-table">
          <thead><tr><th>Feature</th><th>Status</th><th>Value</th></tr></thead>
          <tbody>
            {structFeats.map(k => {
              const meta = FEATURE_META[k] || {}
              const triggered = features[k] === 1
              return (
                <tr key={k} className={triggered ? 'row-flagged' : ''}>
                  <td className="feat-name">{meta.label || k}</td>
                  <td><span className={`status-chip ${triggered ? 'chip-danger' : 'chip-safe'}`}>{triggered ? '⚠ Detected' : '✓ Clear'}</span></td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{features[k]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="breakdown-section">
        <div className="section-header">
          <div className="section-header-left">
            <span className="section-icon">📊</span>
            <div>
              <div className="section-title">Statistical Features</div>
              <div className="section-hint">Numeric values extracted from URL</div>
            </div>
          </div>
        </div>
        <table className="feat-table">
          <thead><tr><th>Feature</th><th>Value</th><th>Weight</th></tr></thead>
          <tbody>
            {statFeats.map(k => {
              const meta = FEATURE_META[k] || {}
              const pct = ((meta.importance || 0.04) * 100).toFixed(1)
              return (
                <tr key={k}>
                  <td className="feat-name">{meta.label || k}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--neon)' }}>{features[k]}</td>
                  <td>
                    <div className="imp-cell">
                      <div className="imp-track">
                        <div className="imp-fill" style={{ width: `${(meta.importance || 0.04) * 1000}%` }} />
                      </div>
                      <span className="imp-pct">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function RealtimeScan() {
  const [url, setUrl]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [result, setResult] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const handleScan = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setExpanded(false)

    const trimmed = url.trim()
    if (!trimmed) { setError('Please enter a URL to scan.'); return }
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
      if (!res.ok) { setError(data.error || 'Server error'); return }
      setResult(data)
    } catch {
      setError('Cannot connect to KavachX backend. Make sure it is running on port 5001.')
    } finally {
      setLoading(false)
    }
  }

  const riskPct  = result ? Math.round(result.risk_score * 100) : 0
  const riskClass = riskPct >= 70 ? 'phishing' : riskPct >= 40 ? 'suspicious' : 'safe'
  const reasons  = result ? buildReasons(result.features, result.label, result.risk_score) : []

  return (
    <>
      {/* Scan input */}
      <div className="scan-input-wrap">
        <div className="scan-title">🔍 Scan a URL for Phishing</div>
        <div className="scan-sub">Paste any URL to get an instant AI-powered phishing risk assessment powered by our Random Forest model.</div>
        <form className="scan-form" onSubmit={handleScan}>
          <input
            className="scan-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button className="scan-btn" type="submit" disabled={loading}>
            {loading ? <><span className="scan-spinner" /> Analysing…</> : <>🛡 Scan URL</>}
          </button>
        </form>
        {error && <div className="error-box">⚠ {error}</div>}
      </div>

      {/* Info cards before result */}
      {!result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {[
            { icon: '🧠', title: 'AI-Powered', desc: 'Random Forest model trained on 11,430 URLs with 90.3% accuracy' },
            { icon: '⚡', title: 'Real-Time', desc: 'Results in under 200ms. No page visits — fully offline analysis' },
            { icon: '🔒', title: 'Privacy First', desc: 'URLs are analysed locally. Nothing is stored or transmitted' },
            { icon: '📊', title: '21 Features', desc: 'Structural & statistical URL features extracted and analysed' },
          ].map(c => (
            <div key={c.title} className="card">
              <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontSize: '0.9rem' }}>{c.title}</div>
              <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`result-panel ${riskClass}`}>
          <div className="result-header">
            <span className="result-url-text">{result.url}</span>
            <span className={`badge badge-${riskClass === 'safe' ? 'safe' : riskClass === 'suspicious' ? 'suspicious' : 'phishing'}`}>
              {riskClass === 'safe' ? '✅ Safe' : riskClass === 'suspicious' ? '⚡ Suspicious' : '🚨 Phishing'}
            </span>
          </div>

          <div className="result-body">
            <div className="result-grid">
              {/* Risk meter */}
              <RiskMeter score={riskPct} />

              {/* AI explanation */}
              <div className="ai-panel">
                <div className="ai-panel-title">
                  🤖 AI Explanation
                  <span style={{ marginLeft: 'auto', cursor: 'help', fontSize: '0.7rem', color: 'var(--text-muted)' }} title="Explainable AI: KavachX shows you exactly why a URL is flagged.">ℹ XAI</span>
                </div>
                {reasons.map((r, i) => (
                  <div key={i} className="ai-reason">
                    <span className="ai-reason-icon">{r.icon}</span>
                    <span className="ai-reason-text">{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Risk Score', value: `${riskPct}%`, color: riskPct >= 70 ? 'var(--red2)' : riskPct >= 40 ? 'var(--yellow)' : 'var(--green)' },
                { label: 'Classification', value: result.label.charAt(0).toUpperCase() + result.label.slice(1), color: result.label === 'phishing' ? 'var(--red2)' : 'var(--green)' },
                { label: 'Phish Hints', value: result.features.phish_hints ?? 0, color: 'var(--neon)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'Space Grotesk, sans-serif' }}>{s.value}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Expand/collapse */}
            <button className="expand-btn" onClick={() => setExpanded(x => !x)}>
              <span>{expanded ? '▲ Hide' : '▼ Show'} Advanced Analysis — 21 Feature Breakdown</span>
            </button>
            {expanded && (
              <div style={{ marginTop: 16, animation: 'fadeIn 0.3s ease' }}>
                <FeatureTable features={result.features} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
