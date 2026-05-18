import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import SessionsSection from '../components/SessionsSection'
import AttendanceScanner from '../components/AttendanceScanner'
import WorkoutCard from '../components/WorkoutCard'
import { supabase } from '../lib/supabase'
import { fetchPlansByDate, subscribeToWorkoutChanges, todayString } from '../services/workoutService'
import { fetchUserAttendanceForPlan, subscribeToAttendance } from '../services/attendanceService'
import { ATHLETES, TEAM_ACTIVITY, UPCOMING_SESSIONS } from '../data/mockData'

/* ── nav config ─────────────────────────────────────── */
const BASE_NAV = [
  { type: 'label', label: 'My Dashboard' },
  { type: 'item', id: 'overview',  icon: '📊', label: 'Overview'    },
  { type: 'item', id: 'progress',  icon: '📈', label: 'My Progress' },
  { type: 'item', id: 'training',  icon: '📋', label: 'My Training' },
  { type: 'item', id: 'schedule',  icon: '🗓️', label: 'Schedule'   },
  { type: 'item', id: 'log',       icon: '📝', label: 'Session Log' },
  { type: 'label', label: 'Team', style: { marginTop: 12 } },
  { type: 'item', id: 'team',      icon: '👥', label: 'Team'        },
]
const CAPTAIN_NAV_EXTRA = [
  { type: 'label', label: '👑 Captain Zone', style: { marginTop: 12 } },
  { type: 'item', id: 'captain-team',       icon: '🗂️', label: 'Manage Team',   captainOnly: true },
  { type: 'item', id: 'captain-announce',   icon: '📣', label: 'Announcements', captainOnly: true },
  { type: 'item', id: 'captain-attendance', icon: '✅', label: 'Attendance',    captainOnly: true },
]
const ATHLETE_BOTTOM_NAV = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'progress', icon: '📈', label: 'Progress' },
  { id: 'schedule', icon: '🗓️', label: 'Schedule'},
  { id: 'team',     icon: '👥', label: 'Team'     },
  { id: 'menu',     icon: '☰',  label: 'Menu'     },
]
const CAPTAIN_BOTTOM_NAV = [
  { id: 'overview',          icon: '📊', label: 'Overview'  },
  { id: 'schedule',          icon: '🗓️', label: 'Schedule' },
  { id: 'team',              icon: '👥', label: 'Team'      },
  { id: 'captain-attendance',icon: '✅', label: 'Attend.',  captainOnly: true },
  { id: 'menu',              icon: '☰',  label: 'Menu'      },
]

/* ── hook: today's plan + my attendance ─────────────── */
function useTodayPlan(userId) {
  const [plan,       setPlan]       = useState(null)
  const [myRecords,  setMyRecords]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const today = todayString()

  async function loadPlan() {
    try {
      const plans = await fetchPlansByDate(today)
      setPlan(plans[0] || null)
    } catch { setPlan(null) }
    finally   { setLoading(false) }
  }

  useEffect(() => {
    loadPlan()
    const ch = subscribeToWorkoutChanges(loadPlan)
    return () => supabase.removeChannel(ch)
  }, [])

  useEffect(() => {
    if (!plan?.id) { setMyRecords([]); return }
    fetchUserAttendanceForPlan(plan.id, userId).then(r => setMyRecords(r || [])).catch(() => {})
    const ch = subscribeToAttendance(plan.id, () =>
      fetchUserAttendanceForPlan(plan.id, userId).then(r => setMyRecords(r || [])).catch(() => {})
    )
    return () => supabase.removeChannel(ch)
  }, [plan?.id, userId])

  return { plan, myRecords, loading, reload: loadPlan }
}

/* ── Schedule section ────────────────────────────────── */
function Schedule({ user, onScanQR }) {
  const { plan, myRecords, loading } = useTodayPlan(user.username)

  const hasCheckin  = myRecords.some(r => r.phase === 'checkin')
  const hasCheckout = myRecords.some(r => r.phase === 'checkout')
  const isCheckinOpen  = plan?.attendance_status === 'checkin_open'
  const isCheckoutOpen = plan?.attendance_status === 'checkout_open'
  const canScanCheckin  = isCheckinOpen  && !hasCheckin
  const canScanCheckout = isCheckoutOpen && !hasCheckout

  if (loading) return <div className="placeholder-section"><p>Loading…</p></div>

  return (
    <>
      {/* Scan banner */}
      {(canScanCheckin || canScanCheckout) && (
        <div className="scan-banner">
          <div>
            <strong>⚡ {canScanCheckin ? 'Check-in' : 'Check-out'} is open!</strong>
            <p style={{ fontSize: 13, marginTop: 3, color: 'var(--text-secondary)' }}>
              Scan the QR code shown by your coach/captain.
            </p>
          </div>
          <button className="btn-gold" onClick={onScanQR}>📷 Scan QR</button>
        </div>
      )}

      {/* Today's workout */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <h2>Today's Workout</h2>
      </div>

      {!plan ? (
        <div className="no-plan-card">
          <span style={{ fontSize: 32 }}>🗓️</span>
          <p>No workout scheduled for today.</p>
        </div>
      ) : (
        <WorkoutCard plan={plan} canControl={false} />
      )}

      {/* My attendance status */}
      {plan && (
        <>
          <div className="section-header" style={{ marginTop: 24, marginBottom: 14 }}>
            <h2>My Attendance</h2>
          </div>
          <div className="card">
            <div className="attend-status-row">
              <div className={`attend-check ${hasCheckin ? 'done' : 'pending'}`}>
                <span className="attend-icon">{hasCheckin ? '✅' : '○'}</span>
                <div>
                  <div className="attend-label">Check-in</div>
                  <div className="attend-sub">
                    {hasCheckin
                      ? `Marked at ${new Date(myRecords.find(r => r.phase === 'checkin')?.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Not yet marked'}
                  </div>
                </div>
              </div>
              <div className={`attend-check ${hasCheckout ? 'done' : 'pending'}`}>
                <span className="attend-icon">{hasCheckout ? '✅' : '○'}</span>
                <div>
                  <div className="attend-label">Check-out</div>
                  <div className="attend-sub">
                    {hasCheckout
                      ? `Marked at ${new Date(myRecords.find(r => r.phase === 'checkout')?.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Not yet marked'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ── Overview section ────────────────────────────────── */
function Overview({ user, onNavigate, onScanQR }) {
  const isCapt = user.role === 'captain'
  const { plan, myRecords } = useTodayPlan(user.username)

  const stats = isCapt
    ? { snatch: 112, cj: 134, bodyWeight: 71.4, weightClass: '73kg' }
    : { snatch: user.bestSnatch ?? 95, cj: user.bestCJ ?? 103, bodyWeight: user.bodyWeight ?? 60.2, weightClass: user.weightClass ?? '61kg' }

  const hasCheckin  = myRecords.some(r => r.phase === 'checkin')
  const hasCheckout = myRecords.some(r => r.phase === 'checkout')
  const canScan = (plan?.attendance_status === 'checkin_open'  && !hasCheckin)
               || (plan?.attendance_status === 'checkout_open' && !hasCheckout)

  return (
    <>
      {/* Live attendance banner */}
      {canScan && (
        <div className="scan-banner" style={{ marginBottom: 16 }}>
          <div>
            <strong>⚡ {plan.attendance_status === 'checkin_open' ? 'Check-in' : 'Check-out'} is open!</strong>
            <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary)' }}>Scan the QR now</p>
          </div>
          <button className="btn-gold" onClick={onScanQR}>📷 Scan QR</button>
        </div>
      )}

      {/* Personal bests */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2>Personal Bests</h2>
        <span className="badge badge-green">↑ 3 PRs this month</span>
      </div>
      <div className="lifts-grid">
        <div className="lift-card">
          <div className="lift-name">Best Snatch</div>
          <div className="lift-value">{stats.snatch}<small> kg</small></div>
          <div className="lift-change">↑ +3kg from last month</div>
        </div>
        <div className="lift-card">
          <div className="lift-name">Best C&amp;J</div>
          <div className="lift-value">{stats.cj}<small> kg</small></div>
          <div className="lift-change">↑ +2kg from last month</div>
        </div>
        <div className="lift-card">
          <div className="lift-name">Total</div>
          <div className="lift-value">{stats.snatch + stats.cj}<small> kg</small></div>
          <div className="lift-change season">Season best</div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Body Weight',         icon: '⚖️', value: stats.bodyWeight, unit: 'kg', note: `${stats.weightClass} category`, cls: 'neutral' },
          { label: 'Sessions This Month', icon: '🗓️', value: 14, note: '↑ 2 from last month', cls: 'up' },
          { label: 'Attendance Rate',     icon: '✅', value: 92,  unit: '%', note: 'Top 3 on team', cls: 'up' },
          { label: 'Current Program',     icon: '📋', value: 'Strength', note: 'Week 4 of 8', cls: 'neutral', small: true },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-header">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className={`stat-value${s.small ? ' stat-value-sm' : ''}`}>{s.value}{s.unit && <span>{s.unit}</span>}</div>
            <div className={`stat-change ${s.cls}`}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Captain Zone */}
      {isCapt && (
        <div className="captain-zone" style={{ marginBottom: 24 }}>
          <div className="captain-zone-header">
            <span className="crown">👑</span>
            <h2>Captain Zone</h2>
            <span className="badge badge-purple">Captain Access</span>
          </div>
          <div className="captain-actions">
            {[
              { icon: '✅', label: 'Attendance & QR', section: 'captain-attendance' },
              { icon: '📣', label: 'Announcements',   section: 'captain-announce'   },
              { icon: '🗂️', label: 'Manage Team',    section: 'captain-team'       },
              { icon: '👥', label: 'View Roster',     section: 'team'               },
            ].map(btn => (
              <button key={btn.section} className="captain-action-btn" onClick={() => onNavigate(btn.section)}>
                <span className="action-icon">{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming sessions (mock) */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <h2>Upcoming Sessions</h2>
      </div>
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
                <div className="session-details">{s.time} · {s.venue}</div>
              </div>
              <span className={`badge ${s.type === 'team' ? 'badge-blue' : 'badge-gold'}`}>
                {s.type === 'team' ? 'Team' : 'Adv.'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ── Other sections ──────────────────────────────────── */
function TeamRoster() {
  return (
    <>
      <div className="section-header" style={{ marginBottom: 18 }}>
        <div><h2>Team Roster</h2><p>IIT Delhi Weightlifting — Season 2025–26</p></div>
      </div>
      <div className="card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Athlete</th><th>Year</th><th>Class</th><th>Snatch</th><th>C&amp;J</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {ATHLETES.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="athlete-cell">
                      <div className={`athlete-avatar-sm${a.role === 'captain' ? ' captain-av' : ''}`}>{a.initials}</div>
                      <span>{a.name}{a.role === 'captain' && <span className="badge-captain" style={{ marginLeft: 5 }}>C</span>}</span>
                    </div>
                  </td>
                  <td>{a.year}</td><td>{a.weightClass}</td>
                  <td>{a.snatch} kg</td><td>{a.cj} kg</td>
                  <td><strong>{a.total} kg</strong></td>
                  <td>
                    {a.status === 'active' && <span className="badge badge-green">Active</span>}
                    {a.status === 'leave'  && <span className="badge badge-gold">On Leave</span>}
                    {a.status === 'new'    && <span className="badge badge-blue">New</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function CaptainAnnouncements() {
  const [title, setTitle] = useState('')
  const [msg, setMsg]     = useState('')
  const [posted, setPosted] = useState(false)
  function handlePost(e) {
    e.preventDefault(); setPosted(true); setTitle(''); setMsg('')
    setTimeout(() => setPosted(false), 3000)
  }
  return (
    <>
      <div className="captain-zone" style={{ marginBottom: 24 }}>
        <div className="captain-zone-header"><span className="crown">👑</span><h2>Post Announcement</h2></div>
        {posted
          ? <div className="alert alert-gold" style={{ marginBottom: 0 }}>✅ Posted!</div>
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
              <button type="submit" className="btn-gold" style={{ alignSelf: 'flex-start' }}>📣 Post to Team</button>
            </form>
          )
        }
      </div>
      <div className="card">
        <div className="activity-list">
          {[
            { color: 'purple', text: "Session rescheduled: Thursday's session moved to Friday 6 AM", time: '2 days ago' },
            { color: 'gold',   text: 'Inter-IIT qualifier on June 14 — register by June 5',          time: '1 week ago' },
          ].map((item, i) => (
            <div className="activity-item" key={i}>
              <div className={`activity-dot ${item.color}`} />
              <div className="activity-text">{item.text}</div>
              <div className="activity-time">{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Placeholder({ icon, title, description }) {
  return (
    <div className="placeholder-section">
      <div className="placeholder-icon">{icon}</div>
      <h3>{title}</h3><p>{description}</p>
    </div>
  )
}

/* ── main page ───────────────────────────────────────── */
export default function AthleteDashboard() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [showScanner,   setShowScanner]   = useState(false)
  const isCapt = user?.role === 'captain'

  const navItems      = isCapt ? [...BASE_NAV, ...CAPTAIN_NAV_EXTRA] : BASE_NAV
  const bottomNavItems = isCapt ? CAPTAIN_BOTTOM_NAV : ATHLETE_BOTTOM_NAV

  return (
    <Layout navItems={navItems} bottomNavItems={bottomNavItems} activeSection={activeSection} onNavigate={setActiveSection} role="athlete">
      {/* QR Scanner modal (global — can open from any section) */}
      {showScanner && (
        <AttendanceScanner
          onClose={() => setShowScanner(false)}
          onSuccess={() => setTimeout(() => setShowScanner(false), 2500)}
        />
      )}

      {activeSection === 'overview'  && <Overview user={user} onNavigate={setActiveSection} onScanQR={() => setShowScanner(true)} />}
      {activeSection === 'schedule'  && <Schedule user={user} onScanQR={() => setShowScanner(true)} />}
      {activeSection === 'team'      && <TeamRoster />}
      {activeSection === 'captain-announce'    && <CaptainAnnouncements />}
      {activeSection === 'captain-attendance'  && <SessionsSection canAdd={false} />}
      {activeSection === 'captain-team' && (
        <div>
          <div className="captain-zone" style={{ marginBottom: 24 }}>
            <div className="captain-zone-header"><span className="crown">👑</span><h2>Manage Team</h2></div>
          </div>
          <Placeholder icon="🗂️" title="Team Management" description="Add or remove members, assign roles, and manage team structure." />
        </div>
      )}
      {activeSection === 'progress' && <Placeholder icon="📈" title="My Progress"         description="Lift history, body weight trends, and performance charts." />}
      {activeSection === 'training' && <Placeholder icon="📋" title="My Training Program"  description="Full breakdown of your assigned training blocks and exercises." />}
      {activeSection === 'log'      && <Placeholder icon="📝" title="Session Log"           description="Log your training sessions and review past workout history." />}
    </Layout>
  )
}
