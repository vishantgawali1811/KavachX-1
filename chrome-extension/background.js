// background.js — service worker
// Auto-classifies every navigation and updates the browser action badge.

const API = 'http://localhost:5001/predict';

// Badge colours
const BADGE = {
  safe:       { color: '#16a34a', text: '✓'  },
  suspicious: { color: '#d97706', text: '!'  },
  phishing:   { color: '#dc2626', text: '‼'  },
  idle:       { color: '#334155', text: ''   },
};

// ── Listen to completed navigations (main frame only) ─────────────────────
chrome.webNavigation.onCompleted.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return;                         // ignore iframes
  if (!url.startsWith('http')) return;               // ignore chrome://, file://

  await classifyUrl(tabId, url);
}, { url: [{ schemes: ['http', 'https'] }] });


// ── Handle message from popup (result already fetched by popup) ───────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'RESULT') return;
  applyBadge(msg.data);
  if (msg.data.risk_score >= 0.7) {
    injectWarning(msg.data);
  }
});


// ── Core classification ───────────────────────────────────────────────────
async function classifyUrl(tabId, url) {
  try {
    const res  = await fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url }),
    });
    if (!res.ok) return;
    const data = await res.json();
    data.tabId = tabId;

    applyBadge(data, tabId);
    saveToLog(data);

    if (data.risk_score >= 0.7) {
      injectWarning(data, tabId);
    }
  } catch (_) {
    // API unreachable — silent fail, set idle badge
    chrome.action.setBadgeText({ text: '',  tabId });
  }
}


// ── Badge ─────────────────────────────────────────────────────────────────
function applyBadge(data, tabId) {
  const pct   = Math.round((data.risk_score || 0) * 100);
  const level = pct >= 70 ? 'phishing' : pct >= 40 ? 'suspicious' : 'safe';
  const b     = BADGE[level];

  const opts = tabId ? { tabId } : {};
  chrome.action.setBadgeText({ text: b.text, ...opts });
  chrome.action.setBadgeBackgroundColor({ color: b.color, ...opts });
}


// ── Inject warning banner into page ───────────────────────────────────────
function injectWarning(data, tabId) {
  const target = tabId ? { tabId } : {};
  // Resolve the tabId if not provided
  if (!tabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type:       'PHISHING_ALERT',
          risk_score: data.risk_score,
          url:        data.url,
        });
      }
    });
    return;
  }
  chrome.tabs.sendMessage(tabId, {
    type:       'PHISHING_ALERT',
    risk_score: data.risk_score,
    url:        data.url,
  });
}


// ── Persist to log ────────────────────────────────────────────────────────
function saveToLog(data) {
  chrome.storage.local.get({ phishLog: [] }, ({ phishLog }) => {
    phishLog.unshift({
      url:        data.url,
      label:      data.label,
      risk_score: data.risk_score,
      ts:         new Date().toISOString(),
    });
    if (phishLog.length > 500) phishLog.length = 500;
    chrome.storage.local.set({ phishLog });
  });
}
