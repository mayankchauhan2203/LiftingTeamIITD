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

function formatCardDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today    = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const card     = new Date(dateStr + 'T00:00:00'); card.setHours(0,0,0,0)

  if (+card === +today)    return 'Today'
  if (+card === +tomorrow) return 'Tomorrow'
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function WorkoutCard({ plan, canControl = false, onOpenQR, onUpdateStatus }) {
  const cfg = STATUS_CONFIG[plan.attendance_status] ?? STATUS_CONFIG.not_started

  return (
    <div className="workout-card">
      {/* Header row */}
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
          {plan.exercises.map((ex, i) => (
            <div className="exercise-row" key={i}>
              <span className="exercise-name">{ex.name}</span>
              <span className="exercise-detail">
                {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.weight && `@ ${ex.weight}`]
                  .filter(Boolean).join(' · ')}
              </span>
              {ex.notes && <span className="exercise-notes">{ex.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons (coach / captain only) */}
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
