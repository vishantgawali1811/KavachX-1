/**
 * TrendChart.jsx
 * --------------
 * Area-line chart showing phishing activity over the last 7 days.
 * Buckets scan history by calendar date and plots three series:
 *   Phishing (red) | Suspicious (yellow) | Safe (green)
 *
 * Uses Chart.js via react-chartjs-2 (already a project dependency).
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  return days
}

function dateLabel(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TrendChart({ scans }) {
  const labels = getLast7Days()

  const bucket = (status) =>
    labels.map(lbl => scans.filter(s => s.status === status && dateLabel(s.timestamp) === lbl).length)

  const phishingData   = bucket('Phishing')
  const suspiciousData = bucket('Suspicious')
  const safeData       = bucket('Safe')

  const data = {
    labels,
    datasets: [
      {
        label: 'Phishing',
        data: phishingData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.12)',
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#080e1c',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
      {
        label: 'Suspicious',
        data: suspiciousData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.07)',
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#080e1c',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
      {
        label: 'Safe',
        data: safeData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.07)',
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#080e1c',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#64748b',
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 3,
          padding: 18,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: '#0d1525',
        titleColor: '#e2e8f0',
        titleFont: { size: 12, weight: '600', family: 'Inter, sans-serif' },
        bodyColor: '#94a3b8',
        bodyFont: { size: 11, family: 'Inter, sans-serif' },
        borderColor: '#1e3a5f',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(30,58,95,0.4)', drawTicks: false },
        border: { display: false },
        ticks: {
          color: '#475569',
          font: { size: 11, family: 'Inter, sans-serif' },
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#475569',
          font: { size: 11, family: 'Inter, sans-serif' },
          padding: 10,
        },
        grid: { color: 'rgba(30,58,95,0.4)', drawTicks: false },
        border: { display: false },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-title">Risk Trend — Last 7 Days</div>
          <div className="chart-sub">Daily detection breakdown by threat level</div>
        </div>
        <span className="live-dot" title="Live data" />
      </div>
      <div className="chart-body">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
