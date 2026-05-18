import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { loginWithIITD } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err === 'auth_failed')    setError('IITD authentication was cancelled or failed. Please try again.')
    if (err === 'state_mismatch') setError('Security check failed. Please try again.')
    if (err === 'login_failed')   setError('Could not complete sign-in. You may not be registered in the team roster.')
  }, [])

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      await loginWithIITD()
      // page navigates away — no setLoading(false) needed
    } catch {
      setError('Failed to initiate sign-in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Brand */}
        <div className="login-brand">
          <span className="barbell-icon">🏋️</span>
          <h1>IIT Delhi Weightlifting</h1>
          <p>Athlete Progress Portal</p>
        </div>

        {/* Card */}
        <div className="login-card">
          {error && <div className="login-error">{error}</div>}

          <p className="login-sso-hint">
            Sign in with your IITD Kerberos account to access the team portal.
          </p>

          <button
            className="btn-iitd-login"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-sm" />
                Redirecting…
              </>
            ) : (
              <>
                <img
                  src="https://home.iitd.ac.in/uploads/logo-blue-bg.png"
                  alt="IITD"
                  className="iitd-logo-sm"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
                Login with IITD Credentials
              </>
            )}
          </button>

          <p className="login-help">
            Only registered team members can log in.
            Contact your coach if you cannot access the portal.
          </p>
        </div>
      </div>
    </div>
  )
}
