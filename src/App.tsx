import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { LanguageProvider } from './i18n/LanguageContext'
import { RoleProvider, useRole } from './context/RoleContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isAuthenticated } from './api/auth'
import { AppShell } from './components/layout/AppShell'
import Login from './pages/Login'
import ChangePasswordPage from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Vehicles from './pages/Vehicles'
import JobCards from './pages/JobCards'
import Inventory from './pages/Inventory'
import Purchasing from './pages/Purchasing'
import Training from './pages/Training'
import Assessments from './pages/Assessments'
import Competencies from './pages/Competencies'
import Reports from './pages/Reports'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import MyJobs from './pages/MyJobs'
import MyTraining from './pages/MyTraining'
import InvoicesReports from './pages/InvoicesReports'
import RoleMatrixPage from './pages/RoleMatrix'
import Users from './pages/Users'

/**
 * Guards a route so that unauthenticated users (including after logout or
 * session expiry, even via the browser Back button) land on Login, and
 * roles without access are redirected to their homeRoute instead of being
 * able to reach the page by typing the URL directly.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { canAccess, config } = useRole()
  const { loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }
  // For parameterized paths (e.g. /job-cards/JC-2024-0912), check the base segment
  const basePath = '/' + location.pathname.split('/').filter(Boolean)[0]
  if (!canAccess(location.pathname) && !canAccess(basePath)) {
    return <Navigate to={config.homeRoute} replace />
  }
  return <>{children}</>
}

/**
 * Backend-driven password gate: while the account requires a password
 * change (new/reset accounts — the backend answers 403
 * PASSWORD_CHANGE_REQUIRED everywhere else), only the change-password
 * screen is reachable. Normal logins never land here.
 */
function PasswordGate() {
  const { forcePasswordChange, loading } = useAuth()
  const location = useLocation()
  if (loading || !forcePasswordChange) return null
  if (location.pathname === '/change-password') return null
  return <Navigate to="/change-password" replace />
}

export default function App() {
  // After logout, the browser Back button may restore an authenticated page
  // from the back-forward cache (frozen DOM, no guard re-evaluation).
  // Reload only when the session is gone, so logged-in back/forward
  // navigation keeps working as a normal SPA.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !isAuthenticated()) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return (
    <LanguageProvider>
      <RoleProvider>
        <AuthProvider>
        <BrowserRouter>
          <PasswordGate />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<AppShell />}>
              <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
              <Route path="/job-cards" element={<ProtectedRoute><JobCards /></ProtectedRoute>} />
              <Route path="/job-cards/:id" element={<ProtectedRoute><JobCards /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/purchasing" element={<ProtectedRoute><Purchasing /></ProtectedRoute>} />
              <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
              <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
              <Route path="/competencies" element={<ProtectedRoute><Competencies /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/my-jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
              <Route path="/my-training" element={<ProtectedRoute><MyTraining /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><InvoicesReports /></ProtectedRoute>} />
              <Route path="/role-matrix" element={<ProtectedRoute><RoleMatrixPage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </RoleProvider>
    </LanguageProvider>
  )
}
