/**
 * ActivityLog.jsx
 * ---------------
 * Enhanced scan history table with:
 *   - Search bar (URL substring match)
 *   - Status filter dropdown (All / Safe / Suspicious / Phishing)
 *   - Date-range filter (All Time / Today / Last 3 Days / Last 7 Days)
 *   - Column sorting: Risk Score, Timestamp  (click header to toggle asc/desc)
 *   - Coloured status badges
 *   - Risk-score progress bar
 *   - Hover highlight
 *   - Row click → opens ScanModal (via onSelect callback)
 */
import { useState, useMemo } from 'react'

function StatusBadge({ status }) {
  const cls =
    status === 'Phishing'   ? 'badge-red'    :
    status === 'Suspicious' ? 'badge-yellow' : 'badge-green'
  const icon =
    status === 'Phishing'   ? '🚨' :
    status === 'Suspicious' ? '⚠️' : '✅'
  return <span className={`tbl-badge ${cls}`}>{icon} {status}</span>
}

function SevBadge({ sev }) {
  if (!sev || sev === 'None') return <span className="tbl-no-sev">—</span>
  const cls = sev === 'High' ? 'sev-high' : sev === 'Medium' ? 'sev-med' : 'sev-low'
  return <span className={`sev-badge ${cls}`}>{sev}</span>
}

function ThreatTags({ securityAnalysis }) {
  if (!securityAnalysis || securityAnalysis.length === 0)
    return <span className="tbl-no-sev">—</span>
  // collect unique attack types from top 2 highest-severity entries
  const top = securityAnalysis.slice(0, 2)
  const attacks = [...new Set(top.flatMap(e => e.possible_attacks))].slice(0, 2)
  return (
    <div className="threat-tags">
      {attacks.map(a => <span key={a} className="threat-tag">{a}</span>)}
    </div>
  )
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
    if (sortField !== field) return <span className="sort-icon neutral">⇅</span>
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const filtered = useMemo(() => {
    let rows = [...scans]
    if (search)    rows = rows.filter(s => s.url.toLowerCase().includes(search.toLowerCase()))
    if (status !== 'all') rows = rows.filter(s => s.status === status)
    rows = rows.filter(s => inRange(s.timestamp, dateRange))
    rows.sort((a, b) => {
      const va = sortField === 'risk_pct' ? a.risk_pct : new Date(a.timestamp).getTime()
      const vb = sortField === 'risk_pct' ? b.risk_pct : new Date(b.timestamp).getTime()
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return rows
  }, [scans, search, status, dateRange, sortField, sortDir])

  return (
    <div className="activity-card">
      {/* ── Toolbar ── */}
      <div className="activity-header">
        <div>
          <div className="chart-title">Activity Log</div>
          <div className="chart-sub">{filtered.length} of {scans.length} entries shown</div>
        </div>
        <div className="activity-controls">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="tbl-search"
              type="text"
              placeholder="Search URL…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="tbl-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Safe">✅ Safe</option>
            <option value="Suspicious">⚠️ Suspicious</option>
            <option value="Phishing">🚨 Phishing</option>
          </select>
          <select
            className="tbl-select"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="3days">Last 3 Days</option>
            <option value="7days">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="tbl-outer">
        <table className="activity-table">
          <thead>
            <tr>
              <th className="col-url">URL</th>
              <th className="col-status">Status</th>
              <th
                className="col-risk sortable"
                onClick={() => toggleSort('risk_pct')}
              >
                Risk Score {sortIcon('risk_pct')}
              </th>
              <th className="col-sev">Severity</th>
              <th className="col-threats">Top Threats</th>
              <th
                className="col-time sortable"
                onClick={() => toggleSort('timestamp')}
              >
                Timestamp {sortIcon('timestamp')}
              </th>
              <th className="col-action">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="tbl-empty">Loading scan history…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="tbl-empty">
                  {scans.length === 0 ? 'No scans yet — paste a URL above to run your first check.' : 'No results match your filters.'}
                </td>
              </tr>
            )}
            {filtered.map(s => (
              <tr
                key={s.id}
                className={`tbl-row ${s.status === 'Phishing' ? 'row-phishing' : s.status === 'Suspicious' ? 'row-suspicious' : ''}`}
                onClick={() => onSelect(s)}
              >
                <td className="col-url">
                  <span className="tbl-url" title={s.url}>{s.url}</span>
                </td>
                <td className="col-status">
                  <StatusBadge status={s.status} />
                </td>
                <td className="col-risk">
                  <RiskBar pct={s.risk_pct} />
                </td>
                <td className="col-sev">
                  <SevBadge sev={s.highest_severity} />
                </td>
                <td className="col-threats">
                  <ThreatTags securityAnalysis={s.security_analysis} />
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
                    onClick={e => { e.stopPropagation(); onSelect(s) }}
                  >
                    View →
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
