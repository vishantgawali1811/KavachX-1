import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#6b80a8', font: { size: 11, family: 'Inter, sans-serif' }, boxWidth: 10, padding: 16 } },
    tooltip: {
      backgroundColor: '#080c1a', titleColor: '#e8eeff', bodyColor: '#6b80a8',
      borderColor: '#172040', borderWidth: 1, padding: 12, cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { color: 'rgba(23,32,64,0.5)' }, ticks: { color: '#6b80a8', font: { size: 11 } } },
    y: { grid: { color: 'rgba(23,32,64,0.5)' }, ticks: { color: '#6b80a8', font: { size: 11 } } },
  },
}

const DAYS = ['Feb 14', 'Feb 15', 'Feb 16', 'Feb 17', 'Feb 18', 'Feb 19', 'Feb 20']

const lineData = {
  labels: DAYS,
  datasets: [
    {
      label: 'Phishing URLs',
      data: [12, 19, 14, 28, 22, 31, 18],
      borderColor: '#ff3b3b', backgroundColor: 'rgba(255,59,59,0.1)',
      fill: true, tension: 0.4, pointBackgroundColor: '#ff3b3b', pointRadius: 4,
    },
    {
      label: 'Suspicious URLs',
      data: [6, 9, 11, 14, 8, 17, 10],
      borderColor: '#ffb300', backgroundColor: 'rgba(255,179,0,0.08)',
      fill: true, tension: 0.4, pointBackgroundColor: '#ffb300', pointRadius: 4,
    },
    {
      label: 'Safe URLs',
      data: [34, 42, 38, 29, 46, 40, 35],
      borderColor: '#00e676', backgroundColor: 'rgba(0,230,118,0.06)',
      fill: true, tension: 0.4, pointBackgroundColor: '#00e676', pointRadius: 4,
    },
  ],
}

const doughnutData = {
  labels: ['Legitimate', 'Phishing', 'Suspicious'],
  datasets: [{
    data: [62, 28, 10],
    backgroundColor: ['rgba(0,230,118,0.8)', 'rgba(255,59,59,0.8)', 'rgba(255,179,0,0.8)'],
    borderColor: '#04060f', borderWidth: 3,
  }],
}

const keywordsData = {
  labels: ['verify', 'secure', 'login', 'confirm', 'update', 'bank', 'urgent', 'account'],
  datasets: [{
    label: 'Occurrences',
    data: [48, 41, 37, 34, 28, 24, 22, 19],
    backgroundColor: 'rgba(0,212,255,0.6)',
    borderColor: 'rgba(0,212,255,0.9)',
    borderRadius: 5, borderSkipped: false,
  }],
}

const domainData = {
  labels: ['.xyz', '.ml', '.tk', '.ga', '.cf', '.gq'],
  datasets: [{
    label: 'Phishing Domains',
    data: [32, 27, 22, 18, 15, 12],
    backgroundColor: 'rgba(255,59,59,0.65)',
    borderColor: 'rgba(255,59,59,0.9)',
    borderRadius: 5, borderSkipped: false,
  }],
}

const noScale = { responsive: true, maintainAspectRatio: false, plugins: CHART_OPTS.plugins }

export default function Analytics() {
  return (
    <>
      {/* Summary cards */}
      <div className="stat-grid">
        {[
          { icon: '🔍', label: 'Total Scanned', value: '1,247',  cls: 'neon',   change: '+12% this week', up: false },
          { icon: '🚨', label: 'Phishing Detected', value: '348', cls: 'red',  change: '+8% vs last week', up: true },
          { icon: '⚡', label: 'Suspicious', value: '124',        cls: 'yellow', change: '+3% vs last week', up: true },
          { icon: '✅', label: 'Safe Scans', value: '775',        cls: 'green',  change: '+5% this week', up: false },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <span className="stat-card-icon">{s.icon}</span>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
            <span className={`stat-card-change ${s.up ? 'change-up' : 'change-down'}`}>
              {s.up ? '↑' : '↓'} {s.change}
            </span>
          </div>
        ))}
      </div>

      {/* Line chart - full width */}
      <div className="chart-panel" style={{ marginBottom: 20 }}>
        <div className="chart-panel-head">
          <div>
            <div className="chart-panel-title">Daily Phishing Trend</div>
            <div className="chart-panel-sub">URL scan results over the past 7 days</div>
          </div>
          <span className="badge badge-neon">Last 7 days</span>
        </div>
        <div style={{ height: 220 }}>
          <Line data={lineData} options={CHART_OPTS} />
        </div>
      </div>

      {/* Pie + Keywords */}
      <div className="chart-grid" style={{ marginBottom: 20 }}>
        <div className="chart-panel">
          <div className="chart-panel-head">
            <div>
              <div className="chart-panel-title">Classification Split</div>
              <div className="chart-panel-sub">Safe vs Phishing vs Suspicious</div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <Doughnut data={doughnutData} options={noScale} />
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-head">
            <div>
              <div className="chart-panel-title">Top Phishing Keywords</div>
              <div className="chart-panel-sub">Most common suspicious words detected</div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <Bar data={keywordsData} options={{ ...CHART_OPTS, indexAxis: 'y' }} />
          </div>
        </div>
      </div>

      {/* Domain targeting breakdown */}
      <div className="chart-panel" style={{ marginBottom: 20 }}>
        <div className="chart-panel-head">
          <div>
            <div className="chart-panel-title">Most Abused TLDs</div>
            <div className="chart-panel-sub">Top-level domains most exploited in phishing campains</div>
          </div>
        </div>
        <div style={{ height: 200 }}>
          <Bar data={domainData} options={CHART_OPTS} />
        </div>
      </div>

      {/* Top threats table */}
      <div className="data-table-wrap">
        <div className="data-table-header">
          <div className="data-table-title">🎯 Top Targeted Categories</div>
        </div>
        <table>
          <thead><tr><th>Category</th><th>Detected</th><th>% of Attacks</th><th>Trend</th></tr></thead>
          <tbody>
            {[
              { cat: 'Fake Internship Portals',          n: 98,  pct: 28, trend: '↑ Rising' },
              { cat: 'Scholarship / Government Forms',   n: 76,  pct: 22, trend: '↑ Rising' },
              { cat: 'Bank & UPI KYC Scams',            n: 68,  pct: 20, trend: '→ Stable' },
              { cat: 'Social Media Login Clones',        n: 54,  pct: 16, trend: '↑ Rising' },
              { cat: 'OTP & SMS Phishing',               n: 34,  pct:  9, trend: '↓ Falling' },
              { cat: 'E-commerce Fake Offers',           n: 18,  pct:  5, trend: '→ Stable' },
            ].map(r => (
              <tr key={r.cat}>
                <td style={{ fontWeight: 500 }}>{r.cat}</td>
                <td style={{ fontWeight: 700, color: 'var(--red2)' }}>{r.n}</td>
                <td>
                  <div className="td-score-bar">
                    <span style={{ minWidth: 36, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.pct}%</span>
                    <div className="score-bar-track" style={{ maxWidth: 120 }}>
                      <div className="score-bar-fill score-high" style={{ width: `${r.pct * 3}%` }} />
                    </div>
                  </div>
                </td>
                <td><span style={{
                  fontSize: '0.78rem', fontWeight: 600,
                  color: r.trend.startsWith('↑') ? 'var(--red2)' : r.trend.startsWith('↓') ? 'var(--green)' : 'var(--text-muted)',
                }}>{r.trend}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
