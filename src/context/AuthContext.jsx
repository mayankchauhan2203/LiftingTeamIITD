import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { USERS } from '../data/mockData'

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

  function login(username, password, expectedRole) {
    const found = USERS.find(
      u => u.username === username && u.password === password
    )
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

  function logout() {
    sessionStorage.removeItem('liftingUser')
    setUser(null)
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
