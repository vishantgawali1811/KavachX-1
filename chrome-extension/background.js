// background.js — service worker
// Handles:
//   a) analyzePage messages from content.js — full hybrid classification
//      (URL + structural + NLP content scores)
//   b) RESULT messages from popup — badge + warning sync
//   c) webNavigation fallback for pages where content.js didn't fire

const API = 'http://localhost:5001/predict';
const VAPI_API = 'https://api.vapi.ai/call/phone';
const VAPI_KEY = '42489716-87c7-49dc-aed5-c02bb9ad058c';
const VAPI_PHONE_NUMBER_ID = 'b5094ae4-070c-43a7-afd0-e195c05e801b';   // +12192595035
const VAPI_ASSISTANT_ID    = '7c55e2e0-4b6f-41f3-bd94-bde7ad1f7bda';   // KavachX assistant
const CUSTOMER_PHONE       = '+919930594182';

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
    if (score >= 0.70) {
      // Get the active tab to inject warning + trigger Vapi call
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        const tabId = tab?.id;
        injectWarning(message.data, tabId);
        triggerVapiCall(message.data, tabId);
      });
    }
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

    // Use url_score (ML model) for triggering — final_score gets diluted
    // when structural/content scores are 0
    const urlScore = result.url_score ?? result.risk_score ?? 0;
    if (urlScore >= 0.70) {
      injectWarning(result, tabId);
      triggerVapiCall(result, tabId);
    }
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
      if (tab) chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
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


// ── Vapi phone call — triggers when risk >= 70 ──────────────────────────────
async function triggerVapiCall(data, tabId) {
  const phone = CUSTOMER_PHONE;

  console.log('KavachX: Placing Vapi call to', phone, 'from +12192595035');

  try {
    const res = await fetch(VAPI_API, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_KEY}`,
      },
      body: JSON.stringify({
        assistantId:   VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        assistantOverrides: {
          firstMessageMode: 'assistant-speaks-first'
        },
        customer: {
          number: phone
        }
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.error('KavachX: Vapi call failed:', res.status, errText);
      activateSecurityLock(tabId, data);
      return;
    }

    const callData = await res.json();
    console.log('KavachX: Vapi call initiated, ID:', callData.id);

    // Poll for call completion, then activate security lock
    pollCallStatus(callData.id, tabId, data);

  } catch (err) {
    console.error('KavachX: Vapi call error:', err);
    activateSecurityLock(tabId, data);
  }
}


// ── Poll Vapi call status until ended ───────────────────────────────────────
async function pollCallStatus(callId, tabId, data) {
  const MAX_POLLS = 60;  // up to 5 minutes (60 * 5s)
  let polls = 0;

  const check = async () => {
    polls++;
    try {
      const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: { 'Authorization': `Bearer ${VAPI_KEY}` },
      });

      if (res.ok) {
        const callInfo = await res.json();
        if (callInfo.status === 'ended' || callInfo.status === 'failed') {
          console.log('KavachX: Vapi call ended, status:', callInfo.status);
          activateSecurityLock(tabId, data);
          return;
        }
      }
    } catch (_) { /* continue polling */ }

    if (polls < MAX_POLLS) {
      setTimeout(check, 5000);
    } else {
      // Timeout — activate lock anyway
      console.warn('KavachX: Vapi call poll timeout — activating security lock.');
      activateSecurityLock(tabId, data);
    }
  };

  // Start polling after initial delay
  setTimeout(check, 5000);
}


// ── Activate security lock on the tab ────────────────────────────────────────
function activateSecurityLock(tabId, data) {
  if (!tabId) return;

  // Check if the tab still exists and is on the same dangerous page
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;

    const payload = {
      type:       'SECURITY_LOCK',
      risk_score: data.url_score ?? data.risk_score ?? 0,
      url:        data.url,
      reasons:    data.reasons ?? [],
    };

    chrome.tabs.sendMessage(tabId, payload).catch(() => {
      // Content script may not be loaded — inject it first
      chrome.scripting.executeScript({
        target: { tabId },
        files:  ['content.js'],
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, payload).catch(() => {});
        }, 500);
      }).catch(() => {});
    });
  });
}
