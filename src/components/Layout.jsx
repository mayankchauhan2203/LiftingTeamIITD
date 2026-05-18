import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Layout({
  navItems,
  bottomNavItems,
  activeSection,
  onNavigate,
  role,
  children,
}) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isCapt = user?.role === 'captain'

  // Close sidebar whenever the active section changes (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false)
  }, [activeSection])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const avatarClass = role === 'coach' ? 'coach' : isCapt ? 'captain' : 'athlete'
  const portalLabel = role === 'coach' ? 'Coach Portal' : isCapt ? 'Captain Portal' : 'Athlete Portal'
  const roleLabel   = role === 'coach' ? 'Head Coach'   : isCapt ? 'Captain'        : 'Athlete'

  const activeSectionLabel =
    navItems.find(n => n.type === 'item' && n.id === activeSection)?.label ?? 'Dashboard'

  return (
    <div className="dashboard">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🏋️</span>
          <div className="brand-text">
            <h2>IITD Weightlifting</h2>
            <p>{portalLabel}</p>
          </div>
        </div>

        <div className="sidebar-user">
          <div className={`user-avatar ${avatarClass}`}>{user?.initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role-label">
              {roleLabel}
              {isCapt && <span className="badge-captain">CAPTAIN</span>}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) =>
            item.type === 'label' ? (
              <div
                key={`label-${i}`}
                className="nav-section-label"
                style={item.style}
              >
                {item.label}
              </div>
            ) : (
              <div
                key={item.id}
                className={[
                  'nav-item',
                  activeSection === item.id ? 'active' : '',
                  item.captainOnly ? 'captain-only' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onNavigate(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onNavigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <div className="topbar-titles">
              <h1>{activeSectionLabel}</h1>
              <p>IIT Delhi Weightlifting — Season 2025–26</p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-actions">
              {role === 'coach' && (
                <>
                  <button className="btn-secondary" onClick={() => onNavigate('sessions')}>
                    🗓️ Schedule Session
                  </button>
                  <button className="btn-primary" onClick={() => onNavigate('athletes')}>
                    + Add Athlete
                  </button>
                </>
              )}
              {role === 'athlete' && (
                <button className="btn-primary" onClick={() => onNavigate('log')}>
                  📝 Log Session
                </button>
              )}
            </div>
            <div
              className={`user-avatar ${avatarClass} topbar-avatar`}
              onClick={logout}
              title={`Signed in as ${user?.name} — tap to sign out`}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && logout()}
            >
              {user?.initials}
            </div>
          </div>
        </div>

        {/* Section content */}
        <div className="content-area">{children}</div>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="bottom-nav" aria-label="Main navigation">
        <div className="bottom-nav-items">
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              className={[
                'bottom-nav-item',
                activeSection === item.id ? 'active' : '',
                item.captainOnly ? 'captain-tab' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() =>
                item.id === 'menu' ? setSidebarOpen(true) : onNavigate(item.id)
              }
              aria-label={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
