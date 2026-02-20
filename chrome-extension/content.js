// content.js — injected into every page
// 1. Listens for PHISHING_ALERT from background.js → shows overlay banner
// 2. Intercepts password form submissions when page risk is high

const BANNER_ID   = 'certIn-phishing-banner';
const OVERLAY_ID  = 'certIn-form-overlay';

// ── Message from background ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PHISHING_ALERT') {
    showBanner(msg.risk_score, msg.url);
    if (msg.risk_score >= 0.7) {
      guardForms(msg.risk_score);
    }
  }
});


// ── Top banner ────────────────────────────────────────────────────────────
function showBanner(risk, url) {
  if (document.getElementById(BANNER_ID)) return; // already shown

  const pct   = Math.round(risk * 100);
  const level = pct >= 70 ? 'high' : 'medium';

  const banner       = document.createElement('div');
  banner.id          = BANNER_ID;
  banner.style.cssText = `
    all: initial;
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    background: ${level === 'high' ? '#991b1b' : '#92400e'};
    border-bottom: 2px solid ${level === 'high' ? '#f87171' : '#fbbf24'};
    box-shadow: 0 4px 20px rgba(0,0,0,.5);
  `;

  banner.innerHTML = `
    <span>
      ${level === 'high' ? '🔴' : '🟡'}
      &nbsp;CERT-In Warning: This page has a <strong>${pct}% phishing risk</strong>.
      Do not enter credentials.
    </span>
    <button id="${BANNER_ID}-close" style="
      all:initial; cursor:pointer; color:#fff; font-size:18px;
      font-weight:700; line-height:1; padding: 0 6px; opacity:.8;
    ">✕</button>
  `;

  document.documentElement.prepend(banner);

  document.getElementById(`${BANNER_ID}-close`)
    .addEventListener('click', () => banner.remove());

  // Auto-dismiss after 12 s for medium risk
  if (level === 'medium') {
    setTimeout(() => banner.remove(), 12000);
  }
}


// ── Form guard — intercept password form submissions ──────────────────────
function guardForms(risk) {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    const hasPassword = form.querySelector('input[type="password"]');
    if (!hasPassword) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showFormOverlay(risk, () => form.submit());
    }, { once: true });
  });
}


// ── Full-screen overlay before credential submission ──────────────────────
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
        CERT-In AI model detected a <strong style="color:#fbbf24">${pct}% phishing risk</strong>
        on this page.<br/>Submitting your credentials here could compromise your account.
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
    .addEventListener('click', () => {
      overlay.remove();
      history.back();
    });

  document.getElementById(`${OVERLAY_ID}-proceed`)
    .addEventListener('click', () => {
      overlay.remove();
      proceedFn();
    });
}
