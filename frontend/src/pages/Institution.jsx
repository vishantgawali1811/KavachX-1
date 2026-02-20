import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const TOP_INSTITUTIONS = [
  { name: 'IIT Mumbai', attacks: 142, risk: 92 },
  { name: 'Delhi University', attacks: 117, risk: 84 },
  { name: 'BITS Pilani', attacks: 98, risk: 76 },
  { name: 'VIT Vellore', attacks: 87, risk: 69 },
  { name: 'NIT Trichy', attacks: 74, risk: 61 },
  { name: 'Pune University', attacks: 63, risk: 55 },
]

const DANGEROUS_DOMAINS = [
  { domain: 'verify-scholarship.xyz', type: 'Scholarship Scam', score: 97 },
  { domain: 'iit-internship-portal.ml', type: 'Fake Internship', score: 94 },
  { domain: 'edu-kyc-update.tk', type: 'KYC Fraud', score: 91 },
  { domain: 'student-grant-india.ga', type: 'Grant Fraud', score: 88 },
  { domain: 'nit-placement-form.cf', type: 'Placement Scam', score: 86 },
]

const barData = {
  labels: TOP_INSTITUTIONS.map(i => i.name),
  datasets: [{
    label: 'Phishing Attacks',
    data: TOP_INSTITUTIONS.map(i => i.attacks),
    backgroundColor: 'rgba(255,59,59,0.65)',
    borderColor: 'rgba(255,59,59,0.9)',
    borderRadius: 5, borderSkipped: false,
  }],
}
const donutData = {
  labels: ['Internship Scams', 'Scholarship Fraud', 'Bank Phishing', 'Login Clones', 'Other'],
  datasets: [{ data: [31, 26, 21, 14, 8], backgroundColor: ['#ff3b3b','#ffb300','#00d4ff','#6366f1','#4f5e7b'], borderColor: '#04060f', borderWidth: 3 }],
}
const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#6b80a8', font: { size: 11 }, boxWidth: 10, padding: 14 } },
    tooltip: { backgroundColor: '#080c1a', titleColor: '#e8eeff', bodyColor: '#6b80a8', borderColor: '#172040', borderWidth: 1, cornerRadius: 8, padding: 12 },
  },
  scales: {
    x: { grid: { color: 'rgba(23,32,64,0.4)' }, ticks: { color: '#6b80a8', font: { size: 11 } } },
    y: { grid: { color: 'rgba(23,32,64,0.4)' }, ticks: { color: '#6b80a8', font: { size: 11 } } },
  },
}

export default function Institution() {
  return (
    <>
      {/* Summary */}
      <div className="stat-grid">
        {[
          { icon: '🏫', label: 'Institutions Monitored', value: '247',   cls: 'neon' },
          { icon: '🚨', label: 'Aggregate Attacks (7d)', value: '1,847', cls: 'red' },
          { icon: '⚡', label: 'Active Campaigns',       value: '34',    cls: 'yellow' },
          { icon: '✅', label: 'Neutralised Threats',    value: '1,613', cls: 'green' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <span className="stat-card-icon">{s.icon}</span>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="chart-grid" style={{ marginBottom: 24 }}>
        <div className="chart-panel">
          <div className="chart-panel-head">
            <div>
              <div className="chart-panel-title">Top Targeted Institutions</div>
              <div className="chart-panel-sub">Attack volume by institution</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Bar data={barData} options={CHART_OPTS} />
          </div>
        </div>
        <div className="chart-panel">
          <div className="chart-panel-head">
            <div>
              <div className="chart-panel-title">Attack Category Breakdown</div>
              <div className="chart-panel-sub">Proportion by scam type</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: CHART_OPTS.plugins }} />
          </div>
        </div>
      </div>

      {/* Geo heatmap placeholder */}
      <div className="chart-panel" style={{ marginBottom: 24 }}>
        <div className="chart-panel-head">
          <div>
            <div className="chart-panel-title">🗺 Geo Attack Heatmap — India</div>
            <div className="chart-panel-sub">Phishing attack concentration by region</div>
          </div>
          <span className="badge badge-neon">Live</span>
        </div>
        <div className="map-placeholder">
          <div className="map-bg" />
          <div className="map-placeholder-text" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>India Attack Heatmap</div>
            <div style={{ fontSize: '0.78rem', maxWidth: 300 }}>
              Hotspots: Mumbai, Delhi, Bengaluru, Hyderabad, Pune<br />
              <span style={{ color: 'var(--red2)' }}>▲ High risk </span>
              <span style={{ color: 'var(--yellow)' }}>■ Medium </span>
              <span style={{ color: 'var(--green)' }}>● Low risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Most dangerous domains */}
      <div className="data-table-wrap" style={{ marginBottom: 24 }}>
        <div className="data-table-header">
          <div className="data-table-title">☠ Most Dangerous Domains This Week</div>
          <button className="btn btn-outline btn-sm">⬇ Monthly Report (PDF)</button>
        </div>
        <table>
          <thead><tr><th>#</th><th>Domain</th><th>Scam Type</th><th>Risk Score</th><th>Status</th></tr></thead>
          <tbody>
            {DANGEROUS_DOMAINS.map((d, i) => (
              <tr key={d.domain}>
                <td style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{i + 1}</td>
                <td><div className="td-url" title={d.domain}>{d.domain}</div></td>
                <td><span className="badge badge-phishing">{d.type}</span></td>
                <td>
                  <div className="td-score-bar">
                    <span style={{ fontWeight: 700, color: 'var(--red2)', minWidth: 36 }}>{d.score}%</span>
                    <div className="score-bar-track"><div className="score-bar-fill score-high" style={{ width: `${d.score}%` }} /></div>
                  </div>
                </td>
                <td><span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--red2)', background: 'var(--red-bg)', padding: '3px 10px', borderRadius: 5, border: '1px solid var(--red-bdr)' }}>🚫 Blocked</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risk intensity meter */}
      <div className="card">
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>📈 Overall Threat Intensity — This Month</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60, marginBottom: 10 }}>
          {[45, 62, 48, 71, 55, 83, 67, 78, 91, 74, 88, 95, 82, 76, 88, 92, 85, 73, 89, 94].map((v, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 3,
              height: `${v}%`,
              background: v >= 80 ? 'rgba(255,59,59,0.7)' : v >= 60 ? 'rgba(255,179,0,0.7)' : 'rgba(0,212,255,0.5)',
              minWidth: 4,
            }} title={`${v}% intensity`} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>Feb 1</span><span>Feb 10</span><span>Feb 20</span>
        </div>
      </div>
    </>
  )
}
