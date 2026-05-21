import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function IITDCallback() {
  const { completeLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error || !code) {
      navigate('/?error=auth_failed', { replace: true })
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
      navigate('/?error=state_mismatch', { replace: true })
      return
    }

    completeLogin(code, verifier)
      .then(user => {
        navigate(user.role === 'coach' ? '/coach' : '/athlete', { replace: true })
      })
      .catch(() => {
        navigate('/?error=login_failed', { replace: true })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
