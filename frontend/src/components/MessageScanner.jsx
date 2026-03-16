/**
 * MessageScanner.jsx
 * ------------------
 * Paste-and-analyze card for phishing message detection.
 * Mirrors the existing Scanner component but for text messages/emails.
 */
import { useState } from 'react'

const API_URL = 'http://localhost:5001'

export default function MessageScanner({ onResult }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    const trimmed = message.trim()
    if (!trimmed) { setError('Please paste a message to analyze.'); return }
    if (trimmed.length < 5) { setError('Message too short for analysis.'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/analyze-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Server error'); return }
      setResult(data)
      onResult(data)
    } catch {
      setError('Could not connect to backend. Is Flask running on port 5001?')
    } finally {
      setLoading(false)
    }
  }

  const pct   = result ? (result.risk_pct ?? Math.round(result.risk_score * 100)) : 0
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981'

  return (
    <div className="scanner-card">
      <div className="scanner-head">
        <div>
          <div className="scanner-title">Analyze a Message</div>
          <div className="scanner-sub">
            Paste any suspicious email, SMS, or chat message — AI will detect phishing
          </div>
        </div>
        <span className="scanner-badge">&#129504; DistilBERT</span>
      </div>

      <form className="msg-scanner-form" onSubmit={handleSubmit}>
        <textarea
          className="msg-textarea"
          placeholder="Paste suspicious message here...&#10;&#10;Example: Your account has been suspended. Verify immediately at http://secure-login.tk/verify"
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={loading}
          rows={5}
        />
        <button type="submit" className="scanner-btn msg-scanner-btn" disabled={loading}>
          {loading ? <><span className="spinner" /> Analyzing...</> : 'Analyze Message \u2192'}
        </button>
      </form>

      {error && <div className="scanner-error">{error}</div>}

      {/* Inline result card */}
      {result && (
        <div className="msg-result">
          {/* Score + verdict row */}
          <div className="msg-result-header">
            <div className="msg-score-circle" style={{ borderColor: color }}>
              <span className="msg-score-pct" style={{ color }}>{pct}%</span>
            </div>
            <div className="msg-verdict-block">
              <div className="msg-verdict-label" style={{ color }}>
                {pct >= 70 ? '\uD83D\uDEA8 Phishing Detected' : pct >= 40 ? '\u26A0\uFE0F Suspicious' : '\u2705 Safe'}
              </div>
              <div className="msg-verdict-sub">
                {result.nlp_model_used ? 'DistilBERT + Heuristic Analysis' : 'Heuristic Analysis'}
              </div>
            </div>
          </div>

          {/* Indicator badges */}
          {result.indicators && (
            <div className="msg-indicator-row">
              {result.indicators.urgency && <span className="msg-ind-chip ind-red">Urgency</span>}
              {result.indicators.credential_request && <span className="msg-ind-chip ind-red">Credential Harvesting</span>}
              {result.indicators.impersonation && <span className="msg-ind-chip ind-orange">Impersonation</span>}
              {result.indicators.financial_scam && <span className="msg-ind-chip ind-orange">Financial Scam</span>}
              {result.indicators.ai_generated && <span className="msg-ind-chip ind-blue">AI-Generated</span>}
              {result.indicators.suspicious_links?.length > 0 && <span className="msg-ind-chip ind-red">Suspicious Links</span>}
            </div>
          )}

          {/* Reasons */}
          {result.reasons?.length > 0 && result.reasons[0] !== 'No strong phishing indicators detected' && (
            <div className="msg-reasons-block">
              <div className="msg-reasons-title">THREAT SIGNALS</div>
              {result.reasons.map((r, i) => (
                <div key={i} className="msg-reason-item">{r}</div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div className={`msg-rec-block msg-rec-${result.recommendation.severity}`}>
              <div className="msg-rec-title">Recommended Action</div>
              <div className="msg-rec-action">{result.recommendation.action}</div>
              <ul className="msg-rec-steps">
                {result.recommendation.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
