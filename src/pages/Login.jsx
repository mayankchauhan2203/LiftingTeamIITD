import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// ── TODO: replace with IITDLogin component once OAuth is approved ──────────
// import IITDLogin from './IITDLogin'
// export default IITDLogin
// ─────────────────────────────────────────────────────────────────────────

const DEMO_CREDS = [
  { role: 'Coach',   cred: 'coach_verma / coach123'   },
  { role: 'Captain', cred: 'arjun_s / captain123'     },
  { role: 'Athlete', cred: 'rahul_k / athlete123'     },
]

export default function Login() {
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState('coach')
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const result = login(username.trim(), password, selectedRole)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
    }
  }

  function switchRole(role) {
    setSelectedRole(role)
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="barbell-icon">🏋️</span>
          <h1>IIT Delhi Weightlifting</h1>
          <p>Athlete Progress Portal</p>
        </div>

        <div className="login-card">
          <div className="role-tabs" role="tablist">
            <button
              className={`role-tab${selectedRole === 'coach' ? ' active' : ''}`}
              onClick={() => switchRole('coach')}
              role="tab"
              aria-selected={selectedRole === 'coach'}
            >
              🎯 Coach
            </button>
            <button
              className={`role-tab${selectedRole === 'athlete' ? ' active' : ''}`}
              onClick={() => switchRole('athlete')}
              role="tab"
              aria-selected={selectedRole === 'athlete'}
            >
              💪 Athlete
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading
                ? 'Signing in…'
                : `Sign In as ${selectedRole === 'coach' ? 'Coach' : 'Athlete'}`}
            </button>
          </form>

          <div className="login-demo">
            <strong>Demo Credentials</strong>
            <div className="demo-creds">
              {DEMO_CREDS.map(({ role, cred }) => (
                <div key={role} className="demo-cred-row">
                  <span className="demo-role-label">{role}</span>
                  <span className="demo-cred-value">{cred}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
