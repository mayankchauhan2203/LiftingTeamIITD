import { useState } from 'react'
import Layout from '../components/Layout'
import SessionsSection from '../components/SessionsSection'
import { ATHLETES, TEAM_ACTIVITY, PROGRAMS, UPCOMING_SESSIONS } from '../data/mockData'

/* ── nav config ─────────────────────────────────────── */
const NAV_ITEMS = [
  { type: 'label', label: 'Main' },
  { type: 'item', id: 'overview',  icon: '📊', label: 'Overview'        },
  { type: 'item', id: 'athletes',  icon: '👥', label: 'Athletes'        },
  { type: 'item', id: 'sessions',  icon: '🗓️', label: 'Sessions'       },
  { type: 'item', id: 'programs',  icon: '📋', label: 'Programs'        },
  { type: 'label', label: 'Reports', style: { marginTop: 12 } },
  { type: 'item', id: 'progress',  icon: '📈', label: 'Progress Reports'},
  { type: 'item', id: 'records',   icon: '🏆', label: 'Team Records'   },
  { type: 'label', label: 'Account', style: { marginTop: 12 } },
  { type: 'item', id: 'settings',  icon: '⚙️', label: 'Settings'       },
]

const BOTTOM_NAV = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'athletes', icon: '👥', label: 'Athletes' },
  { id: 'sessions', icon: '🗓️', label: 'Sessions'},
  { id: 'progress', icon: '📈', label: 'Reports'  },
  { id: 'menu',     icon: '☰',  label: 'Menu'     },
]

/* ── helpers ─────────────────────────────────────────── */
const STATUS_BADGE = {
  active: <span className="badge badge-green">Active</span>,
  leave:  <span className="badge badge-gold">On Leave</span>,
  new:    <span className="badge badge-blue">New</span>,
}
const PROGRAM_BADGE = {
  Strength:  <span className="badge badge-gold">Strength</span>,
  Technique: <span className="badge badge-blue">Technique</span>,
  Beginner:  <span className="badge badge-green">Beginner</span>,
}
const SESSION_TYPE_BADGE = {
  team:     <span className="badge badge-blue">Team</span>,
  advanced: <span className="badge badge-gold">Adv.</span>,
}

/* ── sub-sections ────────────────────────────────────── */
function Overview({ onNavigate }) {
  return (
    <>
      <div className="stats-grid">
        {[
          { label: 'Total Athletes',     icon: '👥', value: 14, change: '↑ 2 new this semester', cls: 'up'      },
          { label: 'Active Programs',    icon: '📋', value: 3,  change: 'Strength, Technique, Beginner', cls: 'neutral' },
          { label: 'Sessions This Week', icon: '🗓️', value: 5, change: '↑ 1 from last week',    cls: 'up'      },
          { label: 'New PRs This Month', icon: '🏆', value: 8,  change: '↑ 3 from last month',  cls: 'up'      },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-header">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.cls}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div>
          <div className="section-header">
            <div><h2>Team Roster</h2><p>Active athletes this semester</p></div>
            <button className="btn-secondary" onClick={() => onNavigate('athletes')}>View All</button>
          </div>
          <div className="card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>Athlete</th><th>Class</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {ATHLETES.slice(0, 5).map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="athlete-cell">
                          <div className={`athlete-avatar-sm${a.role === 'captain' ? ' captain-av' : ''}`}>{a.initials}</div>
                          <span>
                            {a.name}
                            {a.role === 'captain' && <span className="badge-captain" style={{ marginLeft: 5 }}>C</span>}
                          </span>
                        </div>
                      </td>
                      <td>{a.weightClass}</td>
                      <td><strong>{a.total} kg</strong></td>
                      <td>{STATUS_BADGE[a.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="section-header"><h2>Recent Activity</h2></div>
          <div className="card">
            <div className="activity-list">
              {TEAM_ACTIVITY.map(item => (
                <div className="activity-item" key={item.id}>
                  <div className={`activity-dot ${item.color}`} />
                  <div className="activity-text">
                    {item.text.map((part, i) =>
                      i === 0 || i === 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                    )}
                  </div>
                  <div className="activity-time">{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="section-header"><h2>Upcoming Sessions</h2></div>
          <div className="card">
            <div className="schedule-list">
              {UPCOMING_SESSIONS.map(s => (
                <div className="schedule-item" key={s.id}>
                  <div className="schedule-date">
                    <div className="day">{s.day}</div>
                    <div className="month">{s.month}</div>
                  </div>
                  <div className="schedule-divider" />
                  <div className="schedule-info">
                    <div className="session-name">{s.name}</div>
                    <div className="session-details">{s.time} · {s.venue} · {s.group}</div>
                  </div>
                  {SESSION_TYPE_BADGE[s.type]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-header"><h2>Program Progress</h2></div>
          <div className="card">
            {PROGRAMS.map(p => (
              <div className="progress-wrap" key={p.label}>
                <div className="progress-label"><span>{p.label}</span><span>{p.pct}%</span></div>
                <div className="progress-bar">
                  <div className={`progress-fill${p.colorClass ? ` ${p.colorClass}` : ''}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function Athletes() {
  return (
    <>
      <div className="section-header" style={{ marginBottom: 18 }}>
        <div><h2>All Athletes</h2><p>{ATHLETES.length} registered athletes</p></div>
        <button className="btn-primary">+ Add Athlete</button>
      </div>
      <div className="card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Athlete</th><th>Year</th><th>Class</th><th>Snatch</th><th>C&amp;J</th><th>Total</th><th>Program</th><th>Status</th></tr>
            </thead>
            <tbody>
              {ATHLETES.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="athlete-cell">
                      <div className={`athlete-avatar-sm${a.role === 'captain' ? ' captain-av' : ''}`}>{a.initials}</div>
                      <span>
                        {a.name}
                        {a.role === 'captain' && <span className="badge-captain" style={{ marginLeft: 5 }}>C</span>}
                      </span>
                    </div>
                  </td>
                  <td>{a.year}</td><td>{a.weightClass}</td>
                  <td>{a.snatch} kg</td><td>{a.cj} kg</td>
                  <td><strong>{a.total} kg</strong></td>
                  <td>{PROGRAM_BADGE[a.program]}</td>
                  <td>{STATUS_BADGE[a.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Placeholder({ icon, title, description }) {
  return (
    <div className="placeholder-section">
      <div className="placeholder-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

/* ── main page ───────────────────────────────────────── */
export default function CoachDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  return (
    <Layout navItems={NAV_ITEMS} bottomNavItems={BOTTOM_NAV} activeSection={activeSection} onNavigate={setActiveSection} role="coach">
      {activeSection === 'overview'  && <Overview onNavigate={setActiveSection} />}
      {activeSection === 'athletes'  && <Athletes />}
      {activeSection === 'sessions'  && <SessionsSection canAdd />}
      {activeSection === 'programs'  && <Placeholder icon="📋" title="Training Programs" description="Create and manage structured training blocks for your athletes." />}
      {activeSection === 'progress'  && <Placeholder icon="📈" title="Progress Reports"   description="View and export detailed athlete progress and lift history." />}
      {activeSection === 'records'   && <Placeholder icon="🏆" title="Team Records"        description="All-time bests, PRs, and competition records for the team." />}
      {activeSection === 'settings'  && <Placeholder icon="⚙️" title="Settings"            description="Manage team configuration, categories, and account settings." />}
    </Layout>
  )
}
