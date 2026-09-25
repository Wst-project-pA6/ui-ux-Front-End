import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import { useAuth } from './context/AuthContext'
import { canAccessPath, homeForPermissions } from './auth/access'
import { AppShell } from './components/layout/AppShell'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
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
import RoleMatrixPage from './pages/RoleMatrix'
import Bays from './pages/Bays'
import ServiceTypes from './pages/ServiceTypes'
import TechnicianProfiles from './pages/TechnicianProfiles'
import OperatingHours from './pages/OperatingHours'
import Notifications from './pages/Notifications'
import AuditLog from './pages/AuditLog'
import Invoices from './pages/Invoices'

function BootSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Restoring session…</p>
      </div>
    </div>
  )
}

/**
 * Permission-based route guard. Backend permissions are the source of truth;
 * the backend re-enforces every rule. Forced password change pre-empts all.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { me, permissions, bootstrapping, mustChangePassword } = useAuth()
  const location = useLocation()

  if (bootstrapping) return <BootSplash />
  if (!me) return <Navigate to="/" replace state={{ from: location.pathname }} />
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  const basePath = '/' + location.pathname.split('/').filter(Boolean)[0]
  if (!canAccessPath(permissions, location.pathname) && !canAccessPath(permissions, basePath)) {
    return <Navigate to={homeForPermissions(permissions)} replace />
  }
  return <>{children}</>
}

/** Login root: signed-in users go to their permission-based home. */
function LoginRoot() {
  const { me, permissions, bootstrapping, mustChangePassword } = useAuth()
  if (bootstrapping) return <BootSplash />
  if (mustChangePassword && me) return <Navigate to="/change-password" replace />
  if (me) return <Navigate to={homeForPermissions(permissions)} replace />
  return <Login />
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginRoot />} />
          <Route
            path="/change-password"
            element={
              <PasswordRoute>
                <ChangePassword />
              </PasswordRoute>
            }
          />
          <Route element={<AppShell />}>
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
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/invoices/:id/print" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/role-matrix" element={<ProtectedRoute><RoleMatrixPage /></ProtectedRoute>} />
            <Route path="/bays" element={<ProtectedRoute><Bays /></ProtectedRoute>} />
            <Route path="/service-types" element={<ProtectedRoute><ServiceTypes /></ProtectedRoute>} />
            <Route path="/technician-profiles" element={<ProtectedRoute><TechnicianProfiles /></ProtectedRoute>} />
            <Route path="/operating-hours" element={<ProtectedRoute><OperatingHours /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

/**
 * /change-password is reachable with a session even while a password change
 * is forced; without any session it redirects to login.
 */
function PasswordRoute({ children }: { children: React.ReactNode }) {
  const { me, bootstrapping } = useAuth()
  if (bootstrapping) return <BootSplash />
  if (!me) return <Navigate to="/" replace />
  return <>{children}</>
}
