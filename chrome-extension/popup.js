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
let currentTabId = null;

// ── Init ──────────────────────────────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;
  currentUrl   = tab.url || '';
  currentTabId = tab.id;
  urlStrip.innerHTML = `<span>${currentUrl}</span>`;

  // Auto-load last cached result for this URL
  chrome.storage.local.get('lastResult', ({ lastResult }) => {
    if (lastResult && lastResult.url === currentUrl) {
      renderResult(lastResult);
    }
  });
});

// ── Collect full page data via scripting API ──────────────────────────────
async function getPageData(tabId, url) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = (document.body?.innerText || '').slice(0, 5000);
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        const passwords = document.querySelectorAll('input[type="password"]');
        const iframes = document.querySelectorAll('iframe');
        const formActions = Array.from(forms).map(f => f.action || '').filter(Boolean);
        return {
          title:            document.title || '',
          text,
          numForms:          forms.length,
          numInputs:         inputs.length,
          numPasswordFields: passwords.length,
          numIframes:        iframes.length,
          formActions,
        };
      },
    });
    return { url, ...result };
  } catch (_) {
    // scripting failed (e.g., Chrome internal page) — send URL only
    return { url };
  }
}

// ── Check button ──────────────────────────────────────────────────────────
btnCheck.addEventListener('click', async () => {
  if (!currentUrl.startsWith('http')) {
    setVerdict('idle', '⚠ Cannot analyse this page');
    return;
  }
  setBusy(true);
  try {
    // Gather full page data for hybrid analysis
    const payload = await getPageData(currentTabId, currentUrl);

    const res = await fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    renderResult(data);
    saveToLog(data);
    // Cache for this URL
    chrome.storage.local.set({ lastResult: data });
    // Notify background to update badge
    chrome.runtime.sendMessage({ type: 'RESULT', data }).catch(() => {});
  } catch (err) {
    setVerdict('idle', '⚠ Cannot reach API — is backend running?');
    meterPct.textContent = '?';
  } finally {
    setBusy(false);
  }
});

// ── Render ────────────────────────────────────────────────────────────────
function renderResult(data) {
  // Extension shows URL model score only (pure ML — no DOM/content layer)
  const score = data.url_score ?? data.risk_score ?? data.final_score ?? 0
  const pct   = Math.round(score * 100);

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

  // URL feature highlights
  if (data.features) {
    renderFeatures(data.features)
  }

  // Remove any leftover breakdown/reasons sections from previous renders
  document.getElementById('score-breakdown')?.remove()
  document.getElementById('reasons-section')?.remove()
}

function setVerdict(cls, text) {
  verdictEl.className = `verdict ${cls}`;
  verdictEl.innerHTML = text;
}

function setBusy(on) {
  btnCheck.disabled  = on;
  btnCheck.innerHTML = on
    ? '<span class="spinner"></span> Analysing…'
    : 'Check This URL';
}

// ── Sub-score breakdown ───────────────────────────────────────────────────
function renderScoreBreakdown(data) {
  // Remove any existing breakdown
  const old = document.getElementById('score-breakdown');
  if (old) old.remove();

  if (!data.hybrid) return; // skip for URL-only responses

  const urlPct  = Math.round((data.url_score        ?? 0) * 100);
  const strPct  = Math.round((data.structural_score ?? 0) * 100);
  const conPct  = Math.round((data.content_score    ?? 0) * 100);

  const scoreColor = (p) => p >= 70 ? '#f87171' : p >= 40 ? '#fbbf24' : '#4ade80';

  const el = document.createElement('div');
  el.id = 'score-breakdown';
  el.style.cssText = 'margin:8px 0;padding:8px 10px;background:#1e2a3a;border-radius:8px;font-size:12px;';
  el.innerHTML = `
    <div style="font-weight:600;color:#94a3b8;margin-bottom:6px;letter-spacing:.5px;">HYBRID BREAKDOWN</div>
    <div class="sb-row" style="display:flex;justify-content:space-between;padding:2px 0;">
      <span style="color:#cbd5e1;">URL Model</span>
      <span style="color:${scoreColor(urlPct)};font-weight:700;">${urlPct}%</span>
    </div>
    <div class="sb-row" style="display:flex;justify-content:space-between;padding:2px 0;">
      <span style="color:#cbd5e1;">Page Structure</span>
      <span style="color:${scoreColor(strPct)};font-weight:700;">${strPct}%</span>
    </div>
    <div class="sb-row" style="display:flex;justify-content:space-between;padding:2px 0;">
      <span style="color:#cbd5e1;">Content / NLP</span>
      <span style="color:${scoreColor(conPct)};font-weight:700;">${conPct}%</span>
    </div>`;

  // Insert after verdict, before features section
  verdictEl.after(el);
}

// ── Reasons list ──────────────────────────────────────────────────────────
function renderReasons(reasons) {
  const old = document.getElementById('reasons-section');
  if (old) old.remove();
  if (!reasons.length) return;

  const el = document.createElement('div');
  el.id = 'reasons-section';
  el.style.cssText = 'margin:8px 0;padding:8px 10px;background:#1e2a3a;border-radius:8px;font-size:12px;';
  const items = reasons.slice(0, 6).map(r =>
    `<div style="color:#fbbf24;padding:2px 0;">⚠ ${r}</div>`
  ).join('');
  el.innerHTML = `
    <div style="font-weight:600;color:#94a3b8;margin-bottom:6px;letter-spacing:.5px;">THREAT SIGNALS</div>
    ${items}`;

  const breakdown = document.getElementById('score-breakdown');
  if (breakdown) breakdown.after(el);
  else verdictEl.after(el);
}

// ── URL feature highlights ─────────────────────────────────────────────────
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
      url:              data.url,
      label:            data.label,
      final_score:      data.final_score      ?? data.risk_score ?? 0,
      url_score:        data.url_score        ?? 0,
      structural_score: data.structural_score ?? 0,
      content_score:    data.content_score    ?? 0,
      reasons:          data.reasons          ?? [],
      ts:               new Date().toISOString(),
    });
    if (phishLog.length > 200) phishLog.length = 200;
    chrome.storage.local.set({ phishLog });
  });
}

btnLog.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3000/' });
});

btnClear.addEventListener('click', () => {
  chrome.storage.local.set({ phishLog: [] }, () => {
    btnClear.textContent = '✓ Cleared';
    setTimeout(() => { btnClear.textContent = '🗑 Clear Log'; }, 1500);
  });
});
