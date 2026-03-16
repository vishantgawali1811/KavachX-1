// log.js — phishing activity log page

let allEntries = [];
let activeFilter = 'all';

// ── Load ──────────────────────────────────────────────────────────────────
chrome.storage.local.get({ phishLog: [] }, ({ phishLog }) => {
  allEntries = phishLog;
  renderStats(phishLog);
  renderTable(phishLog);
});

// ── Stats ─────────────────────────────────────────────────────────────────
function renderStats(entries) {
  document.getElementById('stat-total').textContent     = entries.length;
  document.getElementById('stat-phishing').textContent  = entries.filter(e => riskLevel(e.risk_score) === 'phishing').length;
  document.getElementById('stat-suspicious').textContent= entries.filter(e => riskLevel(e.risk_score) === 'suspicious').length;
  document.getElementById('stat-safe').textContent      = entries.filter(e => riskLevel(e.risk_score) === 'legitimate').length;
}

// ── Table ─────────────────────────────────────────────────────────────────
function renderTable(entries) {
  const tbody      = document.getElementById('log-body');
  const emptyState = document.getElementById('empty-state');

  if (!entries.length) {
    tbody.innerHTML  = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  tbody.innerHTML = entries.map((e, i) => {
    const pct   = Math.round((e.risk_score || 0) * 100);
    const level = riskLevel(e.risk_score);
    const color = level === 'phishing' ? '#f87171' : level === 'suspicious' ? '#fbbf24' : '#4ade80';
    const ts    = new Date(e.ts).toLocaleString();
    return `
      <tr>
        <td style="color:#334155; width:32px;">${i + 1}</td>
        <td class="url-cell" title="${e.url}">${e.url}</td>
        <td><span class="chip ${level}">${level}</span></td>
        <td>
          <div class="bar-wrap">
            <div class="bar-bg">
              <div class="bar-fill" style="width:${pct}%; background:${color};"></div>
            </div>
          </div>
        </td>
        <td style="color:${color}; font-weight:700;">${pct}%</td>
        <td style="font-size:11px; white-space:nowrap;">${ts}</td>
      </tr>
    `;
  }).join('');
}

// ── Filter buttons ────────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;

    const filtered = activeFilter === 'all'
      ? allEntries
      : allEntries.filter(e => riskLevel(e.risk_score) === activeFilter);
    renderTable(filtered);
  });
});

// ── Clear ─────────────────────────────────────────────────────────────────
document.getElementById('btn-clear').addEventListener('click', () => {
  if (!confirm('Clear all phishing log entries?')) return;
  chrome.storage.local.set({ phishLog: [] }, () => {
    allEntries = [];
    renderStats([]);
    renderTable([]);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────
function riskLevel(score) {
  const pct = Math.round((score || 0) * 100);
  if (pct >= 70) return 'phishing';
  if (pct >= 40) return 'suspicious';
  return 'legitimate';
}
