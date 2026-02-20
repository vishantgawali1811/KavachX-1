/**
 * ScanModal.jsx
 * -------------
 * Slide-over advisory panel — full cybersecurity risk breakdown.
 *
 * Sections:
 *   1. Header — URL + status badge
 *   2. Risk Summary — arc gauge + hybrid score breakdown + meta
 *   3. Security Advisory — collapsible cards per triggered feature
 *   4. Statistical Features — horizontal bar chart
 */
import { useEffect, useState, useRef } from 'react'
import { buildBreakdown } from './featureMeta.js'
import StatChart from '../StatChart.jsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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

// ── Severity badge ─────────────────────────────────────────────────────────────
function SevBadge({ sev }) {
  const cls = sev === 'High' ? 'sev-high' : sev === 'Medium' ? 'sev-med' : 'sev-low'
  return <span className={`sev-badge ${cls}`}>{sev}</span>
}

// ── Single collapsible advisory card ──────────────────────────────────────────
function AdvisoryCard({ entry, index }) {
  const [open, setOpen] = useState(index === 0)
  const borderColor =
    entry.severity === 'High'   ? 'rgba(239,68,68,0.5)'   :
    entry.severity === 'Medium' ? 'rgba(245,158,11,0.5)'  : 'rgba(100,116,139,0.4)'
  const bgColor =
    entry.severity === 'High'   ? 'rgba(239,68,68,0.05)'  :
    entry.severity === 'Medium' ? 'rgba(245,158,11,0.05)' : 'rgba(15,23,42,0.5)'

  return (
    <div className="adv-card" style={{ borderLeft: `3px solid ${borderColor}`, background: bgColor }}>
      <button className="adv-card-header" onClick={() => setOpen(o => !o)}>
        <div className="adv-card-left">
          <span className="adv-card-icon">{entry.severity === 'High' ? '🔴' : entry.severity === 'Medium' ? '🟡' : '🔵'}</span>
          <div>
            <span className="adv-feature-name">{entry.feature}</span>
            <span className="adv-explanation">{entry.explanation}</span>
          </div>
        </div>
        <div className="adv-card-right">
          <SevBadge sev={entry.severity} />
          <span className="adv-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="adv-card-body">
          <div className="adv-risk-row">
            <span className="adv-label">⚠ Risk</span>
            <span className="adv-risk-text">{entry.risk}</span>
          </div>
          <div className="adv-attacks-row">
            <span className="adv-label">🎯 Possible Attacks</span>
            <div className="adv-attack-chips">
              {entry.possible_attacks.map(atk => (
                <span key={atk} className="adv-attack-chip">{atk}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Security Advisory section ─────────────────────────────────────────────────
function SecurityAdvisory({ securityAnalysis, reasons }) {
  const high   = securityAnalysis.filter(e => e.severity === 'High').length
  const medium = securityAnalysis.filter(e => e.severity === 'Medium').length
  const low    = securityAnalysis.filter(e => e.severity === 'Low').length

  if (securityAnalysis.length === 0) {
    return (
      <div className="adv-panel adv-clear">
        <div className="adv-panel-title">🛡 Security Advisory</div>
        <p className="adv-clear-msg">No URL-based threat indicators triggered. The URL structure appears consistent with a legitimate site.</p>
        {reasons && reasons.length > 0 && (
          <div className="adv-reasons-block">
            <div className="adv-reasons-title">Hybrid Analysis Notes</div>
            {reasons.map((r, i) => <div key={i} className="adv-reason-note">⚠ {r}</div>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="adv-panel">
      <div className="adv-panel-header">
        <div className="adv-panel-title">🛡 Security Advisory</div>
        <div className="adv-sev-summary">
          {high   > 0 && <span className="sev-badge sev-high">{high} High</span>}
          {medium > 0 && <span className="sev-badge sev-med">{medium} Medium</span>}
          {low    > 0 && <span className="sev-badge sev-low">{low} Low</span>}
        </div>
      </div>

      {/* Hybrid content/structural reasons */}
      {reasons && reasons.length > 0 && (
        <div className="adv-reasons-block">
          {reasons.map((r, i) => <div key={i} className="adv-reason-note">⚠ {r}</div>)}
        </div>
      )}

      {/* Collapsible feature cards */}
      <div className="adv-cards-list">
        {securityAnalysis.map((entry, i) => (
          <AdvisoryCard key={entry.feature} entry={entry} index={i} />
        ))}
      </div>
    </div>
  )
}

// ── Hybrid score breakdown row ────────────────────────────────────────────────
function HybridBreakdown({ scan }) {
  if (!scan.hybrid) return null
  const urlPct  = Math.round((scan.url_score        ?? 0) * 100)
  const strPct  = Math.round((scan.structural_score ?? 0) * 100)
  const conPct  = Math.round((scan.content_score    ?? 0) * 100)
  const c = p => p >= 70 ? '#ef4444' : p >= 40 ? '#f59e0b' : '#10b981'
  return (
    <div className="hybrid-breakdown">
      <div className="hybrid-title">Hybrid Score Breakdown</div>
      <div className="hybrid-rows">
        {[['URL Model (40%)', urlPct], ['Page Structure (30%)', strPct], ['Content / NLP (30%)', conPct]].map(([label, pct]) => (
          <div key={label} className="hybrid-row">
            <span className="hybrid-label">{label}</span>
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

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ScanModal({ scan, onClose }) {
  const panelRef  = useRef(null)
  const [exporting, setExporting] = useState(false)

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
      const body  = modal.querySelector('.modal-body')

      // ── Save original constrained styles ────────────────────────────────
      const orig = {
        mPos:      modal.style.position,
        mHeight:   modal.style.height,
        mBottom:   modal.style.bottom,
        mOverflow: modal.style.overflow,
        bOverflow: body ? body.style.overflow  : '',
        bFlex:     body ? body.style.flex      : '',
        bMaxH:     body ? body.style.maxHeight : '',
      }

      // ── Temporarily expand to full content height ────────────────────────
      modal.style.position = 'absolute'
      modal.style.height   = 'auto'
      modal.style.bottom   = 'unset'
      modal.style.overflow = 'visible'
      if (body) {
        body.style.overflow  = 'visible'
        body.style.flex      = 'none'
        body.style.maxHeight = 'none'
      }

      // Allow browser to reflow / re-render charts at new size
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise(r => setTimeout(r, 150))

      const canvas = await html2canvas(modal, {
        scale:        2,
        useCORS:      true,
        logging:      false,
        backgroundColor: '#080e1c',
        scrollX:      0,
        scrollY:      0,
        x:            0,
        y:            0,
        width:        modal.offsetWidth,
        height:       modal.scrollHeight,
        windowWidth:  modal.offsetWidth,
        windowHeight: modal.scrollHeight,
      })

      // ── Restore original styles ──────────────────────────────────────────
      modal.style.position = orig.mPos
      modal.style.height   = orig.mHeight
      modal.style.bottom   = orig.mBottom
      modal.style.overflow = orig.mOverflow
      if (body) {
        body.style.overflow  = orig.bOverflow
        body.style.flex      = orig.bFlex
        body.style.maxHeight = orig.bMaxH
      }

      // ── Build multi-page A4 PDF ──────────────────────────────────────────
      const imgData = canvas.toDataURL('image/png')
      const pdf     = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
      const pdfW    = pdf.internal.pageSize.getWidth()
      const pdfH    = (canvas.height * pdfW) / canvas.width
      const pageH   = pdf.internal.pageSize.getHeight()
      let yPos      = 0
      let remaining = pdfH

      while (remaining > 0) {
        if (yPos > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, pdfH)
        yPos      += pageH
        remaining -= pageH
      }

      const hostname = (() => { try { return new URL(scan.url).hostname } catch { return 'report' } })()
      const fname = `KavachX_Report_${hostname}_${new Date().toISOString().slice(0, 10)}.pdf`
      pdf.save(fname)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (!scan) return null

  const breakdown      = buildBreakdown(scan.features || {})
  const statistical    = breakdown.filter(f => f.type === 'statistical')
  const secAnalysis    = scan.security_analysis ?? []
  const triggeredCount = scan.triggered_features_count ?? secAnalysis.length
  const riskLevel      = scan.risk_level ?? (scan.status === 'Phishing' ? 'High' : scan.status === 'Suspicious' ? 'Medium' : 'Low')
  const highestSev     = scan.highest_severity ?? (secAnalysis[0]?.severity ?? 'None')
  const finalPct       = scan.risk_pct ?? Math.round((scan.final_score ?? scan.risk_score ?? 0) * 100)

  const statusColor =
    scan.status === 'Phishing'   ? '#ef4444' :
    scan.status === 'Suspicious' ? '#f59e0b' : '#10b981'

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <aside className="scan-modal" ref={panelRef}>
        {/* ── Header ── */}
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Security Advisory Report</div>
            <div className="modal-url" title={scan.url}>{scan.url}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* ── Section 1: Risk Summary ── */}
          <div className="modal-score-row">
            <ArcGauge pct={finalPct} />
            <div className="modal-meta">
              <div className="modal-status" style={{ color: statusColor }}>
                {scan.status === 'Phishing' ? '🚨' : scan.status === 'Suspicious' ? '⚠️' : '✅'}&nbsp;{scan.status}
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Risk Level</span>
                <SevBadge sev={riskLevel} />
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Triggered Features</span>
                <span className="meta-val" style={{ color: triggeredCount > 0 ? '#f59e0b' : '#10b981' }}>
                  {triggeredCount} / 21
                </span>
              </div>
              <div className="modal-meta-row">
                <span className="meta-key">Highest Severity</span>
                <SevBadge sev={highestSev} />
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

          {/* ── Hybrid breakdown bars ── */}
          <HybridBreakdown scan={scan} />

          {/* ── Section 2: Security Advisory ── */}
          <SecurityAdvisory securityAnalysis={secAnalysis} reasons={scan.reasons ?? []} />

          {/* ── Section 3: Statistical features chart ── */}
          {statistical.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">📊 Statistical Feature Values</div>
              <div className="modal-stat-chart">
                <StatChart features={statistical} />
              </div>
            </div>
          )}

          {/* ── Export PDF button ── */}
          <button
            className={`export-pdf-btn ${exporting ? 'exporting' : ''}`}
            onClick={exportPdf}
            disabled={exporting}
          >
            {exporting
              ? <><span className="spinner" /> Generating PDF…</>
              : <>📄 Export Report as PDF</>}
          </button>
        </div>
      </aside>
    </>
  )
}
