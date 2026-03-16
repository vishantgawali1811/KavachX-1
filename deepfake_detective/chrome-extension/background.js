// background.js — Deepfake Detective service worker
// Handles badge updates, notifications, and log persistence
// Syncs with Flask API at http://localhost:5002

const API = 'http://localhost:5002';

const BADGE = {
  real:       { color: '#16a34a', text: '✓'  },      // Green
  uncertain:  { color: '#d97706', text: '!'  },      // Orange
  deepfake:   { color: '#dc2626', text: '‼'  },      // Red
  idle:       { color: '#334155', text: ''   },      // Gray
};

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_RESULT') {
    applyBadge(message.data);
    sendResponse({ success: true });
  } else if (message.type === 'CHECK_API') {
    checkAPIHealth();
    sendResponse({ success: true });
  }
});

/**
 * Apply visual badge based on scan result
 */
function applyBadge(data) {
  const pct = data.risk_pct ?? Math.round((data.final_score ?? 0) * 100);
  const level = pct >= 65 ? 'deepfake' : pct >= 35 ? 'uncertain' : 'real';
  const b = BADGE[level];

  chrome.action.setBadgeText({ text: b.text });
  chrome.action.setBadgeBackgroundColor({ color: b.color });

  // Show notification
  showNotification(data, level, pct);
}

/**
 * Display notification with scan result
 */
function showNotification(data, level, pct) {
  const verdictText = {
    deepfake: `🚨 DEEPFAKE DETECTED (${pct}%)`,
    uncertain: `⚠️ UNCERTAIN (${pct}% – Review Needed)`,
    real: `✓ AUTHENTIC (${pct}%)`,
  };

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Deepfake Detective',
    message: `${verdictText[level]} | ${data.filename}`,
    priority: level === 'deepfake' ? 2 : 0,
  });
}

/**
 * Check API health on startup
 */
function checkAPIHealth() {
  fetch(`${API}/health`, { method: 'GET', timeout: 3000 })
    .then(r => r.ok ? true : false)
    .catch(() => false)
    .then(ok => {
      const status = ok ? 'connected' : 'offline';
      chrome.storage.local.set({ apiStatus: status });
      if (!ok) {
        console.warn('Deepfake Detective: API not reachable on port 5002');
      }
    });
}

// Check API health periodically
chrome.alarms.create('checkAPI', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkAPI') checkAPIHealth();
});

// Check API on first install/update
chrome.runtime.onInstalled.addListener(checkAPIHealth);
