import { useState, useEffect } from 'react'
import {
  fetchTeamMembers, addTeamMember, removeTeamMember,
  fetchPendingRequests, approveChangeRequest, rejectChangeRequest,
  updateAthleteFullProfile,
  fetchPendingJoinRequests, approveJoinRequest, rejectJoinRequest,
} from '../services/teamService'

const ROLES      = ['athlete', 'captain', 'coach']
const ROLE_BADGE = { coach: 'badge-blue', captain: 'badge-purple', athlete: 'badge-green' }
const ROLE_LABEL = { coach: 'Coach', captain: 'Captain', athlete: 'Athlete' }

const PR_LABELS = {
  snatch_pr:      'Snatch PR',
  cj_pr:          'C&J PR',
  front_squat_pr: 'Front Squat PR',
  back_squat_pr:  'Back Squat PR',
  deadlift_pr:    'Deadlift PR',
}

const PR_UPDATED_AT = {
  snatch_pr:      'snatch_pr_updated_at',
  cj_pr:          'cj_pr_updated_at',
  front_squat_pr: 'front_squat_pr_updated_at',
  back_squat_pr:  'back_squat_pr_updated_at',
  deadlift_pr:    'deadlift_pr_updated_at',
}

/* ── Add Athlete Modal ─────────────────────────────────── */
function AddAthleteModal({ onClose, onSaved }) {
  const [form, setForm]     = useState({ kerberos_id: '', name: '', role: 'athlete', weight_class: '', year: '', snatch_pr: '', cj_pr: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.kerberos_id.trim()) { setError('Name and Kerberos ID are required.'); return }
    setSaving(true); setError('')
    try {
      await addTeamMember({
        kerberos_id:  form.kerberos_id.trim().toLowerCase(),
        name:         form.name.trim(),
        role:         form.role,
        weight_class: form.weight_class.trim() || null,
        year:         form.year.trim() || null,
        snatch_pr:    form.snatch_pr ? Number(form.snatch_pr) : null,
        cj_pr:        form.cj_pr    ? Number(form.cj_pr)    : null,
      })
      onSaved()
    } catch (err) {
      setError(err.message === 'kerberos_exists'
        ? 'A member with this Kerberos ID already exists.'
        : 'Failed to add member. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Athlete</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-red">{error}</div>}
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="e.g. Rahul Kumar" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Kerberos ID</label>
              <input type="text" placeholder="e.g. mt1234567" value={form.kerberos_id} onChange={e => set('kerberos_id', e.target.value)} autoCapitalize="none" required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Weight Class <span className="label-opt">(optional)</span></label>
                <input type="text" placeholder="e.g. 73kg" value={form.weight_class} onChange={e => set('weight_class', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Year <span className="label-opt">(optional)</span></label>
                <input type="text" placeholder="e.g. 2nd Year" value={form.year} onChange={e => set('year', e.target.value)} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Snatch PR <span className="label-opt">(kg)</span></label>
                <input type="number" min="0" placeholder="e.g. 95" value={form.snatch_pr} onChange={e => set('snatch_pr', e.target.value)} />
              </div>
              <div className="form-group">
                <label>C&J PR <span className="label-opt">(kg)</span></label>
                <input type="number" min="0" placeholder="e.g. 120" value={form.cj_pr} onChange={e => set('cj_pr', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Athlete'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Athlete Details Modal ─────────────────────────────── */
function DetailsModal({ member, onClose, onSaved, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name:           member.name,
    role:           member.role,
    weight_class:   member.weight_class   ?? '',
    year:           member.year           ?? '',
    body_weight:    member.body_weight    ?? '',
    snatch_pr:      member.snatch_pr      ?? '',
    cj_pr:          member.cj_pr          ?? '',
    front_squat_pr: member.front_squat_pr ?? '',
    back_squat_pr:  member.back_squat_pr  ?? '',
    deadlift_pr:    member.deadlift_pr    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const updates = {
        name:         form.name.trim(),
        role:         form.role,
        weight_class: form.weight_class.trim() || null,
        year:         form.year.trim() || null,
        body_weight:  form.body_weight !== '' ? Number(form.body_weight) : null,
        body_weight_updated_at: form.body_weight !== '' && Number(form.body_weight) !== (member.body_weight ?? null)
          ? new Date().toISOString() : member.body_weight_updated_at,
      }
      for (const field of Object.keys(PR_LABELS)) {
        const newVal = form[field] !== '' ? Number(form[field]) : null
        updates[field] = newVal
        if (newVal !== (member[field] ?? null)) {
          updates[PR_UPDATED_AT[field]] = new Date().toISOString()
        }
      }
      await updateAthleteFullProfile(member.id, updates)
      onSaved()
    } catch {
      setError('Failed to save changes. Please try again.')
      setSaving(false)
    }
  }

  const total = (member.snatch_pr && member.cj_pr) ? member.snatch_pr + member.cj_pr : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="athlete-avatar-sm">{member.initials || member.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div>
              <h2 style={{ margin: 0 }}>{member.name}</h2>
              <span className={`badge ${ROLE_BADGE[member.role] ?? 'badge-muted'}`} style={{ fontSize: 11 }}>{ROLE_LABEL[member.role] ?? member.role}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {editing ? (
          <form onSubmit={handleSave}>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {error && <div className="alert alert-red">{error}</div>}
              <div className="form-row-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Weight Class</label>
                  <input type="text" placeholder="e.g. 73kg" value={form.weight_class} onChange={e => set('weight_class', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input type="text" placeholder="e.g. 3rd Year" value={form.year} onChange={e => set('year', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Body Weight (kg)</label>
                <input type="number" step="0.1" min="30" max="250" placeholder="e.g. 71.4" value={form.body_weight} onChange={e => set('body_weight', e.target.value)} />
              </div>
              <div className="detail-section-title">Competition Lifts</div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Snatch PR (kg)</label>
                  <input type="number" min="0" max="300" placeholder="—" value={form.snatch_pr} onChange={e => set('snatch_pr', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>C&J PR (kg)</label>
                  <input type="number" min="0" max="300" placeholder="—" value={form.cj_pr} onChange={e => set('cj_pr', e.target.value)} />
                </div>
              </div>
              <div className="detail-section-title">Strength Lifts</div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Front Squat PR (kg)</label>
                  <input type="number" min="0" max="400" placeholder="—" value={form.front_squat_pr} onChange={e => set('front_squat_pr', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Back Squat PR (kg)</label>
                  <input type="number" min="0" max="400" placeholder="—" value={form.back_squat_pr} onChange={e => set('back_squat_pr', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Deadlift PR (kg)</label>
                <input type="number" min="0" max="400" placeholder="—" value={form.deadlift_pr} onChange={e => set('deadlift_pr', e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setError('') }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : '💾 Save Changes'}</button>
            </div>
          </form>
        ) : (
          <>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="detail-section-title">Identity</div>
              <div className="detail-grid">
                <span className="detail-label">Kerberos ID</span><span className="detail-value">{member.kerberos_id}</span>
                <span className="detail-label">Weight Class</span><span className="detail-value">{member.weight_class || '—'}</span>
                <span className="detail-label">Year</span><span className="detail-value">{member.year || '—'}</span>
              </div>

              <div className="detail-section-title">Body Stats</div>
              <div className="detail-grid">
                <span className="detail-label">Body Weight</span>
                <span className="detail-value">{member.body_weight ? `${member.body_weight} kg` : '—'}</span>
              </div>

              <div className="detail-section-title">Competition Lifts</div>
              <div className="detail-grid">
                <span className="detail-label">Snatch PR</span><span className="detail-value">{member.snatch_pr ? `${member.snatch_pr} kg` : '—'}</span>
                <span className="detail-label">C&J PR</span><span className="detail-value">{member.cj_pr ? `${member.cj_pr} kg` : '—'}</span>
                <span className="detail-label">Olympic Total</span>
                <span className="detail-value">{total ? <strong>{total} kg</strong> : '—'}</span>
              </div>

              <div className="detail-section-title">Strength Lifts</div>
              <div className="detail-grid">
                <span className="detail-label">Front Squat PR</span><span className="detail-value">{member.front_squat_pr ? `${member.front_squat_pr} kg` : '—'}</span>
                <span className="detail-label">Back Squat PR</span><span className="detail-value">{member.back_squat_pr ? `${member.back_squat_pr} kg` : '—'}</span>
                <span className="detail-label">Deadlift PR</span><span className="detail-value">{member.deadlift_pr ? `${member.deadlift_pr} kg` : '—'}</span>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn-danger" onClick={onRemove}>Remove Athlete</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={onClose}>Close</button>
                <button className="btn-primary" onClick={() => setEditing(true)}>Edit</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Approve Request Modal ─────────────────────────────── */
function ApproveRequestModal({ request, onClose, onDone }) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleApprove() {
    setSaving(true); setError('')
    try {
      await approveChangeRequest(request.id, request.kerberos_id, request.requested_changes)
      onDone()
    } catch {
      setError('Failed to approve request. Please try again.')
      setSaving(false)
    }
  }

  async function handleReject() {
    setSaving(true); setError('')
    try {
      await rejectChangeRequest(request.id)
      onDone()
    } catch {
      setError('Failed to reject request. Please try again.')
      setSaving(false)
    }
  }

  const changes = request.requested_changes
  const requestDate = new Date(request.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>PR Change Request</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '2px 0 0' }}>{request.athlete_name} · {requestDate}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-red">{error}</div>}
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Review the requested changes below. Approving will immediately update the athlete's profile.
          </p>
          {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
            <div className="change-row" key={field}>
              <span className="change-field">{PR_LABELS[field] ?? field}</span>
              <div className="change-values">
                <span className="change-old">{oldVal != null ? `${oldVal} kg` : '—'}</span>
                <span className="change-arrow">→</span>
                <span className="change-new">{newVal != null ? `${newVal} kg` : '—'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn-danger" onClick={handleReject} disabled={saving}>Reject</button>
          <button className="btn-primary" style={{ background: 'var(--green)' }} onClick={handleApprove} disabled={saving}>
            {saving ? 'Saving…' : '✓ Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Join Requests Modal ───────────────────────────────── */
function JoinRequestsModal({ requests, onClose, onDone }) {
  const [processing, setProcessing] = useState(null)
  const [error,      setError]      = useState('')

  async function handleApprove(req) {
    setProcessing(req.id); setError('')
    try {
      await approveJoinRequest(req.id, req.kerberos_id, req.name)
      onDone()
    } catch {
      setError('Failed to approve. Please try again.')
      setProcessing(null)
    }
  }

  async function handleReject(req) {
    setProcessing(req.id); setError('')
    try {
      await rejectJoinRequest(req.id)
      onDone()
    } catch {
      setError('Failed to reject. Please try again.')
      setProcessing(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Requests</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-red" style={{ marginBottom: 12 }}>{error}</div>}
          {requests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No pending join requests.</p>
          ) : requests.map(req => (
            <div key={req.id} className="join-req-row">
              <div className="athlete-cell">
                <div className="athlete-avatar-sm">
                  {req.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{req.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {req.kerberos_id}{req.year ? ` · ${req.year}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  disabled={processing === req.id}
                  onClick={() => handleReject(req)}
                >Reject</button>
                <button
                  className="btn-primary"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  disabled={processing === req.id}
                  onClick={() => handleApprove(req)}
                >Approve</button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── TeamManagement ────────────────────────────────────── */
export default function TeamManagement({ canEditPR = false }) {
  const [members,         setMembers]         = useState([])
  const [pendingRequests, setPendingRequests]  = useState({})
  const [pendingJoins,    setPendingJoins]    = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')
  const [showAdd,         setShowAdd]         = useState(false)
  const [showJoinReqs,    setShowJoinReqs]    = useState(false)
  const [detailsMember,   setDetailsMember]   = useState(null)
  const [approveRequest,  setApproveRequest]  = useState(null)

  async function load() {
    try {
      const [data, prReqs, joinReqs] = await Promise.all([
        fetchTeamMembers(),
        fetchPendingRequests(),
        fetchPendingJoinRequests(),
      ])
      setMembers(data || [])
      const reqMap = {}
      for (const r of (prReqs || [])) reqMap[r.kerberos_id] = r
      setPendingRequests(reqMap)
      setPendingJoins(joinReqs || [])
      setError('')
    } catch {
      setError('Could not load team data. Check your Supabase connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleRemove(member) {
    if (!window.confirm(`Remove ${member.name} from the team roster? This cannot be undone.`)) return
    try {
      await removeTeamMember(member.id)
      setDetailsMember(null)
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch {
      alert('Failed to remove member. Please try again.')
    }
  }

  function initials(name) {
    return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
  }

  return (
    <>
      {showAdd && (
        <AddAthleteModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
      {showJoinReqs && (
        <JoinRequestsModal
          requests={pendingJoins}
          onClose={() => setShowJoinReqs(false)}
          onDone={() => { setShowJoinReqs(false); load() }}
        />
      )}
      {detailsMember && (
        <DetailsModal
          member={detailsMember}
          onClose={() => setDetailsMember(null)}
          onSaved={() => { setDetailsMember(null); load() }}
          onRemove={() => handleRemove(detailsMember)}
        />
      )}
      {approveRequest && (
        <ApproveRequestModal
          request={approveRequest}
          onClose={() => setApproveRequest(null)}
          onDone={() => { setApproveRequest(null); load() }}
        />
      )}

      <div className="section-header" style={{ marginBottom: 18 }}>
        <div>
          <h2>Athlete Roster</h2>
          <p>{members.length} registered member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {canEditPR && (
          <div style={{ display: 'flex', gap: 8 }}>
            {pendingJoins.length > 0 && (
              <button className="btn-sm-orange" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setShowJoinReqs(true)}>
                Join Requests ({pendingJoins.length})
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Athlete</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="placeholder-section"><p>Loading…</p></div>
      ) : error ? (
        <div className="alert alert-red">{error}</div>
      ) : members.length === 0 ? (
        <div className="no-plan-card">
          <span style={{ fontSize: 32 }}>👥</span>
          <p>No team members yet. Add your first athlete.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Body Weight</th>
                  <th>Year</th>
                  <th>Snatch</th>
                  <th>C&amp;J</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const total   = (m.snatch_pr && m.cj_pr) ? m.snatch_pr + m.cj_pr : null
                  const pending = pendingRequests[m.kerberos_id]
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="athlete-cell">
                          <div className="athlete-avatar-sm">{m.initials || initials(m.name)}</div>
                          <span>{m.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${ROLE_BADGE[m.role] ?? 'badge-muted'}`}>{ROLE_LABEL[m.role] ?? m.role}</span></td>
                      <td>{m.body_weight ? `${m.body_weight} kg` : '—'}</td>
                      <td>{m.year || '—'}</td>
                      <td>{m.snatch_pr ? `${m.snatch_pr} kg` : '—'}</td>
                      <td>{m.cj_pr ? `${m.cj_pr} kg` : '—'}</td>
                      <td>{total ? <strong>{total} kg</strong> : '—'}</td>
                      <td>
                        <div className="tm-actions">
                          {canEditPR && (
                            <>
                              <button className="btn-sm-outline" onClick={() => setDetailsMember(m)}>Details</button>
                              {pending && (
                                <button className="btn-sm-orange" onClick={() => setApproveRequest(pending)}>Approve Request</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
