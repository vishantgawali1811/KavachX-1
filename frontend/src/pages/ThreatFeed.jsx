import { useState, useEffect } from 'react'

const INITIAL_THREATS = [
  { id: 1,  domain: 'verify-scholarship-2026.xyz',     category: 'Scholarship Scam',        type: 'high',   time: '2s ago',   country: 'IN' },
  { id: 2,  domain: 'internship-apply-india.ml',       category: 'Fake Internship Portal',  type: 'high',   time: '14s ago',  country: 'IN' },
  { id: 3,  domain: 'bank-kyc-update.tk',              category: 'Bank KYC Fraud',          type: 'high',   time: '32s ago',  country: 'IN' },
  { id: 4,  domain: 'faceb00k-secure-login.ga',        category: 'Social Media Clone',      type: 'high',   time: '1m ago',   country: 'IN' },
  { id: 5,  domain: 'upi-verify-otp.page.link',        category: 'UPI OTP Scam',            type: 'high',   time: '2m ago',   country: 'IN' },
  { id: 6,  domain: 'amazon-offer-reward.cf',          category: 'E-commerce Fraud',        type: 'medium', time: '3m ago',   country: 'US' },
  { id: 7,  domain: 'govt-scholarship-apply.cf',       category: 'Government Impersonation',type: 'high',   time: '4m ago',   country: 'IN' },
  { id: 8,  domain: 'paypal-secure-update.gq',         category: 'Payment Portal Clone',    type: 'medium', time: '5m ago',   country: 'US' },
  { id: 9,  domain: 'student-loan-forgiveness.xyz',    category: 'Education Scam',          type: 'high',   time: '7m ago',   country: 'IN' },
  { id: 10, domain: 'whatsapp-prize-winner.ml',        category: 'Social Media Phishing',   type: 'medium', time: '8m ago',   country: 'PK' },
]

const CATEGORIES = [
  { icon: '🎓', title: 'Fake Internship Portals',
    desc: 'Fraudulent sites impersonating MNCs to steal student data and fees',
    count: 98, trend: '↑ 28%',
  },
  { icon: '📚', title: 'Scholarship Fraud',
    desc: 'Fake government/NGO scholarship forms harvesting Aadhaar and banking details',
    count: 76, trend: '↑ 22%',
  },
  { icon: '🏦', title: 'Bank KYC Scams',
    desc: 'Cloned bank login pages urging users to "urgently verify" their account',
    count: 68, trend: '→ stable',
  },
  { icon: '📱', title: 'OTP Interception',
    desc: 'Pages that trick users into entering OTPs to authorise fraudulent transactions',
    count: 54, trend: '↑ 16%',
  },
]

let nextId = 11
function generateThreat() {
  const templates = [
    { domain: `secure-verify-${Math.floor(Math.random()*9999)}.xyz`, category: 'Verification Scam', type: 'high' },
    { domain: `internship-apply-${Math.floor(Math.random()*9999)}.ml`, category: 'Fake Internship', type: 'high' },
    { domain: `scholarship-form-${Math.floor(Math.random()*9999)}.tk`, category: 'Scholarship Fraud', type: 'high' },
    { domain: `bank-login-${Math.floor(Math.random()*9999)}.ga`, category: 'Banking Clone', type: 'medium' },
  ]
  const t = templates[Math.floor(Math.random() * templates.length)]
  return { ...t, id: nextId++, time: 'just now', country: 'IN' }
}

export default function ThreatFeed() {
  const [threats, setThreats] = useState(INITIAL_THREATS)
  const [paused, setPaused]   = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setThreats(prev => [generateThreat(), ...prev.slice(0, 24)])
    }, 4000)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <>
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span className="dot-live dot-red" />
          Live threat intelligence — updating every 4 seconds
        </div>
        <button
          className={`btn btn-sm ${paused ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setPaused(p => !p)}
          style={{ marginLeft: 'auto' }}
        >
          {paused ? '▶ Resume' : '⏸ Pause Feed'}
        </button>
      </div>

      {/* Category summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 28 }}>
        {CATEGORIES.map(c => (
          <div key={c.title} className="card" style={{ borderLeft: '3px solid var(--red)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red2)', background: 'var(--red-bg)', border: '1px solid var(--red-bdr)', padding: '2px 9px', borderRadius: 999 }}>{c.count} detected</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{c.desc}</div>
            <div style={{ fontSize: '0.73rem', color: c.trend.startsWith('↑') ? 'var(--red2)' : 'var(--text-muted)' }}>{c.trend} this week</div>
          </div>
        ))}
      </div>

      {/* Live feed */}
      <div className="threat-feed-wrap">
        <div className="threat-feed-header">
          <div className="threat-feed-title">
            <span className="dot-live dot-red" />
            Flagged URLs — Live Stream
          </div>
          <span className="badge badge-neon">{threats.length} in feed</span>
        </div>

        {threats.map(t => (
          <div key={t.id} className="threat-item">
            <div className={`threat-icon ${t.type === 'high' ? 'threat-high' : t.type === 'medium' ? 'threat-medium' : 'threat-low'}`}>
              {t.type === 'high' ? '🚨' : t.type === 'medium' ? '⚡' : 'ℹ'}
            </div>
            <div className="threat-info">
              <div className="threat-domain">{t.domain}</div>
              <div className="threat-category">{t.category} · {t.country}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <span className={`badge ${t.type === 'high' ? 'badge-phishing' : t.type === 'medium' ? 'badge-suspicious' : 'badge-neon'}`}>
                {t.type === 'high' ? 'High' : t.type === 'medium' ? 'Medium' : 'Low'}
              </span>
              <span className="threat-time">{t.time}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
