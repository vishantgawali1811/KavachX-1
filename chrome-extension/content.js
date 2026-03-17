// content.js — injected into every page
// 1. Extracts page content and sends to background for hybrid analysis
// 2. Listens for PHISHING_ALERT from background.js → shows overlay banner
// 3. Intercepts password form submissions when page risk is high

const BANNER_ID   = 'certIn-phishing-banner';
const OVERLAY_ID  = 'certIn-form-overlay';
const LOCKDOWN_ID = 'certIn-security-lock';

// ── STEP 1: Extract structured page data ────────────────────────────────────
function extractPageData() {
  const formActions = Array.from(document.querySelectorAll('form'))
    .map(f => f.getAttribute('action') || '')
    .filter(Boolean);

  return {
    url:               window.location.href,
    title:             document.title,
    text:              (document.body?.innerText || '').substring(0, 5000),
    numForms:          document.querySelectorAll('form').length,
    numInputs:         document.querySelectorAll('input').length,
    numPasswordFields: document.querySelectorAll("input[type='password']").length,
    numIframes:        document.querySelectorAll('iframe').length,
    formActions,
  };
}

// ── STEP 2: Send page data to background for hybrid analysis ─────────────────
chrome.runtime.sendMessage({
  action: 'analyzePage',
  data:   extractPageData(),
});

// ── Message from background ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PHISHING_ALERT') {
    showBanner(msg);
    // Guard forms based on URL model score only
    if ((msg.url_score || msg.risk_score || 0) >= 0.70) {
      guardForms(msg.url_score || msg.risk_score);
    }
  }

  if (msg.type === 'SECURITY_LOCK') {
    showSecurityLock(msg);
  }
});


// ── Top banner ────────────────────────────────────────────────────────────────
function showBanner(data) {
  if (document.getElementById(BANNER_ID)) return;

  // Extension banner shows URL model score only
  const risk  = data.url_score || data.risk_score || 0;
  const pct   = Math.round(risk * 100);
  const level = pct >= 70 ? 'high' : 'medium';

  const reasons    = (data.reasons || []).slice(0, 3);
  const reasonsHtml = reasons.length
    ? `<ul style="margin:4px 0 0 18px;font-size:11px;color:#fca5a5;">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>`
    : '';

  const banner       = document.createElement('div');
  banner.id          = BANNER_ID;
  banner.style.cssText = `
    all: initial;
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    padding: 10px 20px 12px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    background: ${level === 'high' ? '#991b1b' : '#92400e'};
    border-bottom: 2px solid ${level === 'high' ? '#f87171' : '#fbbf24'};
    box-shadow: 0 4px 20px rgba(0,0,0,.5);
  `;

  banner.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span>
        ${level === 'high' ? '🔴' : '🟡'}
        &nbsp;KavachX: <strong>${pct}% URL risk (ML model)</strong>
      </span>
      <button id="${BANNER_ID}-close" style="
        all:initial; cursor:pointer; color:#fff; font-size:18px;
        font-weight:700; line-height:1; padding: 0 6px; opacity:.8;
      ">✕</button>
    </div>
    ${reasonsHtml}
  `;

  document.documentElement.prepend(banner);

  document.getElementById(`${BANNER_ID}-close`)
    .addEventListener('click', () => banner.remove());

  if (level === 'medium') {
    setTimeout(() => banner.remove(), 12000);
  }
}


// ── Form guard ───────────────────────────────────────────────────────────────
function guardForms(risk) {
  document.querySelectorAll('form').forEach((form) => {
    if (!form.querySelector("input[type='password']")) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showFormOverlay(risk, () => form.submit());
    }, { once: true });
  });
}


// ── Full-screen overlay before credential submission ─────────────────────────
function showFormOverlay(risk, proceedFn) {
  if (document.getElementById(OVERLAY_ID)) return;

  const pct     = Math.round(risk * 100);
  const overlay = document.createElement('div');
  overlay.id    = OVERLAY_ID;
  overlay.style.cssText = `
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0,0,0,.85);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe UI', sans-serif;
  `;

  overlay.innerHTML = `
    <div style="
      background:#1e1e2e; border:2px solid #991b1b; border-radius:16px;
      padding:36px 32px; max-width:420px; text-align:center; color:#e2e8f0;
    ">
      <div style="font-size:52px; margin-bottom:12px;">🛡️</div>
      <div style="font-size:20px; font-weight:800; color:#f87171; margin-bottom:8px;">
        Phishing Risk Detected
      </div>
      <div style="font-size:14px; color:#94a3b8; margin-bottom:24px; line-height:1.6;">
        KavachX AI detected a <strong style="color:#fbbf24">${pct}% phishing risk</strong>
        on this page.<br/>Submitting credentials here could compromise your account.
      </div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="${OVERLAY_ID}-back" style="
          background:#16a34a; color:#fff; border:none; border-radius:8px;
          padding:10px 24px; font-size:14px; font-weight:700; cursor:pointer;
        ">← Go Back (Safe)</button>
        <button id="${OVERLAY_ID}-proceed" style="
          background:#1e2535; color:#94a3b8; border:1px solid #334155;
          border-radius:8px; padding:10px 24px; font-size:14px; cursor:pointer;
        ">Proceed anyway</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);

  document.getElementById(`${OVERLAY_ID}-back`)
    .addEventListener('click', () => { overlay.remove(); history.back(); });

  document.getElementById(`${OVERLAY_ID}-proceed`)
    .addEventListener('click', () => { overlay.remove(); proceedFn(); });
}


// ── Full-screen security lock — activated after Vapi call ends ──────────────
function showSecurityLock(data) {
  if (document.getElementById(LOCKDOWN_ID)) return;

  const risk = data.risk_score || 0;
  const pct  = Math.round(risk * 100);
  const reasons = (data.reasons || []).slice(0, 5);
  const reasonsHtml = reasons.length
    ? reasons.map(r => `<div style="padding:6px 0;border-bottom:1px solid #1e2535;font-size:13px;color:#f87171;">&#9888; ${r}</div>`).join('')
    : '<div style="padding:6px 0;font-size:13px;color:#f87171;">&#9888; High phishing risk detected by AI analysis</div>';

  // Create the lock overlay
  const lock = document.createElement('div');
  lock.id = LOCKDOWN_ID;
  lock.style.cssText = `
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe UI', sans-serif;
    cursor: not-allowed;
  `;

  lock.innerHTML = `
    <div style="
      max-width:520px; width:90%; text-align:center; color:#e2e8f0;
      animation: lockFadeIn 0.3s ease-out;
    ">
      <style>
        @keyframes lockFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes lockPulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes lockSpin { to { transform: rotate(360deg); } }
      </style>

      <!-- Shield icon -->
      <div style="
        width:100px; height:100px; margin:0 auto 24px;
        background: linear-gradient(135deg, #991b1b, #dc2626);
        border-radius:50%; display:flex; align-items:center; justify-content:center;
        box-shadow: 0 0 40px rgba(220,38,38,0.4);
      ">
        <span style="font-size:48px;">&#128274;</span>
      </div>

      <!-- Title -->
      <div style="font-size:28px; font-weight:900; color:#f87171; margin-bottom:8px; letter-spacing:1px;">
        SECURITY LOCK ACTIVATED
      </div>
      <div style="font-size:14px; color:#64748b; margin-bottom:24px;">
        KavachX Cybersecurity Protection System
      </div>

      <!-- Risk score badge -->
      <div style="
        display:inline-block; background:#2d0a0a; border:2px solid #991b1b;
        border-radius:12px; padding:16px 32px; margin-bottom:24px;
      ">
        <div style="font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
          Threat Level
        </div>
        <div style="font-size:42px; font-weight:900; color:#f87171;">
          ${pct}%
        </div>
        <div style="font-size:11px; color:#dc2626; font-weight:700; animation:lockPulse 2s infinite;">
          &#9679; DANGEROUS
        </div>
      </div>

      <!-- Warning message -->
      <div style="
        background:#141824; border:1px solid #1e2535; border-radius:12px;
        padding:20px; margin-bottom:24px; text-align:left;
      ">
        <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; font-weight:700;">
          Threat Details
        </div>
        ${reasonsHtml}
      </div>

      <!-- Warning text -->
      <div style="
        font-size:14px; color:#94a3b8; line-height:1.7; margin-bottom:28px;
        padding:16px; background:rgba(220,38,38,0.08); border-radius:8px;
        border:1px solid rgba(220,38,38,0.2);
      ">
        This page has been <strong style="color:#f87171;">blocked</strong> by KavachX
        to protect your security. The website at <strong style="color:#fbbf24;word-break:break-all;">${data.url || 'this address'}</strong>
        has been identified as a phishing threat. Do <strong style="color:#f87171;">NOT</strong> enter any
        personal information, passwords, or financial details.
      </div>

      <!-- Action buttons -->
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="${LOCKDOWN_ID}-back" style="
          background: linear-gradient(135deg, #16a34a, #15803d);
          color:#fff; border:none; border-radius:12px;
          padding:14px 40px; font-size:16px; font-weight:700;
          cursor:pointer; letter-spacing:0.5px;
          box-shadow: 0 4px 15px rgba(22,163,74,0.3);
          transition: all 0.2s;
        ">&#8592; Go Back to Safety</button>
        <button id="${LOCKDOWN_ID}-allow" style="
          background:#1e2535; color:#94a3b8; border:1px solid #334155;
          border-radius:12px; padding:14px 40px; font-size:16px;
          cursor:pointer; letter-spacing:0.5px;
          transition: all 0.2s;
        ">Allow Anyway</button>
      </div>

      <div style="font-size:11px; color:#475569; margin-top:16px;">
        Protected by KavachX Anti-Phishing Shield
      </div>
    </div>
  `;

  document.documentElement.appendChild(lock);

  // Block all keyboard and mouse events on the page
  const blockEvent = (e) => {
    if (e.target.id === `${LOCKDOWN_ID}-back` || e.target.id === `${LOCKDOWN_ID}-allow`) return;
    e.stopPropagation();
    e.preventDefault();
  };

  document.addEventListener('keydown',   blockEvent, true);
  document.addEventListener('keyup',     blockEvent, true);
  document.addEventListener('keypress',  blockEvent, true);
  document.addEventListener('mousedown', blockEvent, true);
  document.addEventListener('mouseup',   blockEvent, true);
  document.addEventListener('click',     blockEvent, true);
  document.addEventListener('contextmenu', blockEvent, true);
  document.addEventListener('copy',      blockEvent, true);
  document.addEventListener('paste',     blockEvent, true);
  document.addEventListener('selectstart', blockEvent, true);

  const removeBlockers = () => {
    document.removeEventListener('keydown',   blockEvent, true);
    document.removeEventListener('keyup',     blockEvent, true);
    document.removeEventListener('keypress',  blockEvent, true);
    document.removeEventListener('mousedown', blockEvent, true);
    document.removeEventListener('mouseup',   blockEvent, true);
    document.removeEventListener('click',     blockEvent, true);
    document.removeEventListener('contextmenu', blockEvent, true);
    document.removeEventListener('copy',      blockEvent, true);
    document.removeEventListener('paste',     blockEvent, true);
    document.removeEventListener('selectstart', blockEvent, true);
    lock.remove();
  };

  // "Go Back to Safety" — removes lock and navigates back
  document.getElementById(`${LOCKDOWN_ID}-back`)
    .addEventListener('click', (e) => {
      e.stopPropagation();
      removeBlockers();
      history.back();
    });

  // "Allow Anyway" — removes lock and stays on the page
  document.getElementById(`${LOCKDOWN_ID}-allow`)
    .addEventListener('click', (e) => {
      e.stopPropagation();
      removeBlockers();
    });
}
