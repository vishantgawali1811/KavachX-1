const NAV_ITEMS = [
  {
    section: 'Detection',
    items: [
      { key: 'scan',     icon: '🔍', label: 'Real-Time Scan' },
      { key: 'history',  icon: '📜', label: 'Scan History' },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { key: 'analytics', icon: '📊', label: 'Risk Analytics' },
      { key: 'feed',      icon: '🚨', label: 'Live Threat Feed', badge: 'LIVE' },
    ],
  },
  {
    section: 'Platform',
    items: [
      { key: 'institution', icon: '🏫', label: 'Institution Admin' },
      { key: 'extension',   icon: '🧩', label: 'Extension Sync' },
      { key: 'tech',        icon: '🧠', label: 'Architecture' },
    ],
  },
]

export default function Sidebar({ active, onNav, onGoHome }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={onGoHome} title="Back to landing">
        <div className="sidebar-logo-icon">🛡</div>
        <span className="sidebar-logo-text">Kavach<span>X</span></span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(group => (
          <div key={group.section} className="nav-section">
            <div className="nav-section-label">{group.section}</div>
            {group.items.map(item => (
              <div
                key={item.key}
                className={`nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => onNav(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">SU</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Student User</div>
            <div className="sidebar-user-role">Free Plan</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
