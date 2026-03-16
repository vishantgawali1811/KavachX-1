import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function StatChart({ features }) {
  const labels = features.map(f => f.label)
  const maxVal = Math.max(...features.map(f => f.value), 1)
  const normalizedValues = features.map(f => parseFloat(((f.value / maxVal) * 100).toFixed(1)))
  const importances = features.map(f => parseFloat((f.importance * 100).toFixed(2)))

  // Dynamic height: 38px per feature row + 60px for legend/padding
  const chartHeight = features.length * 38 + 60

  const data = {
    labels,
    datasets: [
      {
        label: 'Normalised Value (%)',
        data: normalizedValues,
        backgroundColor: 'rgba(99,102,241,0.75)',
        borderColor: 'rgba(99,102,241,1)',
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.75,
      },
      {
        label: 'Model Importance (%)',
        data: importances,
        backgroundColor: 'rgba(236,72,153,0.75)',
        borderColor: 'rgba(236,72,153,1)',
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.75,
      },
    ],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          boxWidth: 12,
          boxHeight: 12,
          borderRadius: 3,
          usePointStyle: false,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0e1420',
        titleColor: '#f1f5f9',
        titleFont: { size: 12, weight: '600' },
        bodyColor: '#94a3b8',
        bodyFont: { size: 11 },
        borderColor: '#1e2d47',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const feat = features[ctx.dataIndex]
            if (ctx.datasetIndex === 0) return `  Value: ${feat.value}  (${ctx.parsed.x}% of max)`
            return `  Importance: ${ctx.parsed.x}%`
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(30,45,71,0.5)', drawTicks: false },
        border: { display: false },
        ticks: {
          color: '#475569',
          font: { size: 10, family: 'Inter, system-ui, sans-serif' },
          padding: 6,
          stepSize: 25,
        },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          padding: 12,
          crossAlign: 'far',
        },
      },
    },
    layout: {
      padding: { top: 4, right: 16, bottom: 4, left: 4 },
    },
  }

  return (
    <div className="stat-chart-wrap" style={{ height: `${chartHeight}px` }}>
      <Bar data={data} options={options} />
    </div>
  )
}
