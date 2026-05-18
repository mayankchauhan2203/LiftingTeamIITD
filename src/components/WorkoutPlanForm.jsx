import { useState } from 'react'
import { addWorkoutPlan, todayString } from '../services/workoutService'

const EMPTY_EXERCISE = { name: '', sets: '', reps: '', weight: '', notes: '' }

export default function WorkoutPlanForm({ onClose, onSaved, createdBy }) {
  const [date,        setDate]        = useState(todayString())
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [exercises,   setExercises]   = useState([{ ...EMPTY_EXERCISE }])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  function updateExercise(i, field, value) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  function addExercise() {
    setExercises(prev => [...prev, { ...EMPTY_EXERCISE }])
  }

  function removeExercise(i) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      const cleanExercises = exercises.filter(ex => ex.name.trim())
      await addWorkoutPlan({ date, title: title.trim(), description: description.trim(), exercises: cleanExercises, createdBy })
      onSaved()
    } catch (err) {
      setError('Failed to save. Check your Supabase connection.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>🏋️ Add Workout Plan</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-red" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Date */}
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            {/* Title */}
            <div className="form-group">
              <label>Session Title</label>
              <input
                type="text"
                placeholder="e.g. Snatch Technique Session"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Notes / Focus (optional)</label>
              <textarea
                className="announce-textarea"
                placeholder="e.g. Focus on receiving position today"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ minHeight: 72 }}
              />
            </div>

            {/* Exercises */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Exercises</label>
              <div className="exercise-form-list">
                {exercises.map((ex, i) => (
                  <div className="exercise-form-item" key={i}>
                    <div className="exercise-form-row">
                      <input
                        className="exercise-main-input"
                        type="text"
                        placeholder={`Exercise ${i + 1} name`}
                        value={ex.name}
                        onChange={e => updateExercise(i, 'name', e.target.value)}
                      />
                      <button
                        type="button"
                        className="remove-exercise-btn"
                        onClick={() => removeExercise(i)}
                        disabled={exercises.length === 1}
                        aria-label="Remove exercise"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="exercise-sub-inputs">
                      <input
                        type="text"
                        placeholder="Sets"
                        value={ex.sets}
                        onChange={e => updateExercise(i, 'sets', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Reps"
                        value={ex.reps}
                        onChange={e => updateExercise(i, 'reps', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Weight / %"
                        value={ex.weight}
                        onChange={e => updateExercise(i, 'weight', e.target.value)}
                      />
                    </div>
                    <input
                      className="exercise-notes-input"
                      type="text"
                      placeholder="Notes (optional)"
                      value={ex.notes}
                      onChange={e => updateExercise(i, 'notes', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-exercise-btn"
                onClick={addExercise}
              >
                + Add Exercise
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Workout Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
