// popup.js — Deepfake Detective extension popup
// Mirrors KavachX popup architecture with video/audio tabs

const API_URL = 'http://localhost:5002';
const ARC_LEN = 219.9;

// ═══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════
const tabVideo   = document.getElementById('tab-video');
const tabAudio   = document.getElementById('tab-audio');
const panelVideo = document.getElementById('panel-video');
const panelAudio = document.getElementById('panel-audio');

tabVideo.addEventListener('click', () => {
  tabVideo.classList.add('active');
  tabAudio.classList.remove('active');
  panelVideo.style.display = '';
  panelAudio.style.display = 'none';
});

tabAudio.addEventListener('click', () => {
  tabAudio.classList.add('active');
  tabVideo.classList.remove('active');
  panelAudio.style.display = '';
  panelVideo.style.display = 'none';
});

// ═══════════════════════════════════════════════════════════════════════════
// FILE UPLOAD — VIDEO
// ═══════════════════════════════════════════════════════════════════════════
const videoDrop     = document.getElementById('video-drop');
const videoInput    = document.getElementById('video-input');
const videoSelected = document.getElementById('video-selected');
const videoFilename = document.getElementById('video-filename');
const videoRemove   = document.getElementById('video-remove');
const btnAnalyze    = document.getElementById('btn-analyze');
const riskCard      = document.getElementById('video-risk-card');

let videoFile = null;

videoDrop.addEventListener('click', () => videoInput.click());
videoDrop.addEventListener('dragover', (e) => { e.preventDefault(); videoDrop.classList.add('dragover'); });
videoDrop.addEventListener('dragleave', () => videoDrop.classList.remove('dragover'));
videoDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  videoDrop.classList.remove('dragover');
  if (e.dataTransfer.files.length) setVideoFile(e.dataTransfer.files[0]);
});

videoInput.addEventListener('change', () => {
  if (videoInput.files.length) setVideoFile(videoInput.files[0]);
});

videoRemove.addEventListener('click', () => {
  videoFile = null;
  videoSelected.style.display = 'none';
  videoDrop.style.display = '';
  riskCard.style.display = 'none';
});

function setVideoFile(file) {
  videoFile = file;
  videoFilename.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  videoSelected.style.display = 'flex';
  videoDrop.style.display = 'none';
  riskCard.style.display = '';
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE UPLOAD — AUDIO
// ═══════════════════════════════════════════════════════════════════════════
const audioDrop     = document.getElementById('audio-drop');
const audioInput    = document.getElementById('audio-input');
const audioSelected = document.getElementById('audio-selected');
const audioFilename = document.getElementById('audio-filename');
const audioRemove   = document.getElementById('audio-remove');
const btnAudioAnalyze = document.getElementById('btn-analyze-audio');
const audioRiskCard = document.getElementById('audio-risk-card');

let audioFile = null;

audioDrop.addEventListener('click', () => audioInput.click());
audioDrop.addEventListener('dragover', (e) => { e.preventDefault(); audioDrop.classList.add('dragover'); });
audioDrop.addEventListener('dragleave', () => audioDrop.classList.remove('dragover'));
audioDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  audioDrop.classList.remove('dragover');
  if (e.dataTransfer.files.length) setAudioFile(e.dataTransfer.files[0]);
});

audioInput.addEventListener('change', () => {
  if (audioInput.files.length) setAudioFile(audioInput.files[0]);
});

audioRemove.addEventListener('click', () => {
  audioFile = null;
  audioSelected.style.display = 'none';
  audioDrop.style.display = '';
  audioRiskCard.style.display = 'none';
});

function setAudioFile(file) {
  audioFile = file;
  audioFilename.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  audioSelected.style.display = 'flex';
  audioDrop.style.display = 'none';
  audioRiskCard.style.display = '';
}

// ═══════════════════════════════════════════════════════════════════════════
// VIDEO ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
const arcFill       = document.getElementById('arc-fill');
const meterPct      = document.getElementById('meter-pct');
const verdictEl     = document.getElementById('verdict');
const confidenceRow = document.getElementById('confidence-row');
const confidenceFill = document.getElementById('confidence-fill');
const confidenceText = document.getElementById('confidence-text');
const heatmapSection = document.getElementById('heatmap-section');
const heatmapImg    = document.getElementById('heatmap-img');
const btnHeatmap    = document.getElementById('btn-heatmap');
const btnOriginal   = document.getElementById('btn-original');
const videoFeatures = document.getElementById('video-features');
const videoFeatureList = document.getElementById('video-feature-list');

let lastVideoResult = null;

btnAnalyze.addEventListener('click', async () => {
  if (!videoFile) {
    setVideoVerdict('idle', '&#9888; Please select a file first');
    return;
  }
  setVideoBusy(true);

  const formData = new FormData();
  formData.append('file', videoFile);

  try {
    const res = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errMsg = 'Analysis failed';
      try {
        const err = await res.json();
        errMsg = err.error || err.message || errMsg;
      } catch (e) {
        errMsg = `HTTP ${res.status}: ${res.statusText}`;
      }
      setVideoVerdict('idle', `&#9888; ${errMsg}`);
      meterPct.textContent = '—';
      return;
    }

    const data = await res.json();
    if (data.error) {
      setVideoVerdict('idle', `&#9888; ${data.error}`);
      meterPct.textContent = '—';
      return;
    }

    lastVideoResult = data;
    renderVideoResult(data);
    saveToLog(data);

    // Notify background script to update badge and show notification
    chrome.runtime.sendMessage({ type: 'SCAN_RESULT', data }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Extension notification failed:', chrome.runtime.lastError);
      }
    });

  } catch (err) {
    console.error('Video analysis error:', err);
    setVideoVerdict('idle', '&#9888; Cannot reach API — is backend running on http://localhost:5002?');
    meterPct.textContent = '?';
  } finally {
    setVideoBusy(false);
  }
});

function renderVideoResult(data) {
  const pct = data.risk_pct ?? Math.round((data.final_score ?? 0) * 100);
  const offset = ARC_LEN - (pct / 100) * ARC_LEN;
  arcFill.style.strokeDashoffset = offset;

  const color = pct >= 65 ? '#f87171' : pct >= 35 ? '#fbbf24' : '#4ade80';
  arcFill.style.stroke = color;
  meterPct.textContent = `${pct}%`;
  meterPct.style.color = color;

  if (data.verdict === 'Deepfake') {
    setVideoVerdict('deepfake', '&#128308;  Deepfake Detected');
  } else if (data.verdict === 'Uncertain') {
    setVideoVerdict('uncertain', '&#128992;  Uncertain — Review Needed');
  } else {
    setVideoVerdict('real', '&#128994;  Authentic Media');
  }

  // Confidence
  if (data.confidence) {
    confidenceRow.style.display = 'flex';
    const confPct = parseInt(data.confidence) || pct;
    confidenceFill.style.width = `${confPct}%`;
    confidenceFill.style.background = color;
    confidenceText.textContent = data.confidence;
  }

  // Heatmap
  const va = data.video_analysis;
  if (va && va.heatmap_b64) {
    heatmapSection.style.display = '';
    heatmapImg.src = `data:image/png;base64,${va.heatmap_b64}`;
    btnHeatmap.classList.add('active');
    btnOriginal.classList.remove('active');
  }

  // Feature rows
  renderVideoFeatures(data);
}

function renderVideoFeatures(data) {
  const va = data.video_analysis || {};
  const aa = data.audio_analysis || {};
  const rows = [];

  rows.push(featureRow('Frames Analyzed', va.frame_count ?? '—', 'neutral'));
  rows.push(featureRow('Faces Detected', va.faces_detected ? 'Yes' : 'No', va.faces_detected ? 'good' : 'neutral'));
  rows.push(featureRow('Video Score', `${Math.round((va.mc_mean ?? 0) * 100)}%`,
    (va.mc_mean ?? 0) >= 0.65 ? 'bad' : (va.mc_mean ?? 0) >= 0.35 ? 'warn' : 'good'));
  rows.push(featureRow('MC Uncertainty', `\u00b1${Math.round((va.mc_std ?? 0) * 100)}%`, 'neutral'));

  if (aa.combined_score !== undefined) {
    rows.push(featureRow('Audio Score', `${Math.round(aa.combined_score * 100)}%`,
      aa.combined_score >= 0.65 ? 'bad' : aa.combined_score >= 0.35 ? 'warn' : 'good'));
    rows.push(featureRow('Audio Anomalies', `${aa.triggered_count ?? 0}/${aa.total_checks ?? 0}`,
      (aa.triggered_count ?? 0) > 2 ? 'bad' : (aa.triggered_count ?? 0) > 0 ? 'warn' : 'good'));
  }

  rows.push(featureRow('Fusion', `Video ${Math.round((data.fusion_alpha ?? 0.6) * 100)}% + Audio ${Math.round((data.fusion_beta ?? 0.4) * 100)}%`, 'neutral'));

  videoFeatureList.innerHTML = rows.join('');
  videoFeatures.style.display = '';
}

function featureRow(label, value, cls) {
  return `<div class="feat-row">
    <span>${label}</span>
    <span class="feat-val ${cls}">${value}</span>
  </div>`;
}

// Heatmap toggle
btnHeatmap.addEventListener('click', () => {
  if (!lastVideoResult) return;
  const va = lastVideoResult.video_analysis;
  if (va && va.heatmap_b64) {
    heatmapImg.src = `data:image/png;base64,${va.heatmap_b64}`;
    btnHeatmap.classList.add('active');
    btnOriginal.classList.remove('active');
  }
});

btnOriginal.addEventListener('click', () => {
  if (!lastVideoResult) return;
  const va = lastVideoResult.video_analysis;
  if (va && va.original_frame_b64) {
    heatmapImg.src = `data:image/png;base64,${va.original_frame_b64}`;
    btnOriginal.classList.add('active');
    btnHeatmap.classList.remove('active');
  }
});

function setVideoVerdict(cls, text) {
  verdictEl.className = `verdict ${cls}`;
  verdictEl.innerHTML = text;
}

function setVideoBusy(on) {
  btnAnalyze.disabled = on;
  btnAnalyze.innerHTML = on
    ? '<span class="spinner"></span> Analyzing...'
    : 'Analyze Video';
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
const audioArcFill      = document.getElementById('audio-arc-fill');
const audioMeterPct     = document.getElementById('audio-meter-pct');
const audioVerdictEl    = document.getElementById('audio-verdict');
const audioConfRow      = document.getElementById('audio-confidence-row');
const audioConfFill     = document.getElementById('audio-confidence-fill');
const audioConfText     = document.getElementById('audio-confidence-text');
const audioFeatureSec   = document.getElementById('audio-features');
const audioFeatureList  = document.getElementById('audio-feature-list');

btnAudioAnalyze.addEventListener('click', async () => {
  if (!audioFile) {
    setAudioVerdict('idle', '&#9888; Please select a file first');
    return;
  }
  setAudioBusy(true);

  const formData = new FormData();
  formData.append('file', audioFile);

  try {
    const res = await fetch(`${API_URL}/analyze-audio`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errMsg = 'Analysis failed';
      try {
        const err = await res.json();
        errMsg = err.error || err.message || errMsg;
      } catch (e) {
        errMsg = `HTTP ${res.status}: ${res.statusText}`;
      }
      setAudioVerdict('idle', `&#9888; ${errMsg}`);
      audioMeterPct.textContent = '—';
      return;
    }

    const data = await res.json();
    if (data.error) {
      setAudioVerdict('idle', `&#9888; ${data.error}`);
      audioMeterPct.textContent = '—';
      return;
    }

    renderAudioResult(data);
    saveToLog(data);

    // Notify background script
    chrome.runtime.sendMessage({ type: 'SCAN_RESULT', data }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Extension notification failed:', chrome.runtime.lastError);
      }
    });

  } catch (err) {
    console.error('Audio analysis error:', err);
    setAudioVerdict('idle', '&#9888; Cannot reach API — is backend running on http://localhost:5002?');
    audioMeterPct.textContent = '?';
  } finally {
    setAudioBusy(false);
  }
});

function renderAudioResult(data) {
  const pct = data.risk_pct ?? Math.round((data.final_score ?? 0) * 100);
  const offset = ARC_LEN - (pct / 100) * ARC_LEN;
  audioArcFill.style.strokeDashoffset = offset;

  const color = pct >= 65 ? '#f87171' : pct >= 35 ? '#fbbf24' : '#4ade80';
  audioArcFill.style.stroke = color;
  audioMeterPct.textContent = `${pct}%`;
  audioMeterPct.style.color = color;

  if (data.verdict === 'Deepfake') {
    setAudioVerdict('deepfake', '&#128308;  Synthetic Voice Detected');
  } else if (data.verdict === 'Uncertain') {
    setAudioVerdict('uncertain', '&#128992;  Uncertain');
  } else {
    setAudioVerdict('real', '&#128994;  Authentic Audio');
  }

  // Confidence
  if (data.confidence) {
    audioConfRow.style.display = 'flex';
    audioConfFill.style.width = `${parseInt(data.confidence) || pct}%`;
    audioConfFill.style.background = color;
    audioConfText.textContent = data.confidence;
  }

  // Audio anomaly features
  const aa = data.audio_analysis || {};
  const anomalies = aa.anomalies || {};
  const rows = [];

  const ANOMALY_LABELS = {
    pitch_stability: 'Pitch Stability',
    breath_patterns: 'Breath Patterns',
    spectral_flatness: 'Spectral Flatness',
    frequency_cutoff: 'Frequency Cutoff',
  };

  for (const [key, label] of Object.entries(ANOMALY_LABELS)) {
    const info = anomalies[key];
    if (!info) continue;
    const detected = info.detected;
    const sev = info.severity || 'OK';
    const cls = detected ? (sev === 'High' ? 'bad' : 'warn') : 'good';
    rows.push(featureRow(label, detected ? `&#9888; ${sev}` : '&#10003; Normal', cls));
  }

  rows.push(featureRow('CNN Score', `${Math.round((aa.cnn_score ?? 0) * 100)}%`, 'neutral'));
  rows.push(featureRow('Combined Score', `${Math.round((aa.combined_score ?? 0) * 100)}%`,
    (aa.combined_score ?? 0) >= 0.65 ? 'bad' : 'good'));

  audioFeatureList.innerHTML = rows.join('');
  audioFeatureSec.style.display = '';
}

function setAudioVerdict(cls, text) {
  audioVerdictEl.className = `verdict ${cls}`;
  audioVerdictEl.innerHTML = text;
}

function setAudioBusy(on) {
  btnAudioAnalyze.disabled = on;
  btnAudioAnalyze.innerHTML = on
    ? '<span class="spinner"></span> Analyzing...'
    : 'Analyze Audio';
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED — Log + Footer
// ═══════════════════════════════════════════════════════════════════════════
function saveToLog(data) {
  chrome.storage.local.get({ deepfakeLog: [] }, ({ deepfakeLog }) => {
    deepfakeLog.unshift({
      filename: data.filename,
      file_type: data.file_type,
      verdict: data.verdict,
      risk_pct: data.risk_pct,
      confidence: data.confidence,
      ts: new Date().toISOString(),
    });
    if (deepfakeLog.length > 200) deepfakeLog.length = 200;
    chrome.storage.local.set({ deepfakeLog });
  });
}

document.getElementById('btn-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:8501/' });
});

document.getElementById('btn-clear').addEventListener('click', () => {
  chrome.storage.local.set({ deepfakeLog: [] }, () => {
    const btn = document.getElementById('btn-clear');
    btn.textContent = '✓ Cleared';
    setTimeout(() => { btn.textContent = '🗑 Clear History'; }, 1500);
  });
});
