/**
 * DeepfakeActivityLog.jsx
 * ----------------------
 * Scan history table for deepfake analysis results.
 * Mirrors MessageActivityLog.jsx but displays media filenames and deepfake verdicts.
 */
import { useState, useMemo } from 'react'

function VerdictBadge({ verdict }) {
  const cls =
    verdict === 'Deepfake'  ? 'badge-red'    :
    verdict === 'Uncertain' ? 'badge-yellow' : 'badge-green'
  const icon =
    verdict === 'Deepfake'  ? '🚨' :
    verdict === 'Uncertain' ? '⚠️' : '✅'
  return <span className={`tbl-badge ${cls}`}>{icon} {verdict}</span>
}

function RiskBar({ pct }) {
  const color =
    pct >= 65 ? '#ef4444' :
    pct >= 50 ? '#f59e0b' : '#10b981'
  return (
    <div className="risk-bar-wrap">
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="risk-bar-label" style={{ color }}>{pct}%</span>
    </div>
  )
}

function FileTypeChip({ fileType }) {
  const isVideo = fileType === 'video'
  const className = isVideo ? 'file-type-video' : 'file-type-audio'
  const icon = isVideo ? '🎬' : '🎵'
  return <span className={`file-type-chip ${className}`}>{icon} {isVideo ? 'Video' : 'Audio'}</span>
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

export default function DeepfakeActivityLog({ scans, onSelect, loading }) {
  const [search,    setSearch]    = useState('')
  const [verdict,   setVerdict]   = useState('all')
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
    if (search) rows = rows.filter(s =>
      (s.filename || '').toLowerCase().includes(search.toLowerCase())
    )
    if (verdict !== 'all') rows = rows.filter(s => s.verdict === verdict)
    rows = rows.filter(s => inRange(s.timestamp, dateRange))
    rows.sort((a, b) => {
      const va = sortField === 'risk_pct' ? (a.risk_pct ?? 0) : new Date(a.timestamp).getTime()
      const vb = sortField === 'risk_pct' ? (b.risk_pct ?? 0) : new Date(b.timestamp).getTime()
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return rows
  }, [scans, search, verdict, dateRange, sortField, sortDir])

  return (
    <div className="activity-card">
      {/* Toolbar */}
      <div className="activity-header">
        <div>
          <div className="chart-title">Media Scan Log</div>
          <div className="chart-sub">{filtered.length} of {scans.length} entries shown</div>
        </div>
        <div className="activity-controls">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="tbl-search"
              type="text"
              placeholder="Search filename..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="tbl-select" value={verdict} onChange={e => setVerdict(e.target.value)}>
            <option value="all">All Verdicts</option>
            <option value="Real">✅ Authentic</option>
            <option value="Uncertain">⚠️ Uncertain</option>
            <option value="Deepfake">🚨 Deepfake</option>
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
              <th className="col-filename">Filename</th>
              <th className="col-type">Type</th>
              <th className="col-verdict">Verdict</th>
              <th className="col-confidence sortable" onClick={() => toggleSort('risk_pct')}>
                Confidence {sortIcon('risk_pct')}
              </th>
              <th className="col-time sortable" onClick={() => toggleSort('timestamp')}>
                Timestamp {sortIcon('timestamp')}
              </th>
              <th className="col-action">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="tbl-empty">Loading media history...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="tbl-empty">
                  {scans.length === 0
                    ? 'No media scans yet — upload a file above to run your first check.'
                    : 'No results match your filters.'}
                </td>
              </tr>
            )}
            {filtered.map(s => (
              <tr
                key={s.id}
                className={`tbl-row ${s.verdict === 'Deepfake' ? 'row-deepfake' : s.verdict === 'Uncertain' ? 'row-uncertain' : ''}`}
                onClick={() => onSelect && onSelect(s)}
              >
                <td className="col-filename">
                  <span className="tbl-filename" title={s.filename}>
                    {s.filename}
                  </span>
                </td>
                <td className="col-type">
                  <FileTypeChip fileType={s.file_type} />
                </td>
                <td className="col-verdict">
                  <VerdictBadge verdict={s.verdict} />
                </td>
                <td className="col-confidence">
                  <RiskBar pct={s.risk_pct ?? Math.round((s.final_score ?? 0) * 100)} />
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
