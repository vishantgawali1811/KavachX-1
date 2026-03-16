/**
 * MetricCards.jsx — Deepfake Detective
 * Four KPI summary cards:
 *   Total Scanned | Deepfakes | Uncertain | Authentic
 */
export default function MetricCards({ scans }) {
  const total     = scans.length
  const deepfakes = scans.filter(s => s.verdict === 'Deepfake').length
  const uncertain = scans.filter(s => s.verdict === 'Uncertain').length
  const real      = scans.filter(s => s.verdict === 'Real').length

  const pct = (n) => total ? ((n / total) * 100).toFixed(1) : '0.0'

  const cards = [
    { key: 'total', label: 'Total Scanned', value: total, sub: 'All media files checked', icon: '\uD83D\uDD0D', colorClass: 'card-blue' },
    { key: 'deepfake', label: 'Deepfakes Detected', value: deepfakes, sub: `${pct(deepfakes)}% of total`, icon: '\uD83D\uDEA8', colorClass: 'card-red' },
    { key: 'uncertain', label: 'Uncertain', value: uncertain, sub: `${pct(uncertain)}% of total`, icon: '\u26A0\uFE0F', colorClass: 'card-yellow' },
    { key: 'real', label: 'Authentic Media', value: real, sub: `${pct(real)}% of total`, icon: '\u2705', colorClass: 'card-green' },
  ]

  return (
    <div className="metric-grid">
      {cards.map(c => (
        <div key={c.key} className={`metric-card ${c.colorClass}`}>
          <div className="metric-icon">{c.icon}</div>
          <div className="metric-body">
            <div className="metric-value">{c.value.toLocaleString()}</div>
            <div className="metric-label">{c.label}</div>
            <div className="metric-sub">{c.sub}</div>
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{ width: total ? `${(c.value / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
