/**
 * ScanModal.jsx — Deepfake Detective detail slide-over panel
 */
import { useEffect, useState, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ── Arc gauge ────────────────────────────────────────────────────────────────
function ArcGauge({ pct }) {
  const color = pct >= 65 ? '#ef4444' : pct >= 35 ? '#f59e0b' : '#10b981'
  const r = 52, cx = 70, cy = 65
  const toRad = d => (d * Math.PI) / 180
  const startA = -180, totalA = 180
  const arcX = a => cx + r * Math.cos(toRad(a))
  const arcY = a => cy + r * Math.sin(toRad(a))
  const endA = startA + (totalA * pct) / 100
  const largeArc = endA - startA > 180 ? 1 : 0

  const track = `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 1 1 ${arcX(startA + totalA - 0.01)} ${arcY(startA + totalA - 0.01)}`
  const fill = pct > 0 ? `M ${arcX(startA)} ${arcY(startA)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endA)} ${arcY(endA)}` : ''
  const level = pct >= 65 ? 'Deepfake Risk' : pct >= 35 ? 'Moderate Risk' : 'Low Risk'

  return (
    <div className="arc-gauge-wrap">
      <svg viewBox="0 0 140 75" className="arc-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pct >= 65 ? '#7f1d1d' : pct >= 35 ? '#78350f' : '#064e3b'} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke="#1a2540" strokeWidth="8" strokeLinecap="round" />
        {fill && <path d={fill} fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" />}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="Inter, sans-serif">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#475569" fontSize="7" fontFamily="Inter, sans-serif">DEEPFAKE RISK</text>
      </svg>
      <span className={`arc-level ${pct >= 65 ? 'level-high' : pct >= 35 ? 'level-med' : 'level-low'}`}>{level}</span>
    </div>
  )
}

// ── Score breakdown bars ─────────────────────────────────────────────────────
function ScoreBreakdown({ scan }) {
  const va = scan.video_analysis
  const aa = scan.audio_analysis
  if (!va && !aa) return null

  const c = p => p >= 65 ? '#ef4444' : p >= 35 ? '#f59e0b' : '#10b981'

  const rows = []
  if (va) {
    rows.push(['Video Model', Math.round((va.mc_mean ?? 0) * 100), Math.round((scan.fusion_alpha ?? 0.6) * 100)])
  }
  if (aa) {
    rows.push(['Audio Model', Math.round((aa.combined_score ?? 0) * 100), Math.round((scan.fusion_beta ?? 0.4) * 100)])
  }

  return (
    <div className="hybrid-breakdown">
      <div className="hybrid-title">Score Breakdown</div>
      <div className="hybrid-rows">
        {rows.map(([label, pct, weight]) => (
          <div key={label} className="hybrid-row">
            <span className="hybrid-label">{label} ({weight}%)</span>
            <div className="hybrid-bar-track">
              <div className="hybrid-bar-fill" style={{ width: `${pct}%`, background: c(pct) }} />
            </div>
            <span className="hybrid-pct" style={{ color: c(pct) }}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Audio Anomaly Section ────────────────────────────────────────────────────
function AudioAnomalies({ audioAnalysis }) {
  if (!audioAnalysis?.anomalies) return null

  const anomalies = audioAnalysis.anomalies
  const entries = Object.entries(anomalies)
  if (entries.length === 0) return null

  const labels = {
    pitch_stability: 'Pitch Stability',
    breath_patterns: 'Breath Patterns',
    spectral_flatness: 'Spectral Flatness',
    frequency_cutoff: 'Frequency Cutoff',
  }

  return (
    <div className="adv-panel">
      <div className="adv-panel-header">
        <div className="adv-panel-title">{'\uD83C\uDFA4'} Audio Forensic Analysis</div>
        <div className="adv-sev-summary">
          <span className="sev-badge sev-info">{audioAnalysis.triggered_count ?? 0} / {audioAnalysis.total_checks ?? 0} triggered</span>
        </div>
      </div>

      <div className="adv-cards-list">
        {entries.map(([key, info]) => {
          const detected = info.detected
          const severity = detected ? info.severity : 'OK'
          const borderColor = severity === 'High' ? 'rgba(239,68,68,0.5)' : severity === 'Medium' ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.4)'
          const bgColor = severity === 'High' ? 'rgba(239,68,68,0.05)' : severity === 'Medium' ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)'

          return (
            <div key={key} className="adv-card" style={{ borderLeft: `3px solid ${borderColor}`, background: bgColor }}>
              <div className="adv-card-header" style={{ cursor: 'default' }}>
                <div className="adv-card-left">
                  <span className="adv-card-icon">{detected ? (severity === 'High' ? '\uD83D\uDD34' : '\uD83D\uDFE1') : '\uD83D\uDFE2'}</span>
                  <div>
                    <span className="adv-feature-name">{labels[key] || key}</span>
                    <span className="adv-explanation">{info.explanation}</span>
                  </div>
                </div>
                <span className={`sev-badge ${severity === 'High' ? 'sev-high' : severity === 'Medium' ? 'sev-med' : 'sev-low'}`}>
                  {severity}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function ScanModal({ scan, onClose }) {
  const panelRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(true)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const exportPdf = async () => {
    if (!panelRef.current || exporting) return
    setExporting(true)
    try {
      const modal = panelRef.current
      const body = modal.querySelector('.modal-body')
      const orig = {
        mPos: modal.style.position, mHeight: modal.style.height,
        mBottom: modal.style.bottom, mOverflow: modal.style.overflow,
        bOverflow: body ? body.style.overflow : '',
        bFlex: body ? body.style.flex : '', bMaxH: body ? body.style.maxHeight : '',
      }
      modal.style.position = 'absolute'; modal.style.height = 'auto'
      modal.style.bottom = 'unset'; modal.style.overflow = 'visible'
      if (body) { body.style.overflow = 'visible'; body.style.flex = 'none'; body.style.maxHeight = 'none' }

      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise(r => setTimeout(r, 150))

      const canvas = await html2canvas(modal, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#080e1c',
        scrollX: 0, scrollY: 0, x: 0, y: 0,
        width: modal.offsetWidth, height: modal.scrollHeight,
        windowWidth: modal.offsetWidth, windowHeight: modal.scrollHeight,
      })

      modal.style.position = orig.mPos; modal.style.height = orig.mHeight
      modal.style.bottom = orig.mBottom; modal.style.overflow = orig.mOverflow
      if (body) { body.style.overflow = orig.bOverflow; body.style.flex = orig.bFlex; body.style.maxHeight = orig.bMaxH }

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      const pageH = pdf.internal.pageSize.getHeight()
      let yPos = 0, remaining = pdfH
      while (remaining > 0) {
        if (yPos > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, pdfH)
        yPos += pageH; remaining -= pageH
      }

      const fname = `DeepfakeDetective_Report_${scan.id?.slice(0, 8) ?? 'scan'}_${new Date().toISOString().slice(0, 10)}.pdf`
      pdf.save(fname)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (!scan) return null

  const finalPct = scan.risk_pct ?? Math.round((scan.final_score ?? 0) * 100)
  const statusColor = scan.verdict === 'Deepfake' ? '#ef4444' : scan.verdict === 'Uncertain' ? '#f59e0b' : '#10b981'
  const va = scan.video_analysis
  const aa = scan.audio_analysis

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <aside className="scan-modal" ref={panelRef}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Forensic Analysis Report</div>
            <div className="modal-url" title={scan.filename}>{scan.filename || 'Unknown file'}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">{'\u2715'}</button>
        </div>

        <div className="modal-body">
          {/* Section 1: Risk Summary */}
          <div className="modal-score-row">
            <ArcGauge pct={finalPct} />
            <div className="modal-meta">
              <div className="modal-status" style={{ color: statusColor }}>
                {scan.verdict === 'Deepfake' ? '\uD83D\uDEA8' : scan.verdict === 'Uncertain' ? '\u26A0\uFE0F' : '\u2705'}&nbsp;{scan.verdict}
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">File Type</span>
                <span className="meta-val">{scan.file_type}</span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Confidence</span>
                <span className="meta-val">{scan.confidence || '—'}</span>
              </div>
              {va && (
                <>
                  <div className="modal-meta-row">
                    <span className="meta-key">Frames Analyzed</span>
                    <span className="meta-val">{va.frame_count ?? '—'}</span>
                  </div>
                  <div className="modal-meta-row">
                    <span className="meta-key">Face Detected</span>
                    <span className="meta-val">{va.faces_detected ? 'Yes' : 'No'}</span>
                  </div>
                </>
              )}
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

          {/* Score breakdown */}
          <ScoreBreakdown scan={scan} />

          {/* Grad-CAM heatmap */}
          {va?.heatmap_b64 && (
            <div className="modal-section">
              <div className="modal-section-title">{'\uD83D\uDCA1'} Grad-CAM Explainability</div>
              <div className="heatmap-btns" style={{ marginBottom: 8 }}>
                <button className={showHeatmap ? 'active' : ''} onClick={() => setShowHeatmap(true)}>Heatmap Overlay</button>
                <button className={!showHeatmap ? 'active' : ''} onClick={() => setShowHeatmap(false)}>Original Frame</button>
              </div>
              <img
                className="heatmap-img-modal"
                src={`data:image/png;base64,${showHeatmap ? va.heatmap_b64 : va.original_frame_b64}`}
                alt="Grad-CAM heatmap"
              />
              <div className="heatmap-caption">
                Highlighted regions indicate areas the model focused on for its deepfake classification.
                Red/yellow areas = highest activation.
              </div>
            </div>
          )}

          {/* Audio anomalies */}
          <AudioAnomalies audioAnalysis={aa} />

          {/* Detection explanations */}
          {scan.explanations?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">{'\uD83D\uDD0D'} Detection Explanations</div>
              <div className="explanation-list">
                {scan.explanations.map((exp, i) => (
                  <div key={i} className="explanation-item">{exp}</div>
                ))}
              </div>
            </div>
          )}

          {/* Export PDF */}
          <button
            className={`export-pdf-btn ${exporting ? 'exporting' : ''}`}
            onClick={exportPdf}
            disabled={exporting}
          >
            {exporting ? <><span className="spinner" /> Generating PDF...</> : <>{'\uD83D\uDCC4'} Export Report as PDF</>}
          </button>
        </div>
      </aside>
    </>
  )
}
