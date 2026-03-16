/**
 * MetricCards.jsx
 * ---------------
 * Four KPI summary cards at the top of the dashboard:
 *   Total Scanned | Phishing | Suspicious | Safe
 *
 * Each card shows:
 *   - Icon  - Count  - % share  - Trend arrow vs previous session
 */
export default function MetricCards({ scans }) {
  const total      = scans.length
  const phishing   = scans.filter(s => s.status === 'Phishing').length
  const suspicious = scans.filter(s => s.status === 'Suspicious').length
  const safe       = scans.filter(s => s.status === 'Safe').length

  const pct = (n) => total ? ((n / total) * 100).toFixed(1) : '0.0'

  const cards = [
    {
      key: 'total',
      label: 'Total Scanned',
      value: total,
      sub: 'All-time URLs checked',
      icon: '🔍',
      colorClass: 'card-blue',
      accentVar: '--accent',
    },
    {
      key: 'phishing',
      label: 'Phishing Detected',
      value: phishing,
      sub: `${pct(phishing)}% of total`,
      icon: '🚨',
      colorClass: 'card-red',
      accentVar: '--red',
    },
    {
      key: 'suspicious',
      label: 'Suspicious Sites',
      value: suspicious,
      sub: `${pct(suspicious)}% of total`,
      icon: '⚠️',
      colorClass: 'card-yellow',
      accentVar: '--yellow',
    },
    {
      key: 'safe',
      label: 'Safe Sites',
      value: safe,
      sub: `${pct(safe)}% of total`,
      icon: '✅',
      colorClass: 'card-green',
      accentVar: '--green',
    },
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
          {/* Sparkline fill bar */}
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
