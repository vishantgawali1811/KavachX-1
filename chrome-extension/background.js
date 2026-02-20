// background.js — service worker
// Handles:
//   a) analyzePage messages from content.js — full hybrid classification
//      (URL + structural + NLP content scores)
//   b) RESULT messages from popup — badge + warning sync
//   c) webNavigation fallback for pages where content.js didn't fire

const API = 'http://localhost:5001/predict';

const BADGE = {
  safe:       { color: '#16a34a', text: '✓'  },
  suspicious: { color: '#d97706', text: '!'  },
  phishing:   { color: '#dc2626', text: '‼'  },
  idle:       { color: '#334155', text: ''   },
};

// Track which tabs have already been analyzed to avoid duplicate calls
const analyzedTabs = new Set();

// ── Message listener: analyzePage (content.js) + RESULT (popup) ───────────
chrome.runtime.onMessage.addListener((message, sender) => {
  // Hybrid page analysis from content.js (preferred — includes text/structure)
  if (message.action === 'analyzePage') {
    const tabId = sender.tab?.id;
    if (tabId) analyzedTabs.add(tabId);
    analyzePageContent(message.data, tabId);
    return;
  }

  // Badge update from popup (result already fetched by popup)
  if (message.type === 'RESULT') {
    applyBadge(message.data);
    const score = message.data.url_score ?? message.data.risk_score ?? 0;
    if (score >= 0.70) injectWarning(message.data);
  }
});


// ── Navigation fallback — fires only if content.js didn't send analyzePage ─
chrome.webNavigation.onCompleted.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return;
  if (!url.startsWith('http')) return;

  // Small delay to let content.js fire first
  setTimeout(() => {
    if (!analyzedTabs.has(tabId)) {
      analyzePageContent({ url }, tabId);
    }
    analyzedTabs.delete(tabId);
  }, 800);
}, { url: [{ schemes: ['http', 'https'] }] });


// ── Core hybrid analysis ───────────────────────────────────────────────────
async function analyzePageContent(pageData, tabId) {
  try {
    const res = await fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(pageData),
    });
    if (!res.ok) return;

    const result = await res.json();
    result.tabId = tabId;

    applyBadge(result, tabId);
    saveToLog(result);

    const score = result.final_score ?? result.risk_score ?? 0;
    if (score >= 0.70) injectWarning(result, tabId);
  } catch (_) {
    if (tabId) chrome.action.setBadgeText({ text: '', tabId });
  }
}


// ── Badge — uses URL model score only ────────────────────────────────────
function applyBadge(data, tabId) {
  const score = data.url_score ?? data.risk_score ?? 0
  const pct   = Math.round(score * 100);
  const level = pct >= 70 ? 'phishing' : pct >= 40 ? 'suspicious' : 'safe';
  const b     = BADGE[level];

  const opts = tabId ? { tabId } : {};
  chrome.action.setBadgeText({ text: b.text, ...opts });
  chrome.action.setBadgeBackgroundColor({ color: b.color, ...opts });
}


// ── Inject warning with full hybrid breakdown ──────────────────────────────
function injectWarning(data, tabId) {
  const payload = {
    type:             'PHISHING_ALERT',
    final_score:      data.final_score      ?? data.risk_score ?? 0,
    risk_score:       data.risk_score       ?? data.final_score ?? 0,
    url_score:        data.url_score        ?? 0,
    structural_score: data.structural_score ?? 0,
    content_score:    data.content_score    ?? 0,
    reasons:          data.reasons          ?? [],
    url:              data.url,
  };

  if (!tabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) chrome.tabs.sendMessage(tab.id, payload);
    });
    return;
  }
  chrome.tabs.sendMessage(tabId, payload).catch(() => {});
}


// ── Persist to log ─────────────────────────────────────────────────────────
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
    if (phishLog.length > 500) phishLog.length = 500;
    chrome.storage.local.set({ phishLog });
  });
}
