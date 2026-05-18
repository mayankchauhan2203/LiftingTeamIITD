import { useState } from 'react'
import { addWorkoutPlan, todayString } from '../services/workoutService'

const PRIMARY_TYPES    = ['Snatch', 'C&J', 'Front Squat', 'Back Squat', 'Other']
const VARIATION_TYPES  = ['Snatch', 'C&J']
const VARIATIONS       = ['Standard', 'Power', 'Hang', 'Other']

const emptySet      = () => ({ reps: '', pct: '' })
const emptyExercise = () => ({
  type: 'Snatch', customName: '',
  variation: 'Standard', customVariation: '',
  sets: [emptySet()],
})

function getExerciseLabel(ex) {
  const base = ex.type === 'Other' ? (ex.customName || 'Exercise') : ex.type
  if (!VARIATION_TYPES.includes(ex.type)) return base
  if (ex.variation === 'Standard') return base
  const prefix = ex.variation === 'Other' ? (ex.customVariation || '') : ex.variation
  return prefix ? `${prefix} ${base}` : base
}

export default function WorkoutPlanForm({ onClose, onSaved, createdBy }) {
  const [date,        setDate]        = useState(todayString())
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [exercises,   setExercises]   = useState([emptyExercise()])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  /* ── exercise-level helpers ── */
  function updateEx(i, patch) {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, ...patch } : ex))
  }
  function addExercise() {
    setExercises(prev => [...prev, emptyExercise()])
  }
  function removeExercise(i) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
  }

  /* ── set-level helpers ── */
  function addSet(i) {
    setExercises(prev => prev.map((ex, idx) =>
      idx === i ? { ...ex, sets: [...ex.sets, emptySet()] } : ex
    ))
  }
  function removeSet(i, si) {
    setExercises(prev => prev.map((ex, idx) =>
      idx === i ? { ...ex, sets: ex.sets.filter((_, sidx) => sidx !== si) } : ex
    ))
  }
  function updateSet(i, si, field, value) {
    setExercises(prev => prev.map((ex, idx) =>
      idx === i
        ? { ...ex, sets: ex.sets.map((s, sidx) => sidx === si ? { ...s, [field]: value } : s) }
        : ex
    ))
  }

  /* ── submit ── */
  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { setError('Session title is required.'); return }
    setSaving(true); setError('')
    try {
      const clean = exercises.filter(ex =>
        ex.type !== 'Other' || ex.customName.trim()
      )
      await addWorkoutPlan({
        date,
        title: title.trim(),
        description: description.trim(),
        exercises: clean,
        createdBy,
      })
      onSaved()
    } catch {
      setError('Failed to save. Check your Supabase connection.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2>🏋️ Add Workout Plan</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-red">{error}</div>}

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

            {/* Notes */}
            <div className="form-group">
              <label>Notes / Focus (optional)</label>
              <textarea
                className="announce-textarea"
                placeholder="e.g. Focus on receiving position today"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ minHeight: 68 }}
              />
            </div>

            {/* Exercises */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Exercises</label>

              <div className="exercise-form-list">
                {exercises.map((ex, i) => (
                  <div className="exercise-form-item" key={i}>

                    {/* Header row: label + remove */}
                    <div className="exercise-item-header">
                      <span className="exercise-item-label">Exercise {i + 1}</span>
                      <button
                        type="button"
                        className="remove-exercise-btn"
                        onClick={() => removeExercise(i)}
                        disabled={exercises.length === 1}
                        aria-label="Remove exercise"
                      >✕</button>
                    </div>

                    {/* Type selector */}
                    <div className="ex-pill-group">
                      {PRIMARY_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          className={`ex-pill${ex.type === t ? ' active' : ''}`}
                          onClick={() => updateEx(i, { type: t, variation: 'Standard', customVariation: '' })}
                        >{t}</button>
                      ))}
                    </div>

                    {/* Custom name if Other */}
                    {ex.type === 'Other' && (
                      <input
                        className="exercise-main-input"
                        type="text"
                        placeholder="Exercise name"
                        value={ex.customName}
                        onChange={e => updateEx(i, { customName: e.target.value })}
                      />
                    )}

                    {/* Variation (Snatch / C&J only) */}
                    {VARIATION_TYPES.includes(ex.type) && (
                      <>
                        <div className="ex-field-label">Variation</div>
                        <div className="ex-pill-group">
                          {VARIATIONS.map(v => (
                            <button
                              key={v}
                              type="button"
                              className={`ex-pill variation${ex.variation === v ? ' active' : ''}`}
                              onClick={() => updateEx(i, { variation: v, customVariation: '' })}
                            >{v}</button>
                          ))}
                        </div>
                        {ex.variation === 'Other' && (
                          <input
                            className="exercise-main-input"
                            type="text"
                            placeholder="Specify variation (e.g. Block)"
                            value={ex.customVariation}
                            onChange={e => updateEx(i, { customVariation: e.target.value })}
                          />
                        )}
                      </>
                    )}

                    {/* Sets */}
                    <div className="ex-field-label" style={{ marginTop: 4 }}>
                      Sets
                      {ex.sets.length > 0 && (
                        <span className="ex-set-summary"> — {getExerciseLabel(ex)}</span>
                      )}
                    </div>

                    <div className="set-list">
                      {ex.sets.map((s, si) => (
                        <div className="set-row" key={si}>
                          <span className="set-num">{si + 1}</span>
                          <div className="set-inputs">
                            <input
                              type="number"
                              min="1"
                              placeholder="Reps"
                              value={s.reps}
                              onChange={e => updateSet(i, si, 'reps', e.target.value)}
                            />
                            <span className="set-sep">×</span>
                            <input
                              type="number"
                              min="1"
                              max="110"
                              placeholder="%"
                              value={s.pct}
                              onChange={e => updateSet(i, si, 'pct', e.target.value)}
                            />
                            <span className="set-unit">%</span>
                          </div>
                          <button
                            type="button"
                            className="remove-set-btn"
                            onClick={() => removeSet(i, si)}
                            disabled={ex.sets.length === 1}
                            aria-label="Remove set"
                          >✕</button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="add-set-btn"
                      onClick={() => addSet(i)}
                    >+ Add Set</button>

                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-exercise-btn"
                onClick={addExercise}
                style={{ marginTop: 10 }}
              >+ Add Exercise</button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Workout'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
