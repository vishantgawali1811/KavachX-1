/**
 * DeepfakeDetailModal.jsx
 * ----------------------
 * Slide-over detail panel for deepfake analysis results.
 * Mirrors MessageDetailModal / ScanModal in structure and CSS classes.
 */
import { useEffect } from 'react'

function ArcGauge({ pct, theme }) {
  const isLight = theme === 'light'
  const color = pct >= 65 ? '#ef4444' : pct >= 35 ? '#f59e0b' : '#10b981'
  const r = 52, cx = 70, cy = 65
  const toRad = d => (d * Math.PI) / 180
  const startA = -180, totalA = 180
  const arcX = a => cx + r * Math.cos(toRad(a))
  const arcY = a => cy + r * Math.sin(toRad(a))
  const endA = startA + (totalA * pct) / 100
  const largeArc = endA - startA > 180 ? 1 : 0

  const track = `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 1 1 ${arcX(startA + totalA - 0.01)} ${arcY(startA + totalA - 0.01)}`
  const fill  = pct > 0 ? `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endA)} ${arcY(endA)}` : ''
  const level = pct >= 65 ? 'Deepfake' : pct >= 35 ? 'Uncertain' : 'Authentic'
  const trackColor = isLight ? '#cbd5e1' : '#1a2540'
  const labelColor = isLight ? '#64748b' : '#475569'

  return (
    <div className="arc-gauge-wrap">
      <svg viewBox="0 0 140 75" className="arc-svg">
        <defs>
          <linearGradient id="dfGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pct >= 65 ? '#7f1d1d' : pct >= 35 ? '#78350f' : '#064e3b'} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke={trackColor} strokeWidth="8" strokeLinecap="round" />
        {fill && <path d={fill} fill="none" stroke="url(#dfGaugeGrad)" strokeWidth="8" strokeLinecap="round" />}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="Inter, sans-serif">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={labelColor} fontSize="7" fontFamily="Inter, sans-serif">DEEPFAKE RISK</text>
      </svg>
      <span className={`arc-level ${pct >= 65 ? 'level-high' : pct >= 35 ? 'level-med' : 'level-low'}`}>{level}</span>
    </div>
  )
}

export default function DeepfakeDetailModal({ scan, onClose, theme }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!scan) return null

  const riskPct     = scan.risk_pct ?? Math.round(scan.final_score * 100)
  const verdict     = scan.verdict
  const color       = verdict === 'Deepfake' ? '#ef4444' : verdict === 'Uncertain' ? '#f59e0b' : '#10b981'
  const verdictIcon = verdict === 'Deepfake' ? '🚨' : verdict === 'Uncertain' ? '⚠️' : '✅'

  const va = scan.video_analysis
  const aa = scan.audio_analysis

  const anomalyLabels = {
    pitch_stability  : { label: 'Pitch Stability',   icon: '🎵' },
    spectral_flatness: { label: 'Spectral Flatness',  icon: '📊' },
    breath_patterns  : { label: 'Breath Patterns',    icon: '💨' },
    frequency_cutoff : { label: 'Frequency Cutoff',   icon: '🔊' },
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <aside className="scan-modal">
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Deepfake Analysis Report</div>
            <div className="modal-url" style={{ fontFamily: 'Inter, sans-serif' }}>
              {scan.filename}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Risk Summary */}
          <div className="modal-score-row">
            <ArcGauge pct={riskPct} theme={theme} />
            <div className="modal-meta">
              <div className="modal-status" style={{ color }}>
                {verdictIcon}&nbsp;{verdict === 'Real' ? 'Authentic Media' : verdict}
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">File Type</span>
                <span className="meta-val">{scan.file_type === 'video' ? '🎬 Video' : '🎵 Audio'}</span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Confidence</span>
                <span className="meta-val" style={{ color }}>{scan.confidence ?? `${riskPct}%`}</span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Fusion Weights</span>
                <span className="meta-val">
                  {scan.file_type === 'video'
                    ? `Video ${scan.fusion_alpha ?? 0.6} / Audio ${scan.fusion_beta ?? 0.4}`
                    : 'Audio-only'}
                </span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Analyzed</span>
                <span className="meta-val">
                  {new Date(scan.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Video Analysis */}
          {va && (
            <div className="msg-modal-section">
              <div className="modal-section-title">🎬 Video Analysis</div>
              <div className="msg-modal-indicators">
                {[
                  { label: 'Frames Analyzed', value: va.frame_count },
                  { label: 'Mean Score',       value: `${(va.mc_mean * 100).toFixed(1)}%` },
                  { label: 'Max Score',        value: `${((va.max_score ?? 0) * 100).toFixed(1)}%` },
                  { label: 'Faces Detected',   value: va.faces_detected ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label} className="msg-modal-ind-card ind-inactive">
                    <span className="msg-modal-ind-label">{label}</span>
                    <span className="msg-modal-ind-status" style={{ color: 'var(--accent2)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio Anomaly Cards */}
          {aa && (
            <div className="msg-modal-section">
              <div className="modal-section-title">
                🎵 Audio Analysis
                <span className="df-modal-audio-checks">
                  {aa.triggered_count}/{aa.total_checks} anomalies
                </span>
              </div>
              <div className="msg-modal-indicators">
                {Object.entries(aa.anomalies ?? {}).map(([key, anomaly]) => {
                  const meta = anomalyLabels[key] || { label: key, icon: '🔍' }
                  const isDetected = anomaly.detected
                  return (
                    <div key={key} className={`msg-modal-ind-card ${isDetected ? 'ind-active' : 'ind-inactive'}`}>
                      <span className="msg-modal-ind-icon">{meta.icon}</span>
                      <span className="msg-modal-ind-label">{meta.label}</span>
                      <span className="msg-modal-ind-status">
                        {isDetected ? `⚠ ${anomaly.severity}` : '✓ Clear'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Anomaly explanations for triggered ones */}
              {aa.triggered_count > 0 && (
                <div className="adv-panel" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                  <div className="adv-panel-title">⚠ Detected Audio Anomalies</div>
                  {Object.entries(aa.anomalies).filter(([, a]) => a.detected).map(([key, a]) => (
                    <div key={key} className="adv-reason-note">⚠ {a.explanation}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Key Findings */}
          {scan.explanations?.length > 0 && (
            <div className="adv-panel" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.04)' }}>
              <div className="adv-panel-title">📋 Key Findings</div>
              {scan.explanations.map((expl, i) => (
                <div key={i} className="adv-reason-note" style={{ color: 'var(--text-muted)' }}>• {expl}</div>
              ))}
            </div>
          )}

          {/* Demo badge */}
          {scan.isDemo && (
            <div className="df-modal-demo-badge">
              Demo data — upload a real media file to see live analysis
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
