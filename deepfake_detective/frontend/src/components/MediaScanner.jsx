/**
 * MediaScanner.jsx — upload and analyze media files
 */
import { useState, useRef } from 'react'

const API_URL = 'http://localhost:5002'

export default function MediaScanner({ onResult }) {
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    setFile(f)
    setError('')
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setError('')
    setResult(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Server error'); return }
      setResult(data)
      onResult(data)
    } catch {
      setError('Could not connect to backend. Is Flask running on port 5002?')
    } finally {
      setLoading(false)
    }
  }

  const pct   = result ? result.risk_pct : 0
  const color = pct >= 65 ? '#ef4444' : pct >= 35 ? '#f59e0b' : '#10b981'

  return (
    <div className="scanner-card">
      <div className="scanner-head">
        <div>
          <div className="scanner-title">Analyze Media</div>
          <div className="scanner-sub">Upload a video or audio file — AI models will classify it in real-time</div>
        </div>
        <span className="scanner-badge">{'\uD83E\uDDE0'} MesoInception4 + AudioCNN</span>
      </div>

      <form className="media-scanner-form" onSubmit={handleSubmit}>
        {!file ? (
          <div
            className="drop-zone-dash"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
            onDrop={handleDrop}
          >
            <div className="drop-icon-dash">{'\uD83D\uDCC1'}</div>
            <div className="drop-text-dash">Drop a video or audio file here, or click to browse</div>
            <div className="drop-sub-dash">MP4, AVI, MOV, WAV, MP3, FLAC &bull; Max 50MB</div>
            <input
              ref={inputRef}
              type="file"
              accept="video/*,audio/*"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files.length) handleFile(e.target.files[0]) }}
            />
          </div>
        ) : (
          <div className="file-selected-dash">
            <div className="file-info-dash">
              <span className="file-icon-dash">{file.type?.startsWith('video') ? '\uD83C\uDFA5' : '\uD83C\uDFA4'}</span>
              <div>
                <div className="file-name-dash">{file.name}</div>
                <div className="file-size-dash">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
            <button type="button" className="file-remove-dash" onClick={() => { setFile(null); setResult(null) }}>{'\u2715'}</button>
          </div>
        )}

        <button type="submit" className="scanner-btn" disabled={loading || !file}>
          {loading ? <><span className="spinner" /> Analyzing...</> : 'Analyze Media \u2192'}
        </button>
      </form>

      {error && <div className="scanner-error">{'\u26A0\uFE0F'} {error}</div>}

      {/* Inline result card */}
      {result && (
        <div className="media-result">
          <div className="media-result-header">
            <div className="media-score-circle" style={{ borderColor: color }}>
              <span className="media-score-pct" style={{ color }}>{pct}%</span>
            </div>
            <div className="media-verdict-block">
              <div className="media-verdict-label" style={{ color }}>
                {result.verdict === 'Deepfake' ? '\uD83D\uDEA8 Deepfake Detected' :
                 result.verdict === 'Uncertain' ? '\u26A0\uFE0F Uncertain — Review Needed' :
                 '\u2705 Authentic Media'}
              </div>
              <div className="media-verdict-sub">
                {result.file_type === 'video' ? 'MesoInception4 + MC Dropout' : 'Audio CNN + Heuristics'}
                {result.confidence && ` | Confidence: ${result.confidence}`}
              </div>
            </div>
          </div>

          {/* Heatmap + Original toggle */}
          {result.video_analysis?.heatmap_b64 && (
            <div className="media-heatmap-row">
              <HeatmapToggle
                heatmapB64={result.video_analysis.heatmap_b64}
                originalB64={result.video_analysis.original_frame_b64}
              />
            </div>
          )}

          {/* Explanation badges */}
          {result.explanations?.length > 0 && (
            <div className="media-explanation-block">
              <div className="media-exp-title">DETECTION SIGNALS</div>
              {result.explanations.map((exp, i) => (
                <div key={i} className="media-exp-item">{exp}</div>
              ))}
            </div>
          )}

          {/* Score breakdown */}
          <div className="media-breakdown">
            {result.video_analysis && (
              <BreakdownBar
                label="Video Score"
                pct={Math.round((result.video_analysis.mc_mean ?? 0) * 100)}
                weight={Math.round((result.fusion_alpha ?? 0.6) * 100)}
              />
            )}
            {result.audio_analysis && (
              <BreakdownBar
                label="Audio Score"
                pct={Math.round((result.audio_analysis.combined_score ?? 0) * 100)}
                weight={Math.round((result.fusion_beta ?? 0.4) * 100)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HeatmapToggle({ heatmapB64, originalB64 }) {
  const [showHeatmap, setShowHeatmap] = useState(true)
  return (
    <div className="heatmap-toggle-dash">
      <div className="heatmap-btns">
        <button className={showHeatmap ? 'active' : ''} onClick={() => setShowHeatmap(true)}>Grad-CAM Heatmap</button>
        <button className={!showHeatmap ? 'active' : ''} onClick={() => setShowHeatmap(false)}>Original Frame</button>
      </div>
      <img
        className="heatmap-img-dash"
        src={`data:image/png;base64,${showHeatmap ? heatmapB64 : originalB64}`}
        alt={showHeatmap ? 'Grad-CAM heatmap' : 'Original frame'}
      />
    </div>
  )
}

function BreakdownBar({ label, pct, weight }) {
  const c = pct >= 65 ? '#ef4444' : pct >= 35 ? '#f59e0b' : '#10b981'
  return (
    <div className="breakdown-row">
      <span className="breakdown-label">{label} ({weight}%)</span>
      <div className="breakdown-bar-track">
        <div className="breakdown-bar-fill" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="breakdown-pct" style={{ color: c }}>{pct}%</span>
    </div>
  )
}
