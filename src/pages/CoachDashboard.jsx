import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import SessionsSection from '../components/SessionsSection'
import TeamManagement from '../components/TeamManagement'
import { useAuth } from '../context/AuthContext'
import { fetchUpcomingSessions } from '../services/workoutService'
import { fetchRecentActivity, fetchCoachStats, fetchPendingRequests, fetchPendingJoinRequests } from '../services/teamService'
import { fetchAnnouncements, postAnnouncement, deleteAnnouncement } from '../services/announcementService'

/* ── nav config ─────────────────────────────────────── */
const NAV_ITEMS = [
  { type: 'label', label: 'Main' },
  { type: 'item', id: 'overview',       icon: '📊', label: 'Overview'        },
  { type: 'item', id: 'athletes',       icon: '👥', label: 'Athletes'        },
  { type: 'item', id: 'sessions',       icon: '🗓️', label: 'Sessions'       },
  { type: 'item', id: 'announcements',  icon: '📣', label: 'Announcements'   },
  { type: 'label', label: 'Reports', style: { marginTop: 12 } },
  { type: 'item', id: 'progress',       icon: '📈', label: 'Progress Reports'},
  { type: 'item', id: 'records',        icon: '🏆', label: 'Team Records'   },
  { type: 'label', label: 'Account', style: { marginTop: 12 } },
  { type: 'item', id: 'settings',       icon: '⚙️', label: 'Settings'       },
]

const BOTTOM_NAV = [
  { id: 'overview',      icon: '📊', label: 'Overview' },
  { id: 'athletes',      icon: '👥', label: 'Athletes' },
  { id: 'sessions',      icon: '🗓️', label: 'Sessions'},
  { id: 'announcements', icon: '📣', label: 'Announce.'},
  { id: 'menu',          icon: '☰',  label: 'Menu'     },
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

function Announcements({ user }) {
  const [title,   setTitle]   = useState('')
  const [msg,     setMsg]     = useState('')
  const [posting, setPosting] = useState(false)
  const [posted,  setPosted]  = useState(false)
  const [error,   setError]   = useState('')
  const [items,   setItems]   = useState([])

  async function load() {
    fetchAnnouncements(20).then(setItems).catch(() => {})
  }

  useEffect(() => { load() }, [])

  async function handlePost(e) {
    e.preventDefault()
    setPosting(true); setError('')
    try {
      await postAnnouncement(title.trim(), msg.trim(), user.name || user.username)
      setPosted(true); setTitle(''); setMsg('')
      load()
      setTimeout(() => setPosted(false), 3000)
    } catch {
      setError('Failed to post announcement. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      load()
    } catch {
      alert('Failed to delete announcement.')
    }
  }

  return (
    <>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div><h2>Announcements</h2><p>Broadcast messages to the whole team</p></div>
      </div>

      <div className="captain-zone" style={{ marginBottom: 24 }}>
        <div className="captain-zone-header"><span style={{ fontSize: 20 }}>📣</span><h2>Post Announcement</h2></div>
        {error && <div className="alert alert-red" style={{ marginBottom: 12 }}>{error}</div>}
        {posted
          ? <div className="alert alert-gold">✅ Posted! Athletes and captain will see it on their overview.</div>
          : (
            <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Title</label>
                <input type="text" placeholder="e.g. Session rescheduled to Friday" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Message</label>
                <textarea className="announce-textarea" placeholder="Write your message…" value={msg} onChange={e => setMsg(e.target.value)} required />
              </div>
              <button type="submit" className="btn-gold" style={{ alignSelf: 'flex-start' }} disabled={posting}>
                {posting ? 'Posting…' : '📣 Post to Team'}
              </button>
            </form>
          )
        }
      </div>

      <div className="section-header" style={{ marginBottom: 14 }}>
        <h2>Past Announcements</h2>
      </div>
      {items.length === 0 ? (
        <div className="no-plan-card"><p style={{ color: 'var(--text-muted)' }}>No announcements yet.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(a => (
            <div key={a.id} className="announcement-card" style={{ position: 'relative' }}>
              <div className="announcement-header">
                <span className="announcement-title">📣 {a.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="announcement-meta">
                    {a.posted_by_name} · {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    className="att-del-btn"
                    title="Delete announcement"
                    onClick={() => handleDelete(a.id)}
                    style={{ fontSize: 12 }}
                  >✕</button>
                </div>
              </div>
              <p className="announcement-body">{a.message}</p>
            </div>
          ))}
        </div>
      )}
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
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  return (
    <Layout navItems={NAV_ITEMS} bottomNavItems={BOTTOM_NAV} activeSection={activeSection} onNavigate={setActiveSection} role="coach">
      {activeSection === 'overview'      && <Overview onNavigate={setActiveSection} />}
      {activeSection === 'athletes'      && <TeamManagement canEditPR />}
      {activeSection === 'sessions'      && <SessionsSection canAdd canDelete canDeleteAttendance canDownloadAttendance />}
      {activeSection === 'announcements' && <Announcements user={user} />}
      {activeSection === 'progress'      && <Placeholder icon="📈" title="Progress Reports"   description="View and export detailed athlete progress and lift history." />}
      {activeSection === 'records'       && <Placeholder icon="🏆" title="Team Records"        description="All-time bests, PRs, and competition records for the team." />}
      {activeSection === 'settings'      && <Placeholder icon="⚙️" title="Settings"            description="Manage team configuration, categories, and account settings." />}
    </Layout>
  )
}
