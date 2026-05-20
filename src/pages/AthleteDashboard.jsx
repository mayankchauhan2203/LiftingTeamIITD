import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import SessionsSection from '../components/SessionsSection'
import TeamManagement from '../components/TeamManagement'
import AttendanceScanner from '../components/AttendanceScanner'
import AttendanceQRModal from '../components/AttendanceQRModal'
import WorkoutCard from '../components/WorkoutCard'
import { supabase } from '../lib/supabase'
import { fetchPlansByDate, subscribeToWorkoutChanges, todayString, updateAttendanceStatus } from '../services/workoutService'
import { fetchUserAttendanceForPlan, subscribeToAttendance } from '../services/attendanceService'
import {
  fetchTeamMemberByKerberos, updateAthleteStats, createPRChangeRequest,
  fetchJoinRequestByKerberos, createJoinRequest,
} from '../services/teamService'
import { ATHLETES, UPCOMING_SESSIONS } from '../data/mockData'

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
  const isCapt = user.role === 'captain'
  const { plan, myRecords, loading } = useTodayPlan(user.username)
  const [qrModal, setQrModal] = useState(null)

  const hasCheckin  = myRecords.some(r => r.phase === 'checkin')
  const hasCheckout = myRecords.some(r => r.phase === 'checkout')
  const isCheckinOpen  = plan?.attendance_status === 'checkin_open'
  const isCheckoutOpen = plan?.attendance_status === 'checkout_open'
  const canScanCheckin  = isCheckinOpen  && !hasCheckin
  const canScanCheckout = isCheckoutOpen && !hasCheckout

  async function handleStatusUpdate(planId, newStatus) {
    try {
      await updateAttendanceStatus(planId, newStatus)
      if (newStatus === 'checkin_open' || newStatus === 'checkout_open') {
        const phase = newStatus === 'checkin_open' ? 'checkin' : 'checkout'
        setQrModal({ planId, phase, title: plan?.title ?? '' })
      }
      if ((newStatus === 'checkin_done' || newStatus === 'done') && qrModal?.planId === planId) {
        setQrModal(null)
      }
    } catch {
      alert('Failed to update attendance status. Please try again.')
    }
  }

  if (loading) return <div className="placeholder-section"><p>Loading…</p></div>

  return (
    <>
      {qrModal && (
        <AttendanceQRModal
          planId={qrModal.planId}
          phase={qrModal.phase}
          title={qrModal.title}
          onClose={() => setQrModal(null)}
        />
      )}

      {/* Scan banner — shown to all athletes (including captain) when attendance is open */}
      {(canScanCheckin || canScanCheckout) && (
        <div className="scan-banner">
          <div>
            <strong>⚡ {canScanCheckin ? 'Check-in' : 'Check-out'} is open!</strong>
            <p style={{ fontSize: 13, marginTop: 3, color: 'var(--text-secondary)' }}>
              {isCapt ? 'Use the QR controls below or scan to mark your own attendance.' : 'Scan the QR code shown by your coach/captain.'}
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
      ) : !hasCheckin && !isCapt ? (
        <div className="no-plan-card">
          <span style={{ fontSize: 32 }}>🔒</span>
          <p>Check in to view today's workout plan.</p>
          {isCheckinOpen && (
            <button className="btn-gold" style={{ marginTop: 12 }} onClick={onScanQR}>
              📷 Scan QR to Check In
            </button>
          )}
        </div>
      ) : (
        <WorkoutCard
          plan={plan}
          canControl={isCapt}
          onOpenQR={phase => setQrModal({ planId: plan.id, phase, title: plan.title })}
          onUpdateStatus={status => handleStatusUpdate(plan.id, status)}
        />
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

function MyProgress({ dbProfile, loading, onUpdateClick }) {
  if (loading) {
    return <div className="placeholder-section"><p>Loading profile...</p></div>
  }

  const formatVal = (val, unit = 'kg') => {
    return val ? `${val} ${unit}` : '—'
  }

  const formatDate = (isoString) => {
    if (!isoString) return '[Never updated]'
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return '[Never updated]'
    
    // Format as 20-May-2026
    const day = d.getDate().toString().padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = d.getFullYear()
    return `[${day}-${month}-${year}]`
  }

  const totalPR = (dbProfile?.snatch_pr || 0) + (dbProfile?.cj_pr || 0)

  const cards = [
    { title: 'Body Weight',  value: formatVal(dbProfile?.body_weight), date: formatDate(dbProfile?.body_weight_updated_at), color: 'neutral' },
    { title: 'Best Snatch', value: formatVal(dbProfile?.snatch_pr), date: formatDate(dbProfile?.snatch_pr_updated_at), color: 'green' },
    { title: 'Best Clean & Jerk', value: formatVal(dbProfile?.cj_pr), date: formatDate(dbProfile?.cj_pr_updated_at), color: 'blue' },
    { title: 'Front Squat PR', value: formatVal(dbProfile?.front_squat_pr), date: formatDate(dbProfile?.front_squat_pr_updated_at), color: 'purple' },
    { title: 'Back Squat PR', value: formatVal(dbProfile?.back_squat_pr), date: formatDate(dbProfile?.back_squat_pr_updated_at), color: 'gold' },
    { title: 'Deadlift PR', value: formatVal(dbProfile?.deadlift_pr), date: formatDate(dbProfile?.deadlift_pr_updated_at), color: 'red' },
  ]

  return (
    <div className="progress-section-container">
      <div className="section-header" style={{ marginBottom: 18 }}>
        <div>
          <h2>My Lift Progress</h2>
          <p>Real-time PRs & stats tracker</p>
        </div>
        <button className="btn-primary" onClick={onUpdateClick}>⚡ Update Stats</button>
      </div>

      {/* Lift Total summary bar */}
      <div className="card total-pr-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '1.25rem' }}>
        <div>
          <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Olympic Total</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {totalPR > 0 ? `${totalPR} kg` : '—'}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="badge badge-green">Active Athlete</span>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            {dbProfile?.weight_class ? `${dbProfile.weight_class} Category` : 'Weight class not set'}
          </p>
        </div>
      </div>

      <div className="lifts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {cards.map((c, i) => (
          <div className="lift-card" key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 140 }}>
            <div>
              <div className="lift-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="lift-name" style={{ margin: 0 }}>{c.title}</span>
                <span className="lift-icon" style={{ fontSize: '1.25rem' }}>{c.icon}</span>
              </div>
              <div className="lift-value" style={{ fontSize: '2.25rem', fontWeight: 800 }}>
                {c.value}
              </div>
            </div>
            <div className="lift-change" style={{ marginTop: 10, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
              {c.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UpdateProgressModal({ dbProfile, onClose, onSave }) {
  const [form, setForm] = useState({
    bodyWeight: dbProfile?.body_weight ?? '',
    snatch: dbProfile?.snatch_pr ?? '',
    cj: dbProfile?.cj_pr ?? '',
    frontSquat: dbProfile?.front_squat_pr ?? '',
    backSquat: dbProfile?.back_squat_pr ?? '',
    deadlift: dbProfile?.deadlift_pr ?? '',
  })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [submitted, setSubmitted] = useState(null)

  function handleChange(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await onSave(form)
      if (result?.prRequestSent) {
        setSubmitted(result)
        setTimeout(onClose, 3000)
      } else {
        onClose()
      }
    } catch {
      setError('Failed to update stats. Please try again.')
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Update My Lifts & Stats</h2>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            {submitted.bodyUpdated && (
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Body weight updated.</p>
            )}
            <p style={{ color: 'var(--text-muted)' }}>
              Your PR changes have been sent to the coach for approval.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update My Lifts & Stats</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="alert alert-red">{error}</div>}
            
            <div className="form-group">
              <label>Body Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                placeholder="e.g. 71.4"
                value={form.bodyWeight}
                onChange={e => handleChange('bodyWeight', e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Snatch PR (kg)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  placeholder="e.g. 112"
                  value={form.snatch}
                  onChange={e => handleChange('snatch', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Clean & Jerk PR (kg)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  placeholder="e.g. 134"
                  value={form.cj}
                  onChange={e => handleChange('cj', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Front Squat PR (kg)</label>
                <input
                  type="number"
                  min="0"
                  max="400"
                  placeholder="e.g. 145"
                  value={form.frontSquat}
                  onChange={e => handleChange('frontSquat', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Back Squat PR (kg)</label>
                <input
                  type="number"
                  min="0"
                  max="400"
                  placeholder="e.g. 160"
                  value={form.backSquat}
                  onChange={e => handleChange('backSquat', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Deadlift PR (kg)</label>
              <input
                type="number"
                min="0"
                max="500"
                placeholder="e.g. 180"
                value={form.deadlift}
                onChange={e => handleChange('deadlift', e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

/* ── Join Request Screen ─────────────────────────────── */
function JoinRequestScreen({ user, joinRequest, onRequestSent, onSignOut }) {
  const [year,    setYear]    = useState('')
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')

  async function handleRequest() {
    setSending(true); setError('')
    try {
      await createJoinRequest(user.username, user.name, year)
      onRequestSent()
    } catch {
      setError('Failed to send request. Please try again.')
      setSending(false)
    }
  }

  const status = joinRequest?.status

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="barbell-icon">🏋️</span>
          <h1>IIT Delhi Weightlifting</h1>
        </div>
        <div className="login-card">
          {status === 'pending' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <h2 style={{ marginBottom: 8 }}>Request Pending</h2>
              <p style={{ color: 'var(--text-muted)' }}>Your request to join the team is awaiting coach approval.</p>
            </div>
          ) : status === 'rejected' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h2 style={{ marginBottom: 8 }}>Request Not Approved</h2>
              <p style={{ color: 'var(--text-muted)' }}>Your request was not approved. Please contact the coach directly.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ marginBottom: 6 }}>Join the Team</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  You're not a registered team member yet. Submit a request to join.
                </p>
              </div>
              {error && <div className="alert alert-red" style={{ marginBottom: 16 }}>{error}</div>}
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={user.name} disabled />
              </div>
              <div className="form-group">
                <label>Kerberos ID / Entry Number</label>
                <input type="text" value={user.username} disabled />
              </div>
              <div className="form-group">
                <label>Year <span className="label-opt">(optional)</span></label>
                <input type="text" placeholder="e.g. 1st Year" value={year} onChange={e => setYear(e.target.value)} />
              </div>
              <button className="btn-primary" style={{ width: '100%' }} onClick={handleRequest} disabled={sending}>
                {sending ? 'Sending…' : 'Request to Join'}
              </button>
            </>
          )}
          <button
            onClick={onSignOut}
            style={{ marginTop: 20, width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main page ───────────────────────────────────────── */
export default function AthleteDashboard() {
  const { user, logout } = useAuth()
  const [activeSection,   setActiveSection]   = useState('overview')
  const [showScanner,     setShowScanner]     = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  const [dbProfile,      setDbProfile]      = useState(null)
  const [notInTeam,      setNotInTeam]      = useState(false)
  const [joinRequest,    setJoinRequest]    = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const isCapt = user?.role === 'captain'

  async function loadProfile() {
    if (!user?.username) return
    setLoadingProfile(true)
    setNotInTeam(false)
    try {
      const data = await fetchTeamMemberByKerberos(user.username)
      if (data) {
        setDbProfile(data)
      } else {
        setNotInTeam(true)
        const req = await fetchJoinRequestByKerberos(user.username).catch(() => null)
        setJoinRequest(req)
      }
    } catch (err) {
      console.error('Error loading athlete profile:', err)
      setNotInTeam(true)
      setJoinRequest(null)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [user?.username])

  async function handleSaveStats(formValues) {
    if (!dbProfile) return

    const directUpdates = {}
    const prChanges = {}

    const parseVal = v => v === '' ? null : Number(v)

    const bwNew = parseVal(formValues.bodyWeight)
    const bwOld = dbProfile.body_weight ?? null
    if (bwNew !== bwOld) {
      directUpdates.body_weight = bwNew
      directUpdates.body_weight_updated_at = new Date().toISOString()
    }

    const prFields = [
      ['snatch',     'snatch_pr'],
      ['cj',         'cj_pr'],
      ['frontSquat', 'front_squat_pr'],
      ['backSquat',  'back_squat_pr'],
      ['deadlift',   'deadlift_pr'],
    ]
    for (const [formField, dbField] of prFields) {
      const newVal = parseVal(formValues[formField])
      const oldVal = dbProfile[dbField] ?? null
      if (newVal !== oldVal) prChanges[dbField] = { old: oldVal, new: newVal }
    }

    const hasDirectUpdates = Object.keys(directUpdates).length > 0
    const hasPRChanges     = Object.keys(prChanges).length > 0
    if (!hasDirectUpdates && !hasPRChanges) return { bodyUpdated: false, prRequestSent: false }

    try {
      if (hasDirectUpdates) {
        if (dbProfile.id) {
          await updateAthleteStats(dbProfile.id, directUpdates)
        } else {
          const newRecord = {
            kerberos_id: user.username,
            name: user.name,
            initials: user.initials,
            role: user.role || 'athlete',
            weight_class: user.weightClass || null,
            year: user.year || null,
            ...directUpdates,
          }
          const { error } = await supabase.from('team_members').upsert(newRecord, { onConflict: 'kerberos_id' })
          if (error) throw error
        }
        await loadProfile()
      }

      if (hasPRChanges) {
        await createPRChangeRequest(user.username, user.name, prChanges)
      }

      return { bodyUpdated: hasDirectUpdates, prRequestSent: hasPRChanges }
    } catch (err) {
      console.error('Error saving progress stats:', err)
      throw err
    }
  }

  const navItems       = isCapt ? [...BASE_NAV, ...CAPTAIN_NAV_EXTRA] : BASE_NAV
  const bottomNavItems = isCapt ? CAPTAIN_BOTTOM_NAV : ATHLETE_BOTTOM_NAV

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (notInTeam) {
    return (
      <JoinRequestScreen
        user={user}
        joinRequest={joinRequest}
        onRequestSent={loadProfile}
        onSignOut={logout}
      />
    )
  }

  return (
    <Layout navItems={navItems} bottomNavItems={bottomNavItems} activeSection={activeSection} onNavigate={setActiveSection} role="athlete">
      {/* QR Scanner modal (global — can open from any section) */}
      {showScanner && (
        <AttendanceScanner
          onClose={() => setShowScanner(false)}
          onSuccess={() => setTimeout(() => setShowScanner(false), 2500)}
        />
      )}

      {/* Stats Update Modal */}
      {showUpdateModal && (
        <UpdateProgressModal
          dbProfile={dbProfile}
          onClose={() => setShowUpdateModal(false)}
          onSave={handleSaveStats}
        />
      )}

      {activeSection === 'overview'  && <Overview user={user} onNavigate={setActiveSection} onScanQR={() => setShowScanner(true)} />}
      {activeSection === 'schedule'  && <Schedule user={user} onScanQR={() => setShowScanner(true)} />}
      {activeSection === 'team'      && <TeamRoster />}
      {activeSection === 'captain-announce'    && <CaptainAnnouncements />}
      {activeSection === 'captain-attendance'  && <SessionsSection canAdd={false} canDeleteAttendance />}
      {activeSection === 'captain-team'        && <TeamManagement canEditPR={false} />}
      {activeSection === 'progress' && (
        <MyProgress
          dbProfile={dbProfile}
          loading={loadingProfile}
          onUpdateClick={() => setShowUpdateModal(true)}
        />
      )}
      {activeSection === 'training' && <Placeholder icon="📋" title="My Training Program"  description="Full breakdown of your assigned training blocks and exercises." />}
      {activeSection === 'log'      && <Placeholder icon="📝" title="Session Log"           description="Log your training sessions and review past workout history." />}
    </Layout>
  )
}
