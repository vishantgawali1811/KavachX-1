/**
 * DistributionChart.jsx
 * ---------------------
 * Doughnut chart showing the proportion of Safe / Suspicious / Phishing
 * from all scans in history.
 *
 * A custom centre-text plugin renders the dominant threat level inside the ring.
 */
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

// ── Centre-text plugin ───────────────────────────────────────────────────────
const centreTextPlugin = {
  id: 'centreText',
  beforeDraw(chart) {
    const { ctx, data, chartArea } = chart
    if (!chartArea) return
    const cx = (chartArea.left + chartArea.right) / 2
    const cy = (chartArea.top + chartArea.bottom) / 2

    const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
    const phishing = data.datasets[0].data[2]
    const pct = total ? Math.round((phishing / total) * 100) : 0

    ctx.save()
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    ctx.font         = `700 28px Inter, system-ui, sans-serif`
    ctx.fillStyle    = pct >= 40 ? '#ef4444' : '#10b981'
    ctx.fillText(`${pct}%`, cx, cy - 10)

    ctx.font         = `500 11px Inter, system-ui, sans-serif`
    ctx.fillStyle    = '#64748b'
    ctx.fillText('PHISHING RATE', cx, cy + 14)

    ctx.restore()
  },
}

export default function DistributionChart({ scans }) {
  const total      = scans.length
  const safe       = scans.filter(s => s.status === 'Safe').length
  const suspicious = scans.filter(s => s.status === 'Suspicious').length
  const phishing   = scans.filter(s => s.status === 'Phishing').length

  const data = {
    labels: ['Safe', 'Suspicious', 'Phishing'],
    datasets: [
      {
        data: [safe, suspicious, phishing],
        backgroundColor: [
          'rgba(16,185,129,0.85)',
          'rgba(245,158,11,0.85)',
          'rgba(239,68,68,0.85)',
        ],
        borderColor: [
          'rgba(16,185,129,0.3)',
          'rgba(245,158,11,0.3)',
          'rgba(239,68,68,0.3)',
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(16,185,129,1)',
          'rgba(245,158,11,1)',
          'rgba(239,68,68,1)',
        ],
        hoverOffset: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { size: 12, family: 'Inter, sans-serif' },
          padding: 18,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: '#0d1525',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#1e3a5f',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0'
            return `  ${ctx.label}: ${ctx.parsed} (${pct}%)`
          },
        },
      },
    },
  }

  // Legend stats below chart
  const stats = [
    { label: 'Safe',       count: safe,       pct: total ? ((safe/total)*100).toFixed(1) : '—', color: '#10b981' },
    { label: 'Suspicious', count: suspicious, pct: total ? ((suspicious/total)*100).toFixed(1) : '—', color: '#f59e0b' },
    { label: 'Phishing',   count: phishing,   pct: total ? ((phishing/total)*100).toFixed(1) : '—', color: '#ef4444' },
  ]

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-title">Threat Distribution</div>
          <div className="chart-sub">Classification breakdown across all scans</div>
        </div>
      </div>
      <div className="chart-body donut-body">
        <Doughnut data={data} options={options} plugins={[centreTextPlugin]} />
      </div>
      <div className="dist-stats">
        {stats.map(s => (
          <div key={s.label} className="dist-stat-row">
            <span className="dist-dot" style={{ background: s.color }} />
            <span className="dist-label">{s.label}</span>
            <span className="dist-count">{s.count}</span>
            <span className="dist-pct">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
