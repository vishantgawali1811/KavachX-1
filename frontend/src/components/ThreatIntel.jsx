/**
 * ThreatIntel.jsx
 * ---------------
 * Threat Intelligence panel — derived entirely from scan history.
 *
 * Three columns:
 *   1. Top Triggered Indicators — most-fired structural features from phishing scans
 *   2. Highest Risk URLs        — top 5 scans by risk_score
 *   3. Domain Pattern Analysis  — TLD frequency + avg risk per TLD
 */

// ── Helper ────────────────────────────────────────────────────────────────────
const STRUCTURAL_KEYS = [
  'ip', 'https_token', 'prefix_suffix', 'shortening_service', 'suspicious_tld', 'statistical_report',
]
const STRUCTURAL_LABELS = {
  ip:                 'IP as Hostname',
  https_token:        'HTTPS Token in URL',
  prefix_suffix:      'Domain Prefix/Suffix',
  shortening_service: 'URL Shortener',
  suspicious_tld:     'Suspicious TLD',
  statistical_report: 'Blocklisted Host',
}

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0
}

function extractTLD(url) {
  try {
    const host = new URL(url).hostname
    const parts = host.split('.')
    return parts.length >= 2 ? '.' + parts[parts.length - 1] : host
  } catch { return 'unknown' }
}

export default function ThreatIntel({ scans }) {
  const phishingScans = scans.filter(s => s.status === 'Phishing')

  // ── 1. Indicator frequency ────────────────────────────────────────────────
  const indicatorCounts = STRUCTURAL_KEYS.map(key => ({
    key,
    label: STRUCTURAL_LABELS[key],
    count: phishingScans.filter(s => s.features?.[key] === 1).length,
  })).sort((a, b) => b.count - a.count)

  // ── 2. Top 5 highest-risk URLs ────────────────────────────────────────────
  const topRisk = [...scans]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5)

  // ── 3. TLD distribution ───────────────────────────────────────────────────
  const tldMap = {}
  scans.forEach(s => {
    const tld = extractTLD(s.url)
    if (!tldMap[tld]) tldMap[tld] = { count: 0, totalRisk: 0 }
    tldMap[tld].count++
    tldMap[tld].totalRisk += s.risk_score
  })
  const tldStats = Object.entries(tldMap)
    .map(([tld, d]) => ({
      tld,
      count: d.count,
      avgRisk: Math.round((d.totalRisk / d.count) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return (
    <div className="intel-grid">
      {/* ── Card 1: Top Indicators ── */}
      <div className="intel-card">
        <div className="intel-card-head">
          <span className="intel-icon">⚡</span>
          <div>
            <div className="intel-title">Top Threat Indicators</div>
            <div className="intel-sub">Most triggered across phishing scans</div>
          </div>
        </div>
        {phishingScans.length === 0 ? (
          <p className="intel-empty">No phishing scans yet.</p>
        ) : (
          <div className="intel-list">
            {indicatorCounts.map(ind => (
              <div key={ind.key} className="intel-row">
                <span className="intel-row-label">{ind.label}</span>
                <div className="intel-row-bar-wrap">
                  <div className="intel-row-bar">
                    <div
                      className="intel-row-fill"
                      style={{
                        width: `${pct(ind.count, phishingScans.length)}%`,
                        background: ind.count > 0 ? '#ef4444' : '#1e3a5f',
                      }}
                    />
                  </div>
                  <span className="intel-row-count">{ind.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Card 2: Highest Risk URLs ── */}
      <div className="intel-card">
        <div className="intel-card-head">
          <span className="intel-icon">🎯</span>
          <div>
            <div className="intel-title">Highest Risk Detections</div>
            <div className="intel-sub">Top 5 URLs by phishing confidence</div>
          </div>
        </div>
        {topRisk.length === 0 ? (
          <p className="intel-empty">No scans yet.</p>
        ) : (
          <div className="intel-list">
            {topRisk.map((s, i) => {
              const riskPct = Math.round(s.risk_score * 100)
              const color   = riskPct >= 70 ? '#ef4444' : riskPct >= 40 ? '#f59e0b' : '#10b981'
              return (
                <div key={s.id} className="intel-risk-row">
                  <span className="intel-rank">{i + 1}</span>
                  <div className="intel-risk-url" title={s.url}>{s.url}</div>
                  <span className="intel-risk-pct" style={{ color }}>{riskPct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Card 3: TLD Distribution ── */}
      <div className="intel-card">
        <div className="intel-card-head">
          <span className="intel-icon">🌐</span>
          <div>
            <div className="intel-title">Domain Pattern Analysis</div>
            <div className="intel-sub">TLD frequency &amp; average risk</div>
          </div>
        </div>
        {tldStats.length === 0 ? (
          <p className="intel-empty">No scans yet.</p>
        ) : (
          <div className="tld-chips">
            {tldStats.map(t => {
              const color = t.avgRisk >= 70 ? '#ef4444' : t.avgRisk >= 40 ? '#f59e0b' : '#10b981'
              return (
                <div key={t.tld} className="tld-chip">
                  <span className="tld-name">{t.tld}</span>
                  <span className="tld-count">{t.count} scan{t.count !== 1 ? 's' : ''}</span>
                  <span className="tld-risk" style={{ color }}>{t.avgRisk}% avg risk</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
