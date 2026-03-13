import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login     from './pages/Login'
import CheckIn   from './pages/CheckIn'
import AdminRoot from './pages/Admin'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="text-cream/40 text-lg tracking-widest animate-pulse">LOADING…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && role !== 'admin') return <Navigate to="/checkin" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/checkin"
        element={<ProtectedRoute><CheckIn /></ProtectedRoute>}
      />
      <Route
        path="/admin/*"
        element={<ProtectedRoute adminOnly><AdminRoot /></ProtectedRoute>}
      />
      <Route path="/" element={<Navigate to="/checkin" replace />} />
      <Route path="*" element={<Navigate to="/checkin" replace />} />
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
