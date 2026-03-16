/**
 * ActivityLog.jsx — Deepfake Detective scan history table
 */
import { useState, useMemo } from 'react'

function VerdictBadge({ verdict }) {
  const cls = verdict === 'Deepfake' ? 'badge-red' : verdict === 'Uncertain' ? 'badge-yellow' : 'badge-green'
  const icon = verdict === 'Deepfake' ? '\uD83D\uDEA8' : verdict === 'Uncertain' ? '\u26A0\uFE0F' : '\u2705'
  return <span className={`tbl-badge ${cls}`}>{icon} {verdict}</span>
}

function RiskBar({ pct }) {
  const color = pct >= 65 ? '#ef4444' : pct >= 35 ? '#f59e0b' : '#10b981'
  return (
    <div className="risk-bar-wrap">
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="risk-bar-label" style={{ color }}>{pct}%</span>
    </div>
  )
}

function TypeBadge({ type }) {
  return (
    <span className={`type-badge ${type === 'video' ? 'type-video' : 'type-audio'}`}>
      {type === 'video' ? '\uD83C\uDFA5' : '\uD83C\uDFA4'} {type}
    </span>
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

export default function ActivityLog({ scans, onSelect, loading }) {
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
    if (search) rows = rows.filter(s => (s.filename || '').toLowerCase().includes(search.toLowerCase()))
    if (status !== 'all') rows = rows.filter(s => s.verdict === status)
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
      <div className="activity-header">
        <div>
          <div className="chart-title">Scan History</div>
          <div className="chart-sub">{filtered.length} of {scans.length} entries shown</div>
        </div>
        <div className="activity-controls">
          <div className="search-wrap">
            <span className="search-icon">{'\uD83D\uDD0D'}</span>
            <input
              className="tbl-search"
              type="text"
              placeholder="Search filename..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="tbl-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All Verdicts</option>
            <option value="Real">{'\u2705'} Real</option>
            <option value="Uncertain">{'\u26A0\uFE0F'} Uncertain</option>
            <option value="Deepfake">{'\uD83D\uDEA8'} Deepfake</option>
          </select>
          <select className="tbl-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="3days">Last 3 Days</option>
            <option value="7days">Last 7 Days</option>
          </select>
        </div>
      </div>

      <div className="tbl-outer">
        <table className="activity-table">
          <thead>
            <tr>
              <th className="col-file">File</th>
              <th className="col-type">Type</th>
              <th className="col-status">Verdict</th>
              <th className="col-risk sortable" onClick={() => toggleSort('risk_pct')}>
                Risk Score {sortIcon('risk_pct')}
              </th>
              <th className="col-confidence">Confidence</th>
              <th className="col-time sortable" onClick={() => toggleSort('timestamp')}>
                Timestamp {sortIcon('timestamp')}
              </th>
              <th className="col-action">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="tbl-empty">Loading scan history...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="tbl-empty">
                {scans.length === 0 ? 'No scans yet — upload a file above to run your first analysis.' : 'No results match your filters.'}
              </td></tr>
            )}
            {filtered.map(s => (
              <tr
                key={s.id}
                className={`tbl-row ${s.verdict === 'Deepfake' ? 'row-deepfake' : s.verdict === 'Uncertain' ? 'row-uncertain' : ''}`}
                onClick={() => onSelect(s)}
              >
                <td className="col-file">
                  <span className="tbl-filename" title={s.filename}>{s.filename || 'Unknown'}</span>
                </td>
                <td className="col-type"><TypeBadge type={s.file_type} /></td>
                <td className="col-status"><VerdictBadge verdict={s.verdict} /></td>
                <td className="col-risk"><RiskBar pct={s.risk_pct ?? 0} /></td>
                <td className="col-confidence">
                  <span className="tbl-confidence">{s.confidence || '—'}</span>
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
                  <button className="view-btn" onClick={e => { e.stopPropagation(); onSelect(s) }}>
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
