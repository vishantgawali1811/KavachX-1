export default function RiskMeter({ score }) {
  const pct = Math.min(100, Math.max(0, Math.round(score)))
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low'
  const label = pct >= 70 ? 'High Risk' : pct >= 40 ? 'Moderate Risk' : 'Low Risk'
  const color = pct >= 70 ? '#ff3b3b' : pct >= 40 ? '#ffb300' : '#00e676'
  const startColor = pct >= 70 ? '#7f1d1d' : pct >= 40 ? '#78350f' : '#064e3b'

  const r = 60, cx = 90, cy = 80
  const toRad = d => (d * Math.PI) / 180
  const arcX = a => cx + r * Math.cos(toRad(a))
  const arcY = a => cy + r * Math.sin(toRad(a))
  const startAngle = -180, totalAngle = 180
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
            <linearGradient id={`rg-${pct}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <path d={trackPath} fill="none" stroke="#101729" strokeWidth="10" strokeLinecap="round" />
          {fillPath && (
            <path d={fillPath} fill="none" stroke={`url(#rg-${pct})`} strokeWidth="10" strokeLinecap="round" />
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="22" fontWeight="800" fontFamily="Space Grotesk, Inter, sans-serif">
            {pct}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b80a8" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="1">
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
