import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import SessionsSection from '../components/SessionsSection'
import TeamManagement from '../components/TeamManagement'
import { fetchUpcomingSessions } from '../services/workoutService'
import { fetchRecentActivity, fetchCoachStats, fetchPendingRequests, fetchPendingJoinRequests } from '../services/teamService'
import { fetchAnnouncements } from '../services/announcementService'

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
function formatSessionDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day:   d.getDate(),
    month: d.toLocaleString('en-IN', { month: 'short' }),
  }
}

/* ── sub-sections ────────────────────────────────────── */
function Overview({ onNavigate }) {
  const [stats,         setStats]         = useState({ totalAthletes: 0, sessionsThisWeek: 0, newPRsThisMonth: 0, pendingApprovals: 0 })
  const [activity,      setActivity]      = useState([])
  const [upcoming,      setUpcoming]      = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [coachStats, recentActivity, upcomingSessions, announcementList] = await Promise.all([
          fetchCoachStats(),
          fetchRecentActivity(),
          fetchUpcomingSessions(3),
          fetchAnnouncements(3),
        ])
        setStats(coachStats)
        setActivity(recentActivity)
        setUpcoming(upcomingSessions)
        setAnnouncements(announcementList)
      } catch (e) {
        console.error('[CoachOverview]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Total Athletes',     icon: '👥', value: stats.totalAthletes,    sub: 'Registered team members' },
    { label: 'Sessions This Week', icon: '🗓️', value: stats.sessionsThisWeek, sub: 'Scheduled this week'     },
    { label: 'New PRs This Month', icon: '🏆', value: stats.newPRsThisMonth,  sub: 'Coach-approved PRs'      },
    { label: 'Pending Approvals',  icon: '⏳', value: stats.pendingApprovals,  sub: 'Awaiting your review',
      cls: stats.pendingApprovals > 0 ? 'up' : 'neutral' },
  ]

  return (
    <>
      {announcements.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {announcements.map(a => (
            <div key={a.id} className="announcement-card">
              <div className="announcement-header">
                <span className="announcement-title">📣 {a.title}</span>
                <span className="announcement-meta">
                  {a.posted_by_name} · {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="announcement-body">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="stats-grid">
        {statCards.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-header">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className={`stat-change ${s.cls ?? 'neutral'}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div>
          <div className="section-header">
            <div><h2>Recent Activity</h2><p>Latest team updates</p></div>
            <button className="btn-secondary" onClick={() => onNavigate('athletes')}>View Athletes</button>
          </div>
          <div className="card">
            {loading ? (
              <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : activity.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No recent activity yet.
              </div>
            ) : (
              <div className="activity-list">
                {activity.map(item => (
                  <div className="activity-item" key={item.id}>
                    <div className={`activity-dot ${item.color}`} />
                    <div className="activity-text">
                      {item.text.map((part, i) =>
                        i % 2 === 0 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                      )}
                    </div>
                    <div className="activity-time">{item.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="section-header">
            <h2>Upcoming Sessions</h2>
            <button className="btn-secondary" onClick={() => onNavigate('sessions')}>View All</button>
          </div>
          <div className="card">
            {loading ? (
              <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading…</div>
            ) : upcoming.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No upcoming sessions scheduled.
              </div>
            ) : (
              <div className="schedule-list">
                {upcoming.map(s => {
                  const { day, month } = formatSessionDate(s.date)
                  return (
                    <div className="schedule-item" key={s.id}>
                      <div className="schedule-date">
                        <div className="day">{day}</div>
                        <div className="month">{month}</div>
                      </div>
                      <div className="schedule-divider" />
                      <div className="schedule-info">
                        <div className="session-name">{s.title}</div>
                        {s.description && (
                          <div className="session-details">{s.description}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
      {activeSection === 'athletes'  && <TeamManagement canEditPR />}
      {activeSection === 'sessions'  && <SessionsSection canAdd canDelete canDeleteAttendance canDownloadAttendance />}
      {activeSection === 'programs'  && <Placeholder icon="📋" title="Training Programs" description="Create and manage structured training blocks for your athletes." />}
      {activeSection === 'progress'  && <Placeholder icon="📈" title="Progress Reports"   description="View and export detailed athlete progress and lift history." />}
      {activeSection === 'records'   && <Placeholder icon="🏆" title="Team Records"        description="All-time bests, PRs, and competition records for the team." />}
      {activeSection === 'settings'  && <Placeholder icon="⚙️" title="Settings"            description="Manage team configuration, categories, and account settings." />}
    </Layout>
  )
}
