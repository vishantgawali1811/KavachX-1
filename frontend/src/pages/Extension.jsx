import { useState } from 'react'

const BLOCKED_SITES = [
  { domain: 'verify-account.net', blockedAt: '2026-02-20 13:12', reason: 'Phishing — 92%' },
  { domain: 'internship-portal-2025.ml', blockedAt: '2026-02-20 12:30', reason: 'Phishing — 81%' },
  { domain: 'confirm-kyc-update.tk', blockedAt: '2026-02-20 11:20', reason: 'Phishing — 96%' },
  { domain: '0tp-verify.page.link', blockedAt: '2026-02-20 10:40', reason: 'Phishing — 89%' },
  { domain: 'scholarship-apply-now.xyz', blockedAt: '2026-02-19 22:10', reason: 'Phishing — 87%' },
]

const TOGGLES = [
  { key: 'realtime',  label: 'Real-Time Scanning',       desc: 'Automatically scan every URL you visit' },
  { key: 'popup',     label: 'Warning Popups',            desc: 'Show overlay alerts on phishing pages' },
  { key: 'cloud',     label: 'Cloud Sync',                desc: 'Sync extension logs to your KavachX account' },
  { key: 'backup',    label: 'Automatic Cloud Backup',    desc: 'Back up scan history every 24 hours' },
  { key: 'report',    label: 'Reporting to Feed',         desc: 'Anonymously report phishing URLs to Live Threat Feed' },
]

export default function Extension() {
  const [toggles, setToggles] = useState({ realtime: true, popup: true, cloud: false, backup: false, report: true })
  const toggle = k => setToggles(p => ({ ...p, [k]: !p[k] }))

  return (
    <>
      {/* Status strip */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '18px 24px' }}>
        <div style={{ width: 52, height: 52, background: 'var(--neon-bg)', border: '2px solid rgba(0,212,255,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0, boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>🧩</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>KavachX Chrome Extension</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Version 1.0.0 · Connected to backend on port 5001</div>
        </div>
        <span className="badge badge-safe">● Active</span>
        <a href="#" style={{ textDecoration: 'none' }}>
          <button className="btn btn-primary btn-sm">Install Extension</button>
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Settings panel */}
        <div className="card">
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 18, fontSize: '0.9rem' }}>⚙ Extension Settings</div>
          {TOGGLES.map(t => (
            <div key={t.key} className="toggle-row">
              <div>
                <div className="toggle-label">{t.label}</div>
                <div className="toggle-desc">{t.desc}</div>
              </div>
              <div className={`toggle ${toggles[t.key] ? 'on' : ''}`} onClick={() => toggle(t.key)}>
                <div className="toggle-thumb" />
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: '🔍', label: 'URLs Scanned Today',     value: '47',  cls: 'neon' },
            { icon: '🚫', label: 'Sites Blocked Today',    value: '4',   cls: 'red' },
            { icon: '⚡', label: 'Warnings Shown',         value: '2',   cls: 'yellow' },
            { icon: '☁', label: 'Cloud Sync Status',       value: 'Off', cls: 'neon' },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`} style={{ padding: '16px 20px', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-card-label" style={{ marginBottom: 4 }}>{s.label}</div>
                  <div className="stat-card-value" style={{ fontSize: '1.5rem' }}>{s.value}</div>
                </div>
                <span style={{ fontSize: '1.6rem', opacity: 0.7 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked sites */}
      <div className="data-table-wrap" style={{ marginBottom: 24 }}>
        <div className="data-table-header">
          <div className="data-table-title">🚫 Blocked Websites</div>
          <button className="btn btn-outline btn-sm">⬇ Download Security Report (PDF)</button>
        </div>
        <table>
          <thead><tr><th>Domain</th><th>Blocked At</th><th>Reason</th><th>Action</th></tr></thead>
          <tbody>
            {BLOCKED_SITES.map(s => (
              <tr key={s.domain}>
                <td><div className="td-url" title={s.domain}>{s.domain}</div></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.blockedAt}</td>
                <td><span className="badge badge-phishing">{s.reason}</span></td>
                <td>
                  <button className="btn btn-ghost btn-xs" style={{ fontSize: '0.72rem' }}>Unblock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Install guide */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(99,102,241,0.04))' }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16, fontSize: '0.9rem' }}>📦 Manual Extension Installation</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          {[
            { step: '1', title: 'Clone / Download', desc: 'Download the KavachX repository from GitHub' },
            { step: '2', title: 'Open Extensions', desc: 'Navigate to chrome://extensions in Chrome' },
            { step: '3', title: 'Enable Dev Mode', desc: 'Toggle "Developer Mode" in top-right corner' },
            { step: '4', title: 'Load Unpacked', desc: 'Click "Load unpacked" and select the chrome-extension/ folder' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, background: 'var(--grad-neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#020810', flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--text)', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
