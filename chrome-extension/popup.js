// popup.js — drives popup.html (URL scan + Message scan + Sanitize)

const API_URL  = 'http://localhost:5001/predict';
const MSG_API  = 'http://localhost:5001/analyze-message';

// Arc math: path length ≈ 219.9 (half-circle r=70)
const ARC_LEN = 219.9;

// ═══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════
const tabUrl   = document.getElementById('tab-url');
const tabMsg   = document.getElementById('tab-msg');
const panelUrl = document.getElementById('panel-url');
const panelMsg = document.getElementById('panel-msg');

function switchTab(activeTab, activePanel) {
  [tabUrl, tabMsg].forEach(t => t.classList.remove('active'));
  [panelUrl, panelMsg].forEach(p => p.style.display = 'none');
  activeTab.classList.add('active');
  activePanel.style.display = '';
}

tabUrl.addEventListener('click', () => switchTab(tabUrl, panelUrl));
tabMsg.addEventListener('click', () => switchTab(tabMsg, panelMsg));

// ═══════════════════════════════════════════════════════════════════════════
// URL TAB — existing logic (preserved exactly)
// ═══════════════════════════════════════════════════════════════════════════
const urlStrip      = document.getElementById('url-strip');
const arcFill       = document.getElementById('arc-fill');
const meterPct      = document.getElementById('meter-pct');
const verdictEl     = document.getElementById('verdict');
const btnCheck      = document.getElementById('btn-check');
const btnLog        = document.getElementById('btn-log');
const btnClear      = document.getElementById('btn-clear');
const featSection   = document.getElementById('features-section');
const featureList   = document.getElementById('feature-list');

let currentUrl = '';
let currentTabId = null;

// Init — get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;
  currentUrl   = tab.url || '';
  currentTabId = tab.id;
  urlStrip.innerHTML = `<span>${currentUrl}</span>`;

  chrome.storage.local.get('lastResult', ({ lastResult }) => {
    if (lastResult && lastResult.url === currentUrl) {
      renderResult(lastResult);
    }
  });
});

// Collect full page data via scripting API
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
    return { url };
  }
}

// Check URL button
btnCheck.addEventListener('click', async () => {
  if (!currentUrl.startsWith('http')) {
    setVerdict('idle', '⚠ Cannot analyse this page');
    return;
  }
  setBusy(true);
  try {
    const payload = await getPageData(currentTabId, currentUrl);
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    renderResult(data);
    saveToLog(data);
    chrome.storage.local.set({ lastResult: data });
    chrome.runtime.sendMessage({ type: 'RESULT', data }).catch(() => {});
  } catch (err) {
    setVerdict('idle', '⚠ Cannot reach API — is backend running?');
    meterPct.textContent = '?';
  } finally {
    setBusy(false);
  }
});

function renderResult(data) {
  const score = data.url_score ?? data.risk_score ?? data.final_score ?? 0;
  const pct   = Math.round(score * 100);

  const offset = ARC_LEN - (pct / 100) * ARC_LEN;
  arcFill.style.strokeDashoffset = offset;

  const color = pct >= 70 ? '#f87171' : pct >= 40 ? '#fbbf24' : '#4ade80';
  arcFill.style.stroke = color;

  meterPct.textContent = `${pct}%`;
  meterPct.style.color = color;

  if (pct >= 70) {
    setVerdict('phishing', '🔴  Phishing Detected');
  } else if (pct >= 40) {
    setVerdict('suspicious', '🟡  Suspicious URL');
  } else {
    setVerdict('safe', '🟢  Looks Safe');
  }

  if (data.features) renderFeatures(data.features);

  document.getElementById('score-breakdown')?.remove();
  document.getElementById('reasons-section')?.remove();
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

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS — phone number for Vapi voice alerts
// ═══════════════════════════════════════════════════════════════════════════
const btnSettings   = document.getElementById('btn-settings');
const panelSettings = document.getElementById('panel-settings');
const inputPhone    = document.getElementById('input-phone');
const btnSavePhone  = document.getElementById('btn-save-phone');
const phoneStatus   = document.getElementById('phone-status');

let settingsOpen = false;

btnSettings.addEventListener('click', () => {
  settingsOpen = !settingsOpen;
  panelSettings.style.display = settingsOpen ? 'block' : 'none';
  btnSettings.style.borderColor = settingsOpen ? '#3b82f6' : '';
  btnSettings.style.color = settingsOpen ? '#60a5fa' : '';
});

// Load saved phone number
chrome.storage.local.get('userPhone', ({ userPhone }) => {
  if (userPhone) {
    inputPhone.value = userPhone;
    phoneStatus.textContent = '✓ Phone number configured';
    phoneStatus.style.color = '#4ade80';
  }
});

btnSavePhone.addEventListener('click', () => {
  const phone = inputPhone.value.trim();
  if (!phone) {
    phoneStatus.textContent = '⚠ Please enter a phone number';
    phoneStatus.style.color = '#fbbf24';
    return;
  }
  // Basic validation: must start with + and contain digits
  if (!/^\+\d{7,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
    phoneStatus.textContent = '⚠ Enter a valid number with country code (e.g., +91XXXXXXXXXX)';
    phoneStatus.style.color = '#fbbf24';
    return;
  }
  chrome.storage.local.set({ userPhone: phone.replace(/[\s\-()]/g, '') }, () => {
    phoneStatus.textContent = '✓ Phone number saved — voice alerts enabled';
    phoneStatus.style.color = '#4ade80';
    btnSavePhone.textContent = '✓ Saved';
    setTimeout(() => { btnSavePhone.textContent = 'Save'; }, 1500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE TAB — scans email body from current page (mirrors URL tab style)
// ═══════════════════════════════════════════════════════════════════════════
const msgStrip       = document.getElementById('msg-strip');
const msgArcFill     = document.getElementById('msg-arc-fill');
const msgMeterPct    = document.getElementById('msg-meter-pct');
const msgVerdictEl   = document.getElementById('msg-verdict');
const btnMsgCheck    = document.getElementById('btn-msg-check');
const msgFeatSection = document.getElementById('msg-features-section');
const msgFeatureList = document.getElementById('msg-feature-list');

// Extract email body text from current page via scripting API
async function getEmailText(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Try common email selectors (Gmail, Outlook, Yahoo, generic)
        const selectors = [
          '.a3s.aiL',                    // Gmail message body
          '.ii.gt div',                  // Gmail alt
          '[role="main"] .adn',          // Gmail expanded
          '.ReadMsgBody',                // Outlook web
          '.rps_ad1d',                   // Outlook web alt
          '[aria-label="Message body"]', // Outlook new
          '.msg-body',                   // Yahoo
          '.email-content',              // Generic
          'article',                     // Generic article
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim().length > 20) {
            return el.innerText.trim().substring(0, 5000);
          }
        }
        // Fallback: grab the main body text
        return (document.body?.innerText || '').substring(0, 5000);
      },
    });
    return result || '';
  } catch (_) {
    return '';
  }
}

btnMsgCheck.addEventListener('click', async () => {
  if (!currentUrl.startsWith('http')) {
    setMsgVerdict('idle', '⚠ Cannot analyse this page');
    return;
  }

  setMsgBusy(true);
  msgStrip.innerHTML = '<span>Extracting email content…</span>';

  try {
    const emailText = await getEmailText(currentTabId);
    if (!emailText || emailText.trim().length < 10) {
      setMsgVerdict('idle', '⚠ No email content found on this page');
      msgStrip.innerHTML = '<span>No email content detected</span>';
      setMsgBusy(false);
      return;
    }

    // Show snippet in strip
    const snippet = emailText.substring(0, 120).replace(/\n/g, ' ');
    msgStrip.innerHTML = `<span>${snippet}…</span>`;

    const res = await fetch(MSG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: emailText }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    renderMsgResult(data);

    // Save to local log
    chrome.storage.local.get({ msgLog: [] }, ({ msgLog }) => {
      msgLog.unshift({
        snippet:    data.message_snippet || emailText.slice(0, 80),
        label:      data.label,
        risk_pct:   data.risk_pct,
        status:     data.status,
        reasons:    data.reasons || [],
        ts:         new Date().toISOString(),
      });
      if (msgLog.length > 200) msgLog.length = 200;
      chrome.storage.local.set({ msgLog });
    });
  } catch (err) {
    setMsgVerdict('idle', '⚠ Cannot reach API — is backend running?');
    msgMeterPct.textContent = '?';
  } finally {
    setMsgBusy(false);
  }
});

function renderMsgResult(data) {
  const pct = data.risk_pct ?? Math.round((data.risk_score ?? 0) * 100);

  // Arc gauge (same math as URL tab)
  const offset = ARC_LEN - (pct / 100) * ARC_LEN;
  msgArcFill.style.strokeDashoffset = offset;

  const color = pct >= 70 ? '#f87171' : pct >= 40 ? '#fbbf24' : '#4ade80';
  msgArcFill.style.stroke = color;

  msgMeterPct.textContent = `${pct}%`;
  msgMeterPct.style.color = color;

  if (pct >= 70) {
    setMsgVerdict('phishing', '🔴  Phishing Email Detected');
  } else if (pct >= 40) {
    setMsgVerdict('suspicious', '🟡  Suspicious Email');
  } else {
    setMsgVerdict('safe', '🟢  Email Looks Safe');
  }

  // Risk signals table (mirrors URL features table)
  const ind = data.indicators || {};
  const INDICATOR_LABELS = {
    urgency:              'Urgency / Pressure',
    credential_request:   'Credential Harvesting',
    impersonation:        'Brand Impersonation',
    financial_scam:       'Financial Scam',
    ai_generated:         'AI-Generated Content',
  };

  const hasLinks = ind.suspicious_links && ind.suspicious_links.length > 0;
  let rows = Object.entries(INDICATOR_LABELS).map(([key, label]) => {
    const active = !!ind[key];
    return `<div class="feat-row">
      <span>${label}</span>
      <span class="feat-val ${active ? 'bad' : ''}">${active ? '⚠ Yes' : '✓ No'}</span>
    </div>`;
  });

  // Add suspicious links row
  rows.push(`<div class="feat-row">
    <span>Suspicious Links</span>
    <span class="feat-val ${hasLinks ? 'bad' : ''}">${hasLinks ? '⚠ ' + ind.suspicious_links.length + ' found' : '✓ None'}</span>
  </div>`);

  msgFeatureList.innerHTML = rows.join('');
  msgFeatSection.style.display = 'block';
}

function setMsgVerdict(cls, text) {
  msgVerdictEl.className = `verdict ${cls}`;
  msgVerdictEl.innerHTML = text;
}

function setMsgBusy(on) {
  btnMsgCheck.disabled  = on;
  btnMsgCheck.innerHTML = on
    ? '<span class="spinner"></span> Scanning Email…'
    : 'Check This Email';
}

