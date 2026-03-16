/**
 * MessageActivityLog.jsx
 * ----------------------
 * Scan history table for phishing message analysis results.
 * Mirrors ActivityLog.jsx but displays message snippets instead of URLs.
 */
import { useState, useMemo } from 'react'

function StatusBadge({ status }) {
  const cls =
    status === 'Phishing'   ? 'badge-red'    :
    status === 'Suspicious' ? 'badge-yellow' : 'badge-green'
  const icon =
    status === 'Phishing'   ? '\uD83D\uDEA8' :
    status === 'Suspicious' ? '\u26A0\uFE0F' : '\u2705'
  return <span className={`tbl-badge ${cls}`}>{icon} {status}</span>
}

function RiskBar({ pct }) {
  const color =
    pct >= 70 ? '#ef4444' :
    pct >= 40 ? '#f59e0b' : '#10b981'
  return (
    <div className="risk-bar-wrap">
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="risk-bar-label" style={{ color }}>{pct}%</span>
    </div>
  )
}

function IndicatorChips({ indicators }) {
  if (!indicators) return <span className="tbl-no-sev">&mdash;</span>
  const chips = []
  if (indicators.urgency) chips.push('Urgency')
  if (indicators.credential_request) chips.push('Credential')
  if (indicators.impersonation) chips.push('Impersonation')
  if (indicators.financial_scam) chips.push('Financial')
  if (indicators.suspicious_links?.length) chips.push('Bad Links')
  if (indicators.ai_generated) chips.push('AI-Gen')
  if (chips.length === 0) return <span className="tbl-no-sev">&mdash;</span>
  return (
    <div className="threat-tags">
      {chips.slice(0, 2).map(c => <span key={c} className="threat-tag">{c}</span>)}
    </div>
  )
}

const DAY_MS = 86_400_000

function inRange(iso, range) {
  const t = new Date(iso).getTime()
  const now = Date.now()
  if (range === 'today')  return t >= now - DAY_MS
  if (range === '3days')  return t >= now - 3 * DAY_MS
  if (range === '7days')  return t >= now - 7 * DAY_MS
  return true
}

export default function MessageActivityLog({ scans, onSelect, loading }) {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [sortField, setSortField] = useState('timestamp')
  const [sortDir,   setSortDir]   = useState('desc')

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sortIcon = (field) => {
    if (sortField !== field) return <span className="sort-icon neutral">{'\u21C5'}</span>
    return <span className="sort-icon active">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
  }

  const filtered = useMemo(() => {
    let rows = [...scans]
    if (search) rows = rows.filter(s =>
      (s.message_snippet || '').toLowerCase().includes(search.toLowerCase())
    )
    if (status !== 'all') rows = rows.filter(s => s.status === status)
    rows = rows.filter(s => inRange(s.timestamp, dateRange))
    rows.sort((a, b) => {
      const va = sortField === 'risk_pct' ? (a.risk_pct ?? 0) : new Date(a.timestamp).getTime()
      const vb = sortField === 'risk_pct' ? (b.risk_pct ?? 0) : new Date(b.timestamp).getTime()
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return rows
  }, [scans, search, status, dateRange, sortField, sortDir])

  return (
    <div className="activity-card">
      {/* Toolbar */}
      <div className="activity-header">
        <div>
          <div className="chart-title">Message Scan Log</div>
          <div className="chart-sub">{filtered.length} of {scans.length} entries shown</div>
        </div>
        <div className="activity-controls">
          <div className="search-wrap">
            <span className="search-icon">{'\uD83D\uDD0D'}</span>
            <input
              className="tbl-search"
              type="text"
              placeholder="Search message..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="tbl-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Safe">{'\u2705'} Safe</option>
            <option value="Suspicious">{'\u26A0\uFE0F'} Suspicious</option>
            <option value="Phishing">{'\uD83D\uDEA8'} Phishing</option>
          </select>
          <select className="tbl-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="3days">Last 3 Days</option>
            <option value="7days">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="tbl-outer">
        <table className="activity-table">
          <thead>
            <tr>
              <th className="col-msg">Message</th>
              <th className="col-status">Status</th>
              <th className="col-risk sortable" onClick={() => toggleSort('risk_pct')}>
                Risk Score {sortIcon('risk_pct')}
              </th>
              <th className="col-indicators">Indicators</th>
              <th className="col-time sortable" onClick={() => toggleSort('timestamp')}>
                Timestamp {sortIcon('timestamp')}
              </th>
              <th className="col-action">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="tbl-empty">Loading message history...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="tbl-empty">
                  {scans.length === 0
                    ? 'No message scans yet \u2014 paste a message above to run your first check.'
                    : 'No results match your filters.'}
                </td>
              </tr>
            )}
            {filtered.map(s => (
              <tr
                key={s.id}
                className={`tbl-row ${s.status === 'Phishing' ? 'row-phishing' : s.status === 'Suspicious' ? 'row-suspicious' : ''}`}
                onClick={() => onSelect && onSelect(s)}
              >
                <td className="col-msg">
                  <span className="tbl-msg-snippet" title={s.message_snippet}>
                    {s.message_snippet}
                  </span>
                </td>
                <td className="col-status">
                  <StatusBadge status={s.status} />
                </td>
                <td className="col-risk">
                  <RiskBar pct={s.risk_pct ?? Math.round((s.risk_score ?? 0) * 100)} />
                </td>
                <td className="col-indicators">
                  <IndicatorChips indicators={s.indicators} />
                </td>
                <td className="col-time">
                  <span className="tbl-time">
                    {new Date(s.timestamp).toLocaleString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </td>
                <td className="col-action">
                  <button
                    className="view-btn"
                    onClick={e => { e.stopPropagation(); onSelect && onSelect(s) }}
                  >
                    View {'\u2192'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
