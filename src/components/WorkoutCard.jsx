import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAttendanceForPlan, subscribeToAttendance } from '../services/attendanceService'

const STATUS_CONFIG = {
  not_started: {
    label: 'Not Started',
    badgeCls: 'badge-muted',
    nextBtn:  { label: '🟢 Open Check-in',  nextStatus: 'checkin_open'  },
  },
  checkin_open: {
    label: '⚡ Check-in Open',
    badgeCls: 'badge-green badge-pulse',
    qrPhase: 'checkin',
    closeBtn: { label: '🔴 Close Check-in', nextStatus: 'checkin_done'  },
  },
  checkin_done: {
    label: 'Check-in Closed',
    badgeCls: 'badge-blue',
    nextBtn:  { label: '🟢 Open Check-out', nextStatus: 'checkout_open' },
  },
  checkout_open: {
    label: '⚡ Check-out Open',
    badgeCls: 'badge-gold badge-pulse',
    qrPhase: 'checkout',
    closeBtn: { label: '🔴 Close Check-out', nextStatus: 'done'         },
  },
  done: {
    label: '✅ Complete',
    badgeCls: 'badge-muted',
  },
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const VARIATION_TYPES = ['Snatch', 'C&J']

function getExerciseName(ex) {
  // Legacy format: { name, sets, reps, weight }
  if (typeof ex.name === 'string') return ex.name
  // New format
  const base = ex.type === 'Other' ? (ex.customName || 'Exercise') : (ex.type || 'Exercise')
  if (!VARIATION_TYPES.includes(ex.type)) return base
  if (!ex.variation || ex.variation === 'Standard') return base
  const prefix = ex.variation === 'Other' ? (ex.customVariation || '') : ex.variation
  return prefix ? `${prefix} ${base}` : base
}

// Returns array of chip labels, or a single legacy string, or null
function getSetChips(ex) {
  // Other type — no sets to show
  if (ex.type === 'Other') return null
  // Legacy format: { name, sets, reps, weight }
  if (typeof ex.name === 'string') {
    const txt = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && `@ ${ex.weight}`]
      .filter(Boolean).join(' · ')
    return txt ? [txt] : null
  }
  // New format: array of { reps, pct, repeat }
  if (!Array.isArray(ex.sets) || ex.sets.length === 0) return null
  return ex.sets.map(s => {
    const r = s.repeat && Number(s.repeat) > 1 ? Number(s.repeat) : 1
    const reps = s.reps || '?'
    const pct  = s.pct  || '?'
    return `${r}×${reps} @ ${pct}%`
  })
}

function formatCardDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today    = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const card     = new Date(dateStr + 'T00:00:00'); card.setHours(0,0,0,0)

  if (+card === +today)    return 'Today'
  if (+card === +tomorrow) return 'Tomorrow'
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

/* ── Attendance list (coach / captain only) ───────────── */
function AttendanceList({ planId }) {
  const [records, setRecords] = useState([])

  useEffect(() => {
    fetchAttendanceForPlan(planId).then(d => setRecords(d || [])).catch(() => {})
    const channel = subscribeToAttendance(planId, () => {
      fetchAttendanceForPlan(planId).then(d => setRecords(d || [])).catch(() => {})
    })
    return () => supabase.removeChannel(channel)
  }, [planId])

  // Merge checkin + checkout rows into one row per athlete
  const byUser = {}
  records.forEach(r => {
    if (!byUser[r.user_id]) {
      byUser[r.user_id] = { name: r.user_name, initials: r.user_initials, checkin: null, checkout: null }
    }
    byUser[r.user_id][r.phase] = r.marked_at
  })
  const athletes = Object.values(byUser)

  if (athletes.length === 0) return null

  return (
    <div className="att-list">
      <div className="att-list-header">
        <span>Attendance</span>
        <span className="att-count">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="att-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Check-in</th>
              <th>Check-out</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map(a => (
              <tr key={a.name}>
                <td>
                  <div className="att-athlete-cell">
                    <div className="att-avatar">{a.initials}</div>
                    <span>{a.name}</span>
                  </div>
                </td>
                <td>
                  <span className={`att-time ${a.checkin ? 'done' : 'pending'}`}>
                    {a.checkin ? fmtTime(a.checkin) : '—'}
                  </span>
                </td>
                <td>
                  <span className={`att-time ${a.checkout ? 'done' : 'pending'}`}>
                    {a.checkout ? fmtTime(a.checkout) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── WorkoutCard ──────────────────────────────────────── */
export default function WorkoutCard({ plan, canControl = false, onOpenQR, onUpdateStatus }) {
  const cfg = STATUS_CONFIG[plan.attendance_status] ?? STATUS_CONFIG.not_started
  const hasAttendance = plan.attendance_status !== 'not_started'

  return (
    <div className="workout-card">
      {/* Header */}
      <div className="workout-card-header">
        <div className="workout-card-meta">
          <span className="workout-card-date">{formatCardDate(plan.date)}</span>
          <span className={`badge ${cfg.badgeCls}`}>{cfg.label}</span>
        </div>
        <h3 className="workout-card-title">{plan.title}</h3>
        {plan.description && (
          <p className="workout-card-desc">{plan.description}</p>
        )}
      </div>

      {/* Exercise list */}
      {plan.exercises && plan.exercises.length > 0 && (
        <div className="workout-exercises">
          {plan.exercises.map((ex, i) => {
            const chips = getSetChips(ex)
            return (
              <div className="exercise-row" key={i}>
                <span className="exercise-name">{getExerciseName(ex)}</span>
                {/* Set chips */}
                {chips && chips.length > 0 && (
                  <div className="exercise-set-chips">
                    {chips.map((chip, ci) => (
                      <span className="exercise-set-chip" key={ci}>{chip}</span>
                    ))}
                  </div>
                )}
                {/* Free-text description (Other type) */}
                {ex.customDescription && (
                  <span className="exercise-notes">{ex.customDescription}</span>
                )}
                {/* Coach note */}
                {ex.notes && (
                  <span className="exercise-coach-note">💬 {ex.notes}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Attendance list — coach / captain only, once check-in has started */}
      {canControl && hasAttendance && (
        <AttendanceList planId={plan.id} />
      )}

      {/* Action buttons */}
      {canControl && (
        <div className="workout-actions">
          {cfg.qrPhase && (
            <button className="btn-gold" onClick={() => onOpenQR(cfg.qrPhase)}>
              📱 Show QR Code
            </button>
          )}
          {cfg.nextBtn && (
            <button className="btn-primary" onClick={() => onUpdateStatus(cfg.nextBtn.nextStatus)}>
              {cfg.nextBtn.label}
            </button>
          )}
          {cfg.closeBtn && (
            <button className="btn-secondary" onClick={() => onUpdateStatus(cfg.closeBtn.nextStatus)}>
              {cfg.closeBtn.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
