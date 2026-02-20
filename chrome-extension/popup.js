// popup.js — drives popup.html

const API = 'http://localhost:5001/predict';

// Arc math: path length ≈ 219.9 (half-circle r=70)
const ARC_LEN = 219.9;

// ── DOM refs ──────────────────────────────────────────────────────────────
const urlStrip      = document.getElementById('url-strip');
const arcFill       = document.getElementById('arc-fill');
const meterPct      = document.getElementById('meter-pct');
const verdictEl     = document.getElementById('verdict');
const btnCheck      = document.getElementById('btn-check');
const btnLog        = document.getElementById('btn-log');
const btnClear      = document.getElementById('btn-clear');
const featSection   = document.getElementById('features-section');
const featureList   = document.getElementById('feature-list');

// ── State ─────────────────────────────────────────────────────────────────
let currentUrl = '';

// ── Init ──────────────────────────────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;
  currentUrl = tab.url || '';
  urlStrip.innerHTML = `<span>${currentUrl}</span>`;

  // Auto-load last cached result for this URL
  chrome.storage.local.get('lastResult', ({ lastResult }) => {
    if (lastResult && lastResult.url === currentUrl) {
      renderResult(lastResult);
    }
  });
});

// ── Check button ──────────────────────────────────────────────────────────
btnCheck.addEventListener('click', async () => {
  if (!currentUrl.startsWith('http')) {
    setVerdict('idle', '⚠ Cannot analyse this page');
    return;
  }
  setBusy(true);
  try {
    const res  = await fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: currentUrl }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    renderResult(data);
    saveToLog(data);
    // Cache for this URL
    chrome.storage.local.set({ lastResult: data });
    // Notify background to update badge
    chrome.runtime.sendMessage({ type: 'RESULT', data });
  } catch (err) {
    setVerdict('idle', '⚠ Cannot reach API — is backend running?');
    meterPct.textContent = '?';
  } finally {
    setBusy(false);
  }
});

// ── Render ────────────────────────────────────────────────────────────────
function renderResult(data) {
  const pct = Math.round((data.risk_score || 0) * 100);

  // Arc
  const offset = ARC_LEN - (pct / 100) * ARC_LEN;
  arcFill.style.strokeDashoffset = offset;

  // Colour
  const color = pct >= 70 ? '#f87171' : pct >= 40 ? '#fbbf24' : '#4ade80';
  arcFill.style.stroke = color;

  // Percent label
  meterPct.textContent  = `${pct}%`;
  meterPct.style.color  = color;

  // Verdict chip
  if (pct >= 70) {
    setVerdict('phishing', '🔴  Phishing Detected');
  } else if (pct >= 40) {
    setVerdict('suspicious', '🟡  Suspicious URL');
  } else {
    setVerdict('safe', '🟢  Looks Safe');
  }

  // Feature highlights
  if (data.features) {
    renderFeatures(data.features);
  }
}

function setVerdict(cls, text) {
  verdictEl.className = `verdict ${cls}`;
  verdictEl.innerHTML = text;
}

function setBusy(on) {
  btnCheck.disabled   = on;
  btnCheck.innerHTML  = on
    ? '<span class="spinner"></span> Analysing…'
    : 'Check This URL';
}

// Key structural signals to surface
const SIGNAL_LABELS = {
  ip:                 'IP in URL',
  https_token:        'No HTTPS',
  prefix_suffix:      'Dash in domain',
  shortening_service: 'URL shortener',
  suspicious_tld:     'Suspicious TLD',
  statistical_report: 'Known bad host',
  phish_hints:        'Phishing keywords',
};

function renderFeatures(features) {
  const rows = Object.entries(SIGNAL_LABELS).map(([key, label]) => {
    const val = features[key];
    const bad = val > 0;
    return `<div class="feat-row">
      <span>${label}</span>
      <span class="feat-val ${bad ? 'bad' : ''}">${bad ? '⚠ Yes' : '✓ No'}</span>
    </div>`;
  });
  featureList.innerHTML = rows.join('');
  featSection.style.display = 'block';
}

// ── Log helpers ───────────────────────────────────────────────────────────
function saveToLog(data) {
  chrome.storage.local.get({ phishLog: [] }, ({ phishLog }) => {
    phishLog.unshift({
      url:        data.url,
      label:      data.label,
      risk_score: data.risk_score,
      ts:         new Date().toISOString(),
    });
    if (phishLog.length > 200) phishLog.length = 200; // cap
    chrome.storage.local.set({ phishLog });
  });
}

btnLog.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('log.html') });
});

btnClear.addEventListener('click', () => {
  chrome.storage.local.set({ phishLog: [] }, () => {
    btnClear.textContent = '✓ Cleared';
    setTimeout(() => { btnClear.textContent = '🗑 Clear Log'; }, 1500);
  });
});
