/**
 * MessageDetailModal.jsx
 * ----------------------
 * Slide-over detail panel for phishing message analysis results.
 * Mirrors ScanModal.jsx but for message scans.
 */
import { useEffect } from 'react'

function ArcGauge({ pct, theme }) {
  const isLight = theme === 'light'
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981'
  const r = 52, cx = 70, cy = 65
  const toRad = d => (d * Math.PI) / 180
  const startA = -180, totalA = 180
  const arcX = a => cx + r * Math.cos(toRad(a))
  const arcY = a => cy + r * Math.sin(toRad(a))
  const endA = startA + (totalA * pct) / 100
  const largeArc = endA - startA > 180 ? 1 : 0

  const track = `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 1 1 ${arcX(startA + totalA - 0.01)} ${arcY(startA + totalA - 0.01)}`
  const fill = pct > 0 ? `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endA)} ${arcY(endA)}` : ''
  const level = pct >= 70 ? 'High Risk' : pct >= 40 ? 'Moderate Risk' : 'Low Risk'
  const trackColor = isLight ? '#cbd5e1' : '#1a2540'
  const labelColor = isLight ? '#64748b' : '#475569'

  return (
    <div className="arc-gauge-wrap">
      <svg viewBox="0 0 140 75" className="arc-svg">
        <defs>
          <linearGradient id="msgGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pct >= 70 ? '#7f1d1d' : pct >= 40 ? '#78350f' : '#064e3b'} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke={trackColor} strokeWidth="8" strokeLinecap="round" />
        {fill && <path d={fill} fill="none" stroke="url(#msgGaugeGrad)" strokeWidth="8" strokeLinecap="round" />}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="Inter, sans-serif">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={labelColor} fontSize="7" fontFamily="Inter, sans-serif">PHISHING RISK</text>
      </svg>
      <span className={`arc-level ${pct >= 70 ? 'level-high' : pct >= 40 ? 'level-med' : 'level-low'}`}>{level}</span>
    </div>
  )
}

export default function MessageDetailModal({ scan, onClose, theme }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!scan) return null

  const pct = scan.risk_pct ?? Math.round((scan.risk_score ?? 0) * 100)
  const statusColor =
    scan.status === 'Phishing'   ? '#ef4444' :
    scan.status === 'Suspicious' ? '#f59e0b' : '#10b981'

  const indicators = scan.indicators || {}
  const rec = scan.recommendation

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <aside className="scan-modal">
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Message Analysis Report</div>
            <div className="modal-url" style={{ fontFamily: 'Inter, sans-serif' }}>
              {scan.message_snippet}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">{'\u2715'}</button>
        </div>

        <div className="modal-body">
          {/* Risk Summary */}
          <div className="modal-score-row">
            <ArcGauge pct={pct} theme={theme} />
            <div className="modal-meta">
              <div className="modal-status" style={{ color: statusColor }}>
                {scan.status === 'Phishing' ? '\uD83D\uDEA8' : scan.status === 'Suspicious' ? '\u26A0\uFE0F' : '\u2705'}&nbsp;{scan.status}
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Analysis Type</span>
                <span className="meta-val">{scan.nlp_model_used ? 'DistilBERT + Heuristic' : 'Heuristic Only'}</span>
              </div>
              {scan.nlp_confidence != null && (
                <div className="modal-meta-row">
                  <span className="meta-key">NLP Confidence</span>
                  <span className="meta-val" style={{ color: statusColor }}>
                    {Math.round(scan.nlp_confidence * 100)}%
                  </span>
                </div>
              )}
              <div className="modal-meta-row">
                <span className="meta-key">Message Length</span>
                <span className="meta-val">{scan.full_message_length ?? '—'} chars</span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Scanned</span>
                <span className="meta-val">
                  {new Date(scan.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Indicator Cards */}
          <div className="msg-modal-section">
            <div className="modal-section-title">{'\uD83D\uDD0D'} Detected Indicators</div>
            <div className="msg-modal-indicators">
              {[
                { key: 'urgency', label: 'Urgent Language', icon: '\u23F1\uFE0F' },
                { key: 'credential_request', label: 'Credential Harvesting', icon: '\uD83D\uDD11' },
                { key: 'impersonation', label: 'Brand Impersonation', icon: '\uD83C\uDFAD' },
                { key: 'financial_scam', label: 'Financial Scam', icon: '\uD83D\uDCB0' },
                { key: 'ai_generated', label: 'AI-Generated', icon: '\uD83E\uDD16' },
              ].map(({ key, label, icon }) => (
                <div
                  key={key}
                  className={`msg-modal-ind-card ${indicators[key] ? 'ind-active' : 'ind-inactive'}`}
                >
                  <span className="msg-modal-ind-icon">{icon}</span>
                  <span className="msg-modal-ind-label">{label}</span>
                  <span className="msg-modal-ind-status">
                    {indicators[key] ? '\u26A0 Detected' : '\u2713 Clear'}
                  </span>
                </div>
              ))}
              {indicators.suspicious_links?.length > 0 && (
                <div className="msg-modal-ind-card ind-active">
                  <span className="msg-modal-ind-icon">{'\uD83D\uDD17'}</span>
                  <span className="msg-modal-ind-label">Suspicious Links</span>
                  <span className="msg-modal-ind-status">{indicators.suspicious_links.length} found</span>
                </div>
              )}
            </div>
          </div>

          {/* Suspicious Links */}
          {indicators.suspicious_links?.length > 0 && (
            <div className="msg-modal-section">
              <div className="modal-section-title">{'\uD83D\uDD17'} Suspicious Links Found</div>
              <div className="msg-modal-links">
                {indicators.suspicious_links.map((link, i) => (
                  <div key={i} className="msg-modal-link">{link}</div>
                ))}
              </div>
            </div>
          )}

          {/* Reasons */}
          {scan.reasons?.length > 0 && scan.reasons[0] !== 'No strong phishing indicators detected' && (
            <div className="adv-panel" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
              <div className="adv-panel-title">{'\uD83D\uDEE1'} Threat Analysis</div>
              <div className="adv-reasons-block" style={{ margin: 0, border: 'none', background: 'transparent', padding: 0 }}>
                {scan.reasons.map((r, i) => (
                  <div key={i} className="adv-reason-note">{'\u26A0'} {r}</div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {rec && (
            <div className={`msg-rec-block msg-rec-${rec.severity}`} style={{ borderRadius: '8px' }}>
              <div className="msg-rec-title">Recommended Action</div>
              <div className="msg-rec-action">{rec.action}</div>
              <ul className="msg-rec-steps">
                {rec.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
