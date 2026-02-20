export default function TechPage() {
  const pipeline = [
    { icon: '🌐', title: 'URL Input', sub: 'User submits URL' },
    { icon: '⚙', title: 'Feature Extraction', sub: '21 features parsed' },
    { icon: '🧠', title: 'ML Inference', sub: 'Random Forest model' },
    { icon: '📊', title: 'Risk Scoring', sub: '0–100% confidence' },
    { icon: '🛡', title: 'Decision', sub: 'Block / Warn / Allow' },
  ]

  const models = [
    {
      icon: '🔗',
      title: 'URL-Based ML Model',
      desc: 'Random Forest classifier trained on 11,430 URLs with structural and statistical features. Achieves 90.3% accuracy on a 30% held-out test set. No web requests required — fully offline, privacy-first analysis.',
      tags: ['Random Forest', 'Scikit-learn', 'Python', '21 Features', '90.3% Accuracy'],
    },
    {
      icon: '📐',
      title: 'Structural Feature Engine',
      desc: 'Extracts binary flags from the URL structure: IP hostname detection, HTTPS token misuse, prefix/suffix dash patterns, URL shortening service usage, suspicious TLDs, and phishing keyword hints.',
      tags: ['URL Parsing', 'Binary Flags', 'tldextract', 'Regex'],
    },
    {
      icon: '📏',
      title: 'Statistical Feature Engine',
      desc: 'Extracts 15 numeric features: URL length, hostname length, dot/hyphen/slash counts, query marks, percent encoding, digit ratios, character repeat index, and average word lengths.',
      tags: ['Numeric Features', 'URL Statistics', 'Normalisation'],
    },
    {
      icon: '🔀',
      title: 'Hybrid Risk Scoring',
      desc: 'Combines predict_proba() output from the Random Forest model to produce a continuous risk score from 0–100%. Explainable feature contributions highlight why a URL is flagged.',
      tags: ['Probability Output', 'XAI', 'Explainable AI', 'Risk Meter'],
    },
    {
      icon: '🕵',
      title: 'Real-Time Analysis Pipeline',
      desc: 'Flask REST API (port 5001) accepts POST /predict. Feature extraction + model inference runs in under 200ms. React frontend renders result, risk meter, and AI explanation instantly.',
      tags: ['Flask', 'REST API', 'React', 'Vite', '<200ms Latency'],
    },
    {
      icon: '🔐',
      title: 'Privacy-First Architecture',
      desc: 'All analysis is performed locally on the server. URLs are never stored after the request lifecycle. No third-party API calls. The Chrome extension communicates only with the local backend.',
      tags: ['No Data Storage', 'Local Processing', 'CORS Protected', 'GDPR Compliant'],
    },
  ]

  const metrics = [
    { label: 'Accuracy',   value: '90.3%', color: 'var(--neon)' },
    { label: 'Precision',  value: '89.9%', color: 'var(--green)' },
    { label: 'Recall',     value: '90.7%', color: 'var(--yellow)' },
    { label: 'F1 Score',   value: '90.3%', color: 'var(--accent2)' },
  ]

  return (
    <>
      {/* Pipeline flow */}
      <div className="page-header">
        <div className="section-label">System Architecture</div>
        <h1 className="page-title">How KavachX Works</h1>
        <p className="page-subtitle">End-to-end pipeline from URL input to phishing verdict in &lt;200ms</p>
      </div>

      <div className="pipeline-flow" style={{ marginBottom: 28 }}>
        {pipeline.map((step, i) => (
          <div key={step.title} className="pipeline-step">
            <div className="pipeline-step-icon">{step.icon}</div>
            <div className="pipeline-step-title">{step.title}</div>
            <div className="pipeline-step-sub">{step.sub}</div>
          </div>
        ))}
      </div>

      {/* Model metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {metrics.map(m => (
          <div key={m.label} className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: m.color, fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6 }}>{m.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Confusion matrix note */}
      <div className="card" style={{ marginBottom: 28, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontSize: '0.9rem' }}>Confusion Matrix (Test Set — 3,429 samples)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            True Positives: 1,553 (correctly identified phishing)<br />
            True Negatives: 1,543 (correctly identified legitimate)<br />
            False Positives: 174 (legitimate flagged as phishing)<br />
            False Negatives: 159 (phishing missed)
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 220 }}>
          {[
            { label: 'TP', value: '1,553', bg: 'var(--green-bg)', border: 'var(--green-bdr)', color: 'var(--green)' },
            { label: 'FP', value: '174',   bg: 'var(--red-bg)',   border: 'var(--red-bdr)',   color: 'var(--red2)' },
            { label: 'FN', value: '159',   bg: 'var(--red-bg)',   border: 'var(--red-bdr)',   color: 'var(--red2)' },
            { label: 'TN', value: '1,543', bg: 'var(--green-bg)', border: 'var(--green-bdr)', color: 'var(--green)' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture cards */}
      <div style={{ marginBottom: 12 }}>
        <div className="section-label">Components</div>
      </div>
      <div className="arch-grid">
        {models.map(m => (
          <div key={m.title} className="arch-card">
            <div className="arch-card-icon">{m.icon}</div>
            <div className="arch-card-title">{m.title}</div>
            <div className="arch-card-desc">{m.desc}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {m.tags.map(tag => (
                <span key={tag} className="badge badge-neon" style={{ fontSize: '0.68rem' }}>{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 18, fontSize: '0.9rem' }}>🛠 Full Tech Stack</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { layer: 'ML Model', stack: 'scikit-learn, joblib, pandas, numpy' },
            { layer: 'Backend API', stack: 'Python, Flask, Flask-CORS, tldextract' },
            { layer: 'Frontend', stack: 'React 18, Vite 7, Chart.js, CSS3' },
            { layer: 'Extension', stack: 'Chrome MV3, Vanilla JS, background service worker' },
            { layer: 'Training', stack: 'RandomizedSearchCV, Random Forest, 11,430 URLs' },
            { layer: 'Dataset', stack: 'Hannousse & Yahiouche (2021) — Mendeley Data' },
          ].map(t => (
            <div key={t.layer} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--neon)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.layer}</div>
              <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{t.stack}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
