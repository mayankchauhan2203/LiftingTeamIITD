import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import CoachDashboard from './pages/CoachDashboard'
import AthleteDashboard from './pages/AthleteDashboard'

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (requiredRole === 'coach' && user.role !== 'coach') return <Navigate to="/" replace />
  if (requiredRole === 'athlete' && user.role === 'coach') return <Navigate to="/coach" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route
        path="/"
        element={
          user
            ? <Navigate to={user.role === 'coach' ? '/coach' : '/athlete'} replace />
            : <Login />
        }
      />
      <Route
        path="/coach"
        element={
          <ProtectedRoute requiredRole="coach">
            <CoachDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete"
        element={
          <ProtectedRoute requiredRole="athlete">
            <AthleteDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
