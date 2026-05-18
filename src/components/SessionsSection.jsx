import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import WorkoutPlanForm from './WorkoutPlanForm'
import WorkoutCard from './WorkoutCard'
import AttendanceQRModal from './AttendanceQRModal'
import {
  fetchAllPlans,
  updateAttendanceStatus,
  subscribeToWorkoutChanges,
  todayString,
} from '../services/workoutService'
import { useAuth } from '../context/AuthContext'

function formatGroupDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Shared Sessions section used by Coach (canAdd=true) and Captain (canAdd=false) */
export default function SessionsSection({ canAdd = false }) {
  const { user } = useAuth()
  const [plans,    setPlans]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [showForm, setShowForm] = useState(false)
  const [qrModal,  setQrModal]  = useState(null) // { planId, phase, title }

  const today = todayString()

  async function loadPlans() {
    try {
      const data = await fetchAllPlans()
      setPlans(data || [])
      setError('')
    } catch {
      setError('Could not load workout plans. Check your Supabase configuration.')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
    const channel = subscribeToWorkoutChanges(loadPlans)
    return () => supabase.removeChannel(channel)
  }, [])

  async function handleStatusUpdate(planId, newStatus) {
    try {
      await updateAttendanceStatus(planId, newStatus)
      // Auto-open QR modal when attendance opens
      if (newStatus === 'checkin_open' || newStatus === 'checkout_open') {
        const plan  = plans.find(p => p.id === planId)
        const phase = newStatus === 'checkin_open' ? 'checkin' : 'checkout'
        setQrModal({ planId, phase, title: plan?.title ?? '' })
      }
      // Auto-close QR modal when attendance closes
      if ((newStatus === 'checkin_done' || newStatus === 'done') && qrModal?.planId === planId) {
        setQrModal(null)
      }
    } catch {
      alert('Failed to update attendance status. Please try again.')
    }
  }

  const todayPlans    = plans.filter(p => p.date === today)
  const upcomingPlans = plans.filter(p => p.date > today).sort((a, b) => a.date.localeCompare(b.date))
  const pastPlans     = plans.filter(p => p.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)

  return (
    <>
      {showForm && (
        <WorkoutPlanForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadPlans() }}
          createdBy={user?.username ?? ''}
        />
      )}
      {qrModal && (
        <AttendanceQRModal
          planId={qrModal.planId}
          phase={qrModal.phase}
          title={qrModal.title}
          onClose={() => setQrModal(null)}
        />
      )}

      {/* Section header */}
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <h2>Workout Sessions</h2>
          <p>Manage plans and QR attendance</p>
        </div>
        {canAdd && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Workout</button>
        )}
      </div>

      {loading ? (
        <div className="placeholder-section">
          <div className="placeholder-icon" style={{ opacity: 0.6 }}>⏳</div>
          <p>Loading…</p>
        </div>
      ) : error ? (
        <div className="alert alert-red">{error}</div>
      ) : (
        <>
          {/* ── Today ── */}
          <div className="sessions-group-label">
            Today — {formatGroupDate(today)}
          </div>

          {todayPlans.length === 0 ? (
            <div className="no-plan-card">
              <span style={{ fontSize: 28 }}>🗓️</span>
              <p>No workout planned for today.</p>
              {canAdd && (
                <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
                  + Add Today's Workout
                </button>
              )}
            </div>
          ) : (
            todayPlans.map(plan => (
              <WorkoutCard
                key={plan.id}
                plan={plan}
                canControl
                onOpenQR={phase => setQrModal({ planId: plan.id, phase, title: plan.title })}
                onUpdateStatus={status => handleStatusUpdate(plan.id, status)}
              />
            ))
          )}

          {/* ── Upcoming ── */}
          {upcomingPlans.length > 0 && (
            <>
              <div className="sessions-group-label" style={{ marginTop: 28 }}>Upcoming</div>
              {upcomingPlans.map(plan => (
                <WorkoutCard key={plan.id} plan={plan} canControl={false} />
              ))}
            </>
          )}

          {/* ── Recent ── */}
          {pastPlans.length > 0 && (
            <>
              <div className="sessions-group-label" style={{ marginTop: 28 }}>Recent</div>
              {pastPlans.map(plan => (
                <WorkoutCard key={plan.id} plan={plan} canControl={false} />
              ))}
            </>
          )}
        </>
      )}
    </>
  )
}
