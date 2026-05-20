import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { USERS } from '../data/mockData'

const IITD_AUTH_URL = 'https://auth.devclub.in/api/oauth/authorize'
const CLIENT_ID     = import.meta.env.VITE_IITD_CLIENT_ID
const SERVER_URL    = import.meta.env.VITE_SERVER_URL || '/api'

function generateCodeVerifier() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier) {
  const data   = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('liftingUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const navigate = useNavigate()

  // Mock login — dev only
  function login(username, password, expectedRole) {
    const found = USERS.find(u => u.username === username && u.password === password)
    if (!found)
      return { success: false, error: 'Invalid username or password.' }
    if (expectedRole === 'coach' && found.role !== 'coach')
      return { success: false, error: 'These credentials belong to an athlete account.' }
    if (expectedRole === 'athlete' && found.role === 'coach')
      return { success: false, error: 'These credentials belong to the coach account.' }
    sessionStorage.setItem('liftingUser', JSON.stringify(found))
    setUser(found)
    navigate(found.role === 'coach' ? '/coach' : '/athlete')
    return { success: true }
  }

  async function loginWithIITD() {
    const verifier    = generateCodeVerifier()
    const challenge   = await generateCodeChallenge(verifier)
    const state       = crypto.randomUUID()
    const redirectUri = `${window.location.origin}/auth/callback`
    sessionStorage.setItem('pkce_verifier', verifier)
    sessionStorage.setItem('pkce_state',    state)
    const params = new URLSearchParams({
      client_id:             CLIENT_ID,
      redirect_uri:          redirectUri,
      response_type:         'code',
      scope:                 'openid profile email',
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      state,
    })
    window.location.href = `${IITD_AUTH_URL}?${params}`
  }

  async function completeLogin(code, codeVerifier) {
    const redirectUri = `${window.location.origin}/auth/callback`
    const res = await fetch(`${SERVER_URL}/auth/iitd`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error || 'Login failed')
    }
    const { user: profile } = await res.json()
    sessionStorage.setItem('liftingUser', JSON.stringify(profile))
    setUser(profile)
    return profile
  }

  function logout() {
    sessionStorage.removeItem('liftingUser')
    setUser(null)
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithIITD, completeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
