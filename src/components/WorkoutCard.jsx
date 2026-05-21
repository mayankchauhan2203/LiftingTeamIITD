import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAttendanceForPlan, subscribeToAttendance, deleteAttendanceRecord } from '../services/attendanceService'

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
  if (typeof ex.name === 'string') return ex.name
  const base = ex.type === 'Other' ? (ex.customName || 'Exercise') : (ex.type || 'Exercise')
  if (!VARIATION_TYPES.includes(ex.type)) return base
  if (!ex.variation || ex.variation === 'Standard') return base
  const prefix = ex.variation === 'Other' ? (ex.customVariation || '') : ex.variation
  return prefix ? `${prefix} ${base}` : base
}

function getSetChips(ex) {
  if (ex.type === 'Other') return null
  if (typeof ex.name === 'string') {
    const txt = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && `@ ${ex.weight}`]
      .filter(Boolean).join(' · ')
    return txt ? [txt] : null
  }
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

function downloadAttendanceCSV(plan, records) {
  const byUser = {}
  for (const r of records) {
    if (!byUser[r.user_id]) byUser[r.user_id] = { name: r.user_name, checkin: null, checkout: null }
    if (r.phase === 'checkin')  byUser[r.user_id].checkin  = r.marked_at
    if (r.phase === 'checkout') byUser[r.user_id].checkout = r.marked_at
  }
  const rows = [['Name', 'Kerberos ID', 'Check-in', 'Check-out']]
  for (const [uid, d] of Object.entries(byUser)) {
    rows.push([
      d.name, uid,
      d.checkin  ? new Date(d.checkin).toLocaleString('en-IN')  : '',
      d.checkout ? new Date(d.checkout).toLocaleString('en-IN') : '',
    ])
  }
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `attendance_${plan.date}_${plan.title.replace(/\s+/g, '_')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── Attendance list (coach / captain only) ───────────── */
function AttendanceList({ plan, canDeleteAttendance, canDownload }) {
  const planId = plan.id
  const [records, setRecords] = useState([])

  async function load() {
    fetchAttendanceForPlan(planId).then(d => setRecords(d || [])).catch(() => {})
  }

  useEffect(() => {
    load()
    const channel = subscribeToAttendance(planId, load)
    return () => supabase.removeChannel(channel)
  }, [planId])

  async function handleDeleteRecord(id) {
    if (!window.confirm('Remove this attendance record?')) return
    try {
      await deleteAttendanceRecord(id)
      load()
    } catch {
      alert('Failed to delete attendance record. Please try again.')
    }
  }

  // Merge checkin + checkout rows into one row per athlete, keeping IDs
  const byUser = {}
  records.forEach(r => {
    if (!byUser[r.user_id]) {
      byUser[r.user_id] = { name: r.user_name, initials: r.user_initials,
        checkin: null, checkinId: null, checkout: null, checkoutId: null }
    }
    if (r.phase === 'checkin')  { byUser[r.user_id].checkin  = r.marked_at; byUser[r.user_id].checkinId  = r.id }
    if (r.phase === 'checkout') { byUser[r.user_id].checkout = r.marked_at; byUser[r.user_id].checkoutId = r.id }
  })
  const athletes = Object.values(byUser)

  if (athletes.length === 0) return null

  return (
    <div className="att-list">
      <div className="att-list-header">
        <span>Attendance</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="att-count">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</span>
          {canDownload && athletes.length > 0 && (
            <button
              className="btn-sm-outline"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => downloadAttendanceCSV(plan, records)}
            >⬇ CSV</button>
          )}
        </div>
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
                  <div className="att-time-cell">
                    <span className={`att-time ${a.checkin ? 'done' : 'pending'}`}>
                      {a.checkin ? fmtTime(a.checkin) : '—'}
                    </span>
                    {canDeleteAttendance && a.checkinId && (
                      <button className="att-del-btn" title="Remove check-in" onClick={() => handleDeleteRecord(a.checkinId)}>✕</button>
                    )}
                  </div>
                </td>
                <td>
                  <div className="att-time-cell">
                    <span className={`att-time ${a.checkout ? 'done' : 'pending'}`}>
                      {a.checkout ? fmtTime(a.checkout) : '—'}
                    </span>
                    {canDeleteAttendance && a.checkoutId && (
                      <button className="att-del-btn" title="Remove check-out" onClick={() => handleDeleteRecord(a.checkoutId)}>✕</button>
                    )}
                  </div>
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
export default function WorkoutCard({
  plan,
  canControl           = false,
  canDelete            = false,
  canDeleteAttendance  = false,
  canDownloadAttendance = false,
  onOpenQR,
  onUpdateStatus,
  onDelete,
}) {
  const cfg = STATUS_CONFIG[plan.attendance_status] ?? STATUS_CONFIG.not_started
  const hasAttendance = plan.attendance_status !== 'not_started'
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="workout-card">
      {/* Header */}
      <div className="workout-card-header">
        <div className="workout-card-meta">
          <span className="workout-card-date">{formatCardDate(plan.date)}</span>
          <span className={`badge ${cfg.badgeCls}`}>{cfg.label}</span>
          {canDelete && (
            <button
              className="delete-plan-btn"
              title="Delete workout plan"
              onClick={() => setConfirmDelete(true)}
            >🗑</button>
          )}
        </div>
        <h3 className="workout-card-title">{plan.title}</h3>
        {plan.description && (
          <p className="workout-card-desc">{plan.description}</p>
        )}
      </div>

      {/* Inline delete confirm */}
      {confirmDelete && (
        <div className="delete-confirm-bar">
          <span>Delete this plan and all its attendance records?</span>
          <div className="delete-confirm-actions">
            <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="btn-danger" onClick={() => { setConfirmDelete(false); onDelete?.() }}>Delete</button>
          </div>
        </div>
      )}

      {/* Exercise list */}
      {plan.exercises && plan.exercises.length > 0 && (
        <div className="workout-exercises">
          {plan.exercises.map((ex, i) => {
            const chips = getSetChips(ex)
            return (
              <div className="exercise-row" key={i}>
                <span className="exercise-name">{getExerciseName(ex)}</span>
                {chips && chips.length > 0 && (
                  <div className="exercise-set-chips">
                    {chips.map((chip, ci) => (
                      <span className="exercise-set-chip" key={ci}>{chip}</span>
                    ))}
                  </div>
                )}
                {ex.customDescription && (
                  <span className="exercise-notes">{ex.customDescription}</span>
                )}
                {ex.notes && (
                  <span className="exercise-coach-note">💬 {ex.notes}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Attendance list — coach / captain only, once check-in has started */}
      {(canControl || canDeleteAttendance || canDownloadAttendance) && hasAttendance && (
        <AttendanceList plan={plan} canDeleteAttendance={canDeleteAttendance} canDownload={canDownloadAttendance} />
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
