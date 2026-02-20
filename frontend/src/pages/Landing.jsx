import { useState } from 'react'

const API_URL = 'http://localhost:5001'

function DemoScanner({ onLaunchApp }) {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  const PRESET = [
    { label: '✅ Legitimate', url: 'https://www.google.com' },
    { label: '🚨 Phishing',   url: 'http://192.168.1.1/verify-account/login.html' },
    { label: '⚡ Suspicious', url: 'https://bit.ly/3xKpMrQ' },
  ]

  const scan = async (u) => {
    const target = (u || url).trim()
    if (!target) { setError('Enter a URL first.'); return }
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      setError("URL must start with http:// or https://"); return
    }
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Server error'); return }
      setResult(data)
    } catch {
      setError('Backend not reachable. Make sure it is running on port 5001.')
    } finally {
      setLoading(false)
    }
  }

  const riskPct = result ? Math.round(result.risk_score * 100) : 0
  const riskColor = riskPct >= 70 ? 'var(--red2)' : riskPct >= 40 ? 'var(--yellow)' : 'var(--green)'
  const riskLabel = riskPct >= 70 ? '🚨 Phishing Detected' : riskPct >= 40 ? '⚡ Suspicious' : '✅ Safe'
  const riskClass = riskPct >= 70 ? 'badge-phishing' : riskPct >= 40 ? 'badge-suspicious' : 'badge-safe'

  return (
    <div className="demo-box">
      <div className="demo-titlebar">
        <div className="demo-dots">
          <div className="demo-dot demo-dot-red" />
          <div className="demo-dot demo-dot-yellow" />
          <div className="demo-dot demo-dot-green" />
        </div>
        <span className="demo-titlebar-text">KavachX — AI Phishing Detector</span>
      </div>
      <div className="demo-body">
        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {PRESET.map(p => (
            <button key={p.label} className="btn btn-ghost btn-xs"
              onClick={() => { setUrl(p.url); scan(p.url) }}
            >{p.label}</button>
          ))}
        </div>

        {/* Input form */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="scan-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scan()}
            disabled={loading}
          />
          <button className="scan-btn" onClick={() => scan()} disabled={loading} style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
            {loading ? <><span className="scan-spinner" /> Scanning…</> : '🛡 Scan'}
          </button>
        </div>
        {error && <div className="error-box" style={{ marginTop: 12 }}>⚠ {error}</div>}

        {/* Result */}
        {result && (
          <div style={{ animation: 'fadeUp 0.4s ease', marginTop: 20 }}>
            <div className="demo-result-grid">
              {/* Risk meter */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Risk Score</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: riskColor, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{riskPct}%</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${riskClass}`} style={{ fontSize: '0.82rem' }}>{riskLabel}</span>
                </div>
                {/* Bar */}
                <div style={{ marginTop: 14, height: 8, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${riskPct}%`, borderRadius: 99, background: riskColor, transition: 'width 0.6s ease', boxShadow: `0 0 10px ${riskColor}` }} />
                </div>
              </div>

              {/* Explanation */}
              <div className="demo-hint">
                <div className="demo-hint-title">AI Explanation</div>
                {result.features.ip === 1 && (
                  <div className="demo-hint-item"><span>⚠</span> IP address as hostname</div>
                )}
                {result.features.phish_hints > 0 && (
                  <div className="demo-hint-item"><span>⚠</span> {result.features.phish_hints} phishing hint keyword(s)</div>
                )}
                {result.features.shortening_service === 1 && (
                  <div className="demo-hint-item"><span>⚠</span> URL shortening service</div>
                )}
                {result.features.suspicious_tld === 1 && (
                  <div className="demo-hint-item"><span>⚠</span> Suspicious TLD detected</div>
                )}
                {result.features.length_url > 75 && (
                  <div className="demo-hint-item"><span>📏</span> URL length: {result.features.length_url} chars</div>
                )}
                {result.label === 'legitimate' && riskPct < 40 && (
                  <>
                    <div className="demo-hint-item"><span>✅</span> Normal URL structure</div>
                    <div className="demo-hint-item"><span>✅</span> No phishing keywords</div>
                    <div className="demo-hint-item"><span>✅</span> Clean domain statistics</div>
                  </>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => onLaunchApp('scan')}>
                Open Full Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Landing({ onLaunchApp }) {
  const features = [
    { icon: '🔗', step: 1, title: 'URL Scanning',          desc: 'Extract 21 structural & statistical features from the URL instantly.' },
    { icon: '🧠', step: 2, title: 'Content Analysis',      desc: 'AI model analyses URL patterns with Random Forest classification.' },
    { icon: '📊', step: 3, title: 'Hybrid Risk Scoring',   desc: 'Combine feature signals into a 0–100% continuous risk confidence score.' },
    { icon: '🛡', step: 4, title: 'Smart Warning System',  desc: 'Block, warn, or allow — with full AI explanation of the decision.' },
  ]

  const threats = [
    { icon: '🎓', title: 'Fake Internship Scams',      desc: 'Sites impersonating MNCs to steal student data & charge fraudulent "registration fees".' },
    { icon: '📚', title: 'Scholarship Fraud',           desc: 'Fake government portals harvesting Aadhaar, bank account, and personal details.' },
    { icon: '🔑', title: 'Cloned Login Pages',          desc: 'Pixel-perfect copies of Facebook, Google, or university portals to steal credentials.' },
    { icon: '💳', title: 'Bank Phishing Fraud',         desc: 'Fake bank & UPI pages triggering "urgent KYC verification" to capture credentials.' },
    { icon: '📱', title: 'OTP Interception',            desc: 'Pages that trick users into entering one-time passwords to authorise fraud.' },
    { icon: '🏛', title: 'Government Impersonation',   desc: 'Sites posing as NSDL, EPFO, or Income Tax to extract sensitive identity data.' },
  ]

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <div className="nav-logo-icon">🛡</div>
          <span className="nav-logo-text">Kavach<span>X</span></span>
        </div>
        <div className="nav-links">
          {['How It Works', 'Threats', 'Demo', 'Architecture'].map(l => (
            <button key={l} className="nav-link">{l}</button>
          ))}
          <button className="nav-cta" onClick={() => onLaunchApp('scan')}>Launch App →</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-grid" />
        <div className="hero-bg-orb hero-orb1" />
        <div className="hero-bg-orb hero-orb2" />
        <div className="hero-bg-orb hero-orb3" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="dot-live" />
            AI-Powered · Real-Time · Privacy-First
          </div>

          <span className="hero-shield">🛡</span>

          <h1 className="hero-title">
            <span className="hero-title-line">Your AI Armor</span>
            <span className="hero-title-line hero-title-accent">Against Phishing</span>
          </h1>

          <p className="hero-sub">
            Real-time AI-powered phishing detection for students and institutions.
            Protect yourself from fake internships, scholarship scams, login cloning, and financial fraud.
          </p>

          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => onLaunchApp('scan')}>
              🛡 Launch KavachX
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => onLaunchApp('extension')}>
              🧩 Install Extension
            </button>
          </div>

          <div className="hero-trust">
            {[
              { value: '11,430+', label: 'URLs in Training Set' },
              { value: '90.3%', label: 'Detection Accuracy' },
              { value: '21', label: 'Analysed Features' },
              { value: '<200ms', label: 'Analysis Latency' },
            ].map(t => (
              <div key={t.label} className="trust-item">
                <div>
                  <span className="trust-value neon-text">{t.value}</span>
                  <span>{t.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'rgba(6,9,18,0.8)' }}>
        <div className="section-center">
          <div className="section-label">How It Works</div>
          <h2 className="section-heading">From URL to Verdict in Milliseconds</h2>
          <p className="section-desc">KavachX analyses every URL through a 4-stage AI pipeline — no page visits, no data stored, fully local.</p>
        </div>
        <div className="steps-grid">
          {features.map(f => (
            <div key={f.title} className="step-card card-hover glass-light">
              <div className="step-num">{f.step}</div>
              <span className="step-icon">{f.icon}</span>
              <div className="step-title">{f.title}</div>
              <div className="step-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Students */}
      <section className="section">
        <div className="section-center">
          <div className="section-label">Threat Landscape</div>
          <h2 className="section-heading">Why Students Need KavachX</h2>
          <p className="section-desc">Students and institutions are the fastest-growing targets for cyber criminals. Here's what KavachX protects you from.</p>
        </div>
        <div className="threats-grid">
          {threats.map(t => (
            <div key={t.title} className="threat-card card-hover">
              <span className="threat-card-icon">{t.icon}</span>
              <div className="threat-card-title">{t.title}</div>
              <div className="threat-card-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo */}
      <section className="section demo-section">
        <div className="demo-container">
          <div className="section-center">
            <div className="section-label">Live Demo</div>
            <h2 className="section-heading">Try It Right Now</h2>
            <p className="section-desc">Paste any URL or click a preset to see KavachX analyse it in real time using our live ML backend.</p>
          </div>
          <DemoScanner onLaunchApp={onLaunchApp} />
        </div>
      </section>

      {/* Features grid */}
      <section className="section">
        <div className="section-center">
          <div className="section-label">Platform</div>
          <h2 className="section-heading">Enterprise-Grade Protection</h2>
          <p className="section-desc">A complete cybersecurity platform with everything you need to detect, monitor, and respond to phishing threats.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
          {[
            { icon: '🔍', title: 'Real-Time URL Scanner', desc: 'Instant AI analysis of any URL with full feature breakdown and XAI explanation.', nav: 'scan' },
            { icon: '📊', title: 'Risk Analytics Dashboard', desc: 'SOC-style dashboard with phishing trends, keyword analysis, and domain targeting data.', nav: 'analytics' },
            { icon: '🚨', title: 'Live Threat Feed', desc: 'Real-time stream of flagged phishing URLs with category and geo-attribution data.', nav: 'feed' },
            { icon: '📜', title: 'Scan History & Export', desc: 'Full audit trail with filtering, search, and CSV export of all scanned URLs.', nav: 'history' },
            { icon: '🏫', title: 'Institution Admin Panel', desc: 'Aggregate attack intelligence, geo heatmaps, and downloadable monthly security reports.', nav: 'institution' },
            { icon: '🧠', title: 'Technical Transparency', desc: 'Full architecture documentation with model performance metrics and explainability details.', nav: 'tech' },
          ].map(f => (
            <div
              key={f.title}
              className="card card-hover"
              style={{ cursor: 'pointer' }}
              onClick={() => onLaunchApp(f.nav)}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontSize: '0.93rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
              <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--neon)', fontWeight: 600 }}>Open →</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="section" style={{ textAlign: 'center', padding: '80px max(24px, 6vw)' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: 24, padding: '56px 40px', maxWidth: 680, margin: '0 auto',
          boxShadow: '0 0 60px rgba(0,212,255,0.06)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🛡</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 14, letterSpacing: '-0.5px' }}>
            Start Detecting Phishing Now
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.65 }}>
            Free to use. No sign-up required. Powered by AI trained on 11,430 real-world URLs.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => onLaunchApp('scan')}>Launch App</button>
            <button className="btn btn-outline btn-lg" onClick={() => onLaunchApp('tech')}>View Architecture</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, background: 'var(--grad-neon)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>🛡</div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', fontFamily: 'Space Grotesk, sans-serif' }}>Kavach<span style={{ color: 'var(--neon)' }}>X</span></span>
            </div>
            <div className="footer-brand-desc">
              AI-powered phishing detection for students and institutions. Built with a Random Forest ML model trained on 11,430 real-world URLs.
            </div>
          </div>
          {[
            { title: 'Product', links: ['Real-Time Scan', 'Analytics', 'Threat Feed', 'Extension', 'Institution Admin'] },
            { title: 'Architecture', links: ['ML Model', 'Feature Engine', 'Risk Scoring', 'API Reference', 'Explainability'] },
            { title: 'Resources', links: ['GitHub', 'Dataset (Mendeley)', 'Model Evaluation', 'Chrome Extension', 'Documentation'] },
          ].map(col => (
            <div key={col.title}>
              <div className="footer-col-title">{col.title}</div>
              {col.links.map(l => <div key={l} className="footer-link">{l}</div>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 KavachX — Built as an AI Cybersecurity Hackathon Project</span>
          <span>Powered by Random Forest + React + Flask</span>
        </div>
      </footer>
    </div>
  )
}
