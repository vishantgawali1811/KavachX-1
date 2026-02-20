import { useState } from 'react'

const MOCK_HISTORY = [
  { id: 1, url: 'https://verify-account.net/secure/login',          score: 92, label: 'phishing',    date: '2026-02-20 13:12', action: 'Blocked' },
  { id: 2, url: 'https://scholarship-apply-now.xyz/form',           score: 87, label: 'phishing',    date: '2026-02-20 12:55', action: 'Blocked' },
  { id: 3, url: 'https://internship-portal-2025.ml/apply',          score: 81, label: 'phishing',    date: '2026-02-20 12:30', action: 'Blocked' },
  { id: 4, url: 'https://www.google.com',                           score:  8, label: 'legitimate',  date: '2026-02-20 12:15', action: 'Allowed' },
  { id: 5, url: 'https://bit.ly/3xKpMrQ',                           score: 61, label: 'suspicious',  date: '2026-02-20 11:50', action: 'Warned' },
  { id: 6, url: 'https://github.com/vishantgawali1811',             score:  4, label: 'legitimate',  date: '2026-02-20 11:40', action: 'Allowed' },
  { id: 7, url: 'http://confirm-kyc-update.tk/bank',                score: 96, label: 'phishing',    date: '2026-02-20 11:20', action: 'Blocked' },
  { id: 8, url: 'https://www.linkedin.com/in/vishant',              score:  6, label: 'legitimate',  date: '2026-02-20 10:58', action: 'Allowed' },
  { id: 9, url: 'https://0tp-verify.page.link/UPI',                 score: 89, label: 'phishing',    date: '2026-02-20 10:40', action: 'Blocked' },
  { id: 10, url: 'https://stackoverflow.com/questions',            score:  3, label: 'legitimate',  date: '2026-02-20 10:20', action: 'Allowed' },
]

function ScoreBadge({ score, label }) {
  const cls = label === 'phishing' ? 'badge-phishing' : label === 'suspicious' ? 'badge-suspicious' : 'badge-safe'
  return <span className={`badge ${cls}`}>{label === 'phishing' ? '🚨' : label === 'suspicious' ? '⚡' : '✅'} {label}</span>
}

function ScoreBar({ score }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-med' : 'score-low'
  const color = score >= 70 ? 'var(--red2)' : score >= 40 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div className="td-score-bar">
      <span style={{ fontWeight: 700, fontSize: '0.87rem', color, minWidth: 36 }}>{score}%</span>
      <div className="score-bar-track">
        <div className={`score-bar-fill ${cls}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function ScanHistory() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')

  const filtered = MOCK_HISTORY.filter(r => {
    const matchSearch = r.url.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || r.label === filter
    return matchSearch && matchFilter
  })

  const exportCSV = () => {
    const csv = ['URL,Score,Label,Date,Action',
      ...filtered.map(r => `"${r.url}",${r.score},${r.label},${r.date},${r.action}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kavachx_scan_history.csv'
    a.click()
  }

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Scanned', value: MOCK_HISTORY.length, cls: 'neon' },
          { label: 'Phishing Blocked', value: MOCK_HISTORY.filter(r=>r.label==='phishing').length, cls: 'red' },
          { label: 'Suspicious', value: MOCK_HISTORY.filter(r=>r.label==='suspicious').length, cls: 'yellow' },
          { label: 'Safe Allowed', value: MOCK_HISTORY.filter(r=>r.label==='legitimate').length, cls: 'green' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="data-table-wrap">
        <div className="data-table-header">
          <div className="data-table-title">Scan History</div>
          <div className="data-table-controls">
            <div className="data-table-search">
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input placeholder="Search URL…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.84rem', cursor: 'pointer' }}
            >
              <option value="all">All Results</option>
              <option value="phishing">Phishing</option>
              <option value="suspicious">Suspicious</option>
              <option value="legitimate">Legitimate</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>Risk Score</th>
              <th>Classification</th>
              <th>Date & Time</th>
              <th>Action Taken</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row.id}>
                <td style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{i + 1}</td>
                <td><div className="td-url" title={row.url}>{row.url}</div></td>
                <td><ScoreBar score={row.score} /></td>
                <td><ScoreBadge score={row.score} label={row.label} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{row.date}</td>
                <td>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: row.action === 'Blocked' ? 'var(--red-bg)' : row.action === 'Warned' ? 'var(--yellow-bg)' : 'var(--green-bg)',
                    color: row.action === 'Blocked' ? 'var(--red2)' : row.action === 'Warned' ? 'var(--yellow)' : 'var(--green)',
                    border: `1px solid ${row.action === 'Blocked' ? 'var(--red-bdr)' : row.action === 'Warned' ? 'var(--yellow-bdr)' : 'var(--green-bdr)'}`,
                  }}>{row.action}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>No results match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
