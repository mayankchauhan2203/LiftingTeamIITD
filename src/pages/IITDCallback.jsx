import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function IITDCallback() {
  const { completeLogin } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError || !code) {
      setError(oauthError || 'No authorization code received.')
      return
    }

    // Claim verifier synchronously before any await — prevents React StrictMode
    // double-invocation from sending the auth code twice.
    const verifier = sessionStorage.getItem('pkce_verifier')
    if (!verifier) return  // already consumed by first invocation
    sessionStorage.removeItem('pkce_verifier')

    const savedState = sessionStorage.getItem('pkce_state')
    sessionStorage.removeItem('pkce_state')

    if (!savedState || state !== savedState) {
      setError('State mismatch — possible CSRF. Please try logging in again.')
      return
    }

    completeLogin(code, verifier)
      .then(user => {
        navigate(user.role === 'coach' ? '/coach' : '/athlete', { replace: true })
      })
      .catch(err => {
        setError(err.message || 'Login failed. Please try again.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-brand">
            <span className="barbell-icon">🏋️</span>
            <h1>IIT Delhi Weightlifting</h1>
          </div>
          <div className="login-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem' }}>
              Sign-in failed: {error}
            </p>
            <button className="btn-iitd-login" onClick={() => navigate('/', { replace: true })}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="barbell-icon">🏋️</span>
          <h1>IIT Delhi Weightlifting</h1>
        </div>
        <div className="login-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Completing sign-in…</p>
        </div>
      </div>
    </div>
  )
}
