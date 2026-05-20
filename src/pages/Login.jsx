import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const DEMO_CREDS = [
  { role: 'Coach',   cred: 'coach_verma / coach123'  },
  { role: 'Captain', cred: 'arjun_s / captain123'    },
  { role: 'Athlete', cred: 'rahul_k / athlete123'    },
]

export default function Login() {
  const { login, loginWithIITD } = useAuth()

  const [devOpen,       setDevOpen]       = useState(false)
  const [selectedRole,  setSelectedRole]  = useState('coach')
  const [username,      setUsername]      = useState('')
  const [password,      setPassword]      = useState('')
  const [error,         setError]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [iitdLoading,   setIitdLoading]   = useState(false)

  async function handleIITDLogin() {
    setIitdLoading(true)
    try {
      await loginWithIITD()
    } catch {
      setIitdLoading(false)
    }
  }

  async function handleDevSubmit(e) {
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

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="barbell-icon">🏋️</span>
          <h1>IIT Delhi Weightlifting</h1>
          <p>Athlete Progress Portal</p>
        </div>

        <div className="login-card">
          <p className="login-subtitle">
            Sign in with your IIT Delhi account to access the portal.
          </p>

          <button
            className="btn-iitd-login"
            onClick={handleIITDLogin}
            disabled={iitdLoading}
          >
            {iitdLoading ? (
              <span className="spinner-sm" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect width="40" height="40" rx="8" fill="#00205B"/>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif">IIT</text>
              </svg>
            )}
            {iitdLoading ? 'Redirecting…' : 'Sign in with IITD'}
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <div className="dev-login-toggle">
            <button
              className="dev-toggle-btn"
              onClick={() => { setDevOpen(v => !v); setError('') }}
            >
              {devOpen ? '▲' : '▼'} Developer Login
            </button>
          </div>

          {devOpen && (
            <div className="dev-login-section">
              <div className="role-tabs" role="tablist">
                {['coach', 'athlete'].map(r => (
                  <button
                    key={r}
                    className={`role-tab${selectedRole === r ? ' active' : ''}`}
                    onClick={() => { setSelectedRole(r); setError('') }}
                    role="tab"
                    aria-selected={selectedRole === r}
                  >
                    {r === 'coach' ? '🎯 Coach' : '💪 Athlete'}
                  </button>
                ))}
              </div>

              {error && <div className="login-error">{error}</div>}

              <form onSubmit={handleDevSubmit}>
                <div className="form-group">
                  <label htmlFor="dev-username">Username</label>
                  <input
                    id="dev-username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoCapitalize="none"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dev-password">Password</label>
                  <input
                    id="dev-password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-login" disabled={loading}>
                  {loading ? 'Signing in…' : `Sign In as ${selectedRole === 'coach' ? 'Coach' : 'Athlete'}`}
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
          )}
        </div>
      </div>
    </div>
  )
}
