/**
 * ScanModal.jsx
 * -------------
 * Slide-over side panel that appears when a row in ActivityLog is clicked.
 *
 * Sections:
 *   1. Header — URL + risk badge
 *   2. Risk Arc — visual score gauge
 *   3. AI Analysis — auto-generated explanation from triggered features
 *   4. Structural Features — badge grid (which binary flags fired)
 *   5. Statistical Features — horizontal bar chart from StatChart
 */
import { useEffect } from 'react'
import { buildBreakdown } from './featureMeta.js'
import StatChart from '../StatChart.jsx'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// ── Compact arc gauge ─────────────────────────────────────────────────────────
function ArcGauge({ pct }) {
  const color    = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981'
  const r = 52, cx = 70, cy = 65
  const toRad    = d => (d * Math.PI) / 180
  const startA   = -180, totalA = 180
  const arcX     = a => cx + r * Math.cos(toRad(a))
  const arcY     = a => cy + r * Math.sin(toRad(a))
  const endA     = startA + (totalA * pct) / 100
  const largeArc = endA - startA > 180 ? 1 : 0

  const track = `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 1 1 ${arcX(startA + totalA - 0.01)} ${arcY(startA + totalA - 0.01)}`
  const fill  = pct > 0 ? `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endA)} ${arcY(endA)}` : ''

  const level = pct >= 70 ? 'High Risk' : pct >= 40 ? 'Moderate Risk' : 'Low Risk'

  return (
    <div className="arc-gauge-wrap">
      <svg viewBox="0 0 140 75" className="arc-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pct >= 70 ? '#7f1d1d' : pct >= 40 ? '#78350f' : '#064e3b'} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke="#1a2540" strokeWidth="8" strokeLinecap="round" />
        {fill && <path d={fill} fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" />}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="Inter, sans-serif">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#475569" fontSize="7" fontFamily="Inter, sans-serif">PHISHING RISK</text>
      </svg>
      <span className={`arc-level ${pct >= 70 ? 'level-high' : pct >= 40 ? 'level-med' : 'level-low'}`}>{level}</span>
    </div>
  )
}

// ── AI reasoning text from triggered features ─────────────────────────────────
function AIAnalysis({ structuralFeatures }) {
  const triggered = structuralFeatures.filter(f => f.value === 1)
  const cleared   = structuralFeatures.filter(f => f.value === 0)

  if (triggered.length === 0) {
    return (
      <div className="ai-panel clear">
        <div className="ai-panel-title">🤖 AI Analysis</div>
        <p className="ai-text">No structural threat indicators were detected. The URL structure appears consistent with a legitimate domain. Low-risk structural profile.</p>
      </div>
    )
  }

  return (
    <div className="ai-panel threat">
      <div className="ai-panel-title">🤖 AI Analysis — Threat Indicators Found</div>
      <div className="ai-reasons">
        {triggered.map(f => (
          <div key={f.key} className="ai-reason">
            <span className="ai-bullet">⚠</span>
            <div>
              <div className="ai-reason-title">{f.label}</div>
              <div className="ai-reason-body">{f.explain}</div>
            </div>
          </div>
        ))}
      </div>
      {cleared.length > 0 && (
        <div className="ai-cleared">
          <span className="ai-cleared-label">Cleared checks: </span>
          {cleared.map(f => (
            <span key={f.key} className="ai-cleared-chip">{f.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ScanModal({ scan, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!scan) return null

  const breakdown       = buildBreakdown(scan.features || {})
  const structural      = breakdown.filter(f => f.type === 'structural')
  const statistical     = breakdown.filter(f => f.type === 'statistical')
  const triggeredCount  = structural.filter(f => f.value === 1).length

  const statusColor =
    scan.status === 'Phishing'   ? '#ef4444' :
    scan.status === 'Suspicious' ? '#f59e0b' : '#10b981'

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Panel */}
      <aside className="scan-modal">
        {/* ── Modal header ── */}
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Scan Details</div>
            <div className="modal-url" title={scan.url}>{scan.url}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* ── Score row ── */}
          <div className="modal-score-row">
            <ArcGauge pct={scan.risk_pct ?? Math.round((scan.risk_score ?? 0) * 100)} />
            <div className="modal-meta">
              <div className="modal-status" style={{ color: statusColor }}>
                {scan.status === 'Phishing' ? '🚨' : scan.status === 'Suspicious' ? '⚠️' : '✅'}&nbsp;{scan.status}
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Risk Score</span>
                <span className="meta-val" style={{ color: statusColor }}>
                  {((scan.risk_score ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Scanned</span>
                <span className="meta-val">
                  {new Date(scan.timestamp).toLocaleString('en-US', {
                    month: 'short', day:'numeric', year:'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Model</span>
                <span className="meta-val">Random Forest (21 features)</span>
              </div>
            </div>
          </div>

          {/* ── AI Analysis ── */}
          <AIAnalysis structuralFeatures={structural} />

          {/* ── Structural features ── */}
          <div className="modal-section">
            <div className="modal-section-title">
              🔒 Structural Indicators
              <span className={`struct-pill ${triggeredCount > 0 ? 'pill-threat' : 'pill-ok'}`}>
                {triggeredCount}/{structural.length} triggered
              </span>
            </div>
            <div className="struct-grid">
              {structural.map(f => (
                <div key={f.key} className={`struct-chip ${f.value === 1 ? 'chip-fired' : 'chip-clear'}`}>
                  <span className="chip-ico">{f.value === 1 ? '⚠' : '✓'}</span>
                  <span className="chip-txt">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Statistical features ── */}
          {statistical.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">📊 Statistical Features</div>
              <div className="modal-stat-chart">
                <StatChart features={statistical} />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
