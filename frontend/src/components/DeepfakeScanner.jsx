/**
 * DeepfakeScanner.jsx
 * -------------------
 * Upload and analyze media files (video/audio) for deepfake detection.
 * Mirrors the structure of MessageScanner.
 */
import { useState } from 'react'

const API_URL = 'http://localhost:5001'

export default function DeepfakeScanner({ onResult }) {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg']

      if (!validTypes.some(type => selectedFile.type.startsWith(type.split('/')[0]))) {
        setError('Please upload a valid video or audio file (MP4, WebM, MOV, MP3, WAV, OGG)')
        return
      }

      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('File size must be under 500MB')
        return
      }

      setFile(selectedFile)
      setFileName(selectedFile.name)
      setError('')
      setResult(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Please select a file to analyze.')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/analyze-deepfake`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Server error')
        return
      }
      setResult(data)
      onResult(data)
      setFile(null)
      setFileName('')
    } catch {
      setError('Could not connect to backend. Is Flask running on port 5001?')
    } finally {
      setLoading(false)
    }
  }

  const riskPct  = result ? (result.risk_pct ?? Math.round(result.final_score * 100)) : 0
  const verdict  = result?.verdict   // use backend verdict directly — thresholds: >=65 Deepfake, >=35 Uncertain, else Real
  const color    = verdict === 'Deepfake' ? '#ef4444' : verdict === 'Uncertain' ? '#f59e0b' : '#10b981'

  return (
    <div className="scanner-card">
      <div className="scanner-head">
        <div>
          <div className="scanner-title">Analyze Media File</div>
          <div className="scanner-sub">
            Upload any video or audio file — AI model will detect deepfakes in real-time
          </div>
        </div>
        <span className="scanner-badge">🎬 DeepfakeDetector</span>
      </div>

      <form className="scanner-form" onSubmit={handleSubmit}>
        <div className="file-input-wrapper">
          <label className="file-input-label">
            <div className="file-input-icon">📁</div>
            <div className="file-input-text">
              {fileName ? (
                <>
                  <div className="file-name">{fileName}</div>
                  <div className="file-hint">Click to change file</div>
                </>
              ) : (
                <>
                  <div className="file-hint">Click to upload or drag & drop</div>
                  <div className="file-types">Supported: MP4, WebM, MOV, MP3, WAV, OGG (max 500MB)</div>
                </>
              )}
            </div>
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        <button type="submit" className="scanner-btn" disabled={loading || !file}>
          {loading ? (
            <><span className="spinner" /> Analyzing…</>
          ) : 'Analyze Media →'}
        </button>
      </form>

      {error && <div className="scanner-error">⚠️ {error}</div>}

      {/* Inline result card */}
      {result && (
        <div className="df-result">
          {/* Score + verdict row */}
          <div className="df-result-header">
            <div className="df-score-circle" style={{ borderColor: color }}>
              <span className="df-score-pct" style={{ color }}>{riskPct}%</span>
            </div>
            <div className="df-verdict-block">
              <div className="df-verdict-label" style={{ color }}>
                {verdict === 'Deepfake' ? '🚨 Deepfake Detected' : verdict === 'Uncertain' ? '⚠️ Uncertain' : '✅ Authentic Media'}
              </div>
              <div className="df-verdict-sub">
                {result.file_type === 'video' ? 'Video Analysis' : 'Audio Analysis'}
              </div>
            </div>
          </div>

          {/* Confidence and file info */}
          {result.confidence && (
            <div className="df-info-row">
              <span className="df-info-label">Confidence:</span>
              <span className="df-info-value">{result.confidence}</span>
            </div>
          )}

          {/* Explanations/findings */}
          {result.explanations && result.explanations.length > 0 && (
            <div className="df-findings-block">
              <div className="df-findings-title">KEY FINDINGS</div>
              {result.explanations.map((expl, i) => (
                <div key={i} className="df-finding-item">• {expl}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
