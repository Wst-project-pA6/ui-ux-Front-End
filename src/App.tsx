import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import { RoleProvider, useRole } from './context/RoleContext'
import { AppShell } from './components/layout/AppShell'
import Login from './pages/Login'
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
import Bays from './pages/Bays'
import ServiceTypes from './pages/ServiceTypes'
import TechnicianProfiles from './pages/TechnicianProfiles'
import OperatingHours from './pages/OperatingHours'
import Notifications from './pages/Notifications'
import AuditLog from './pages/AuditLog'

/**
 * Guards a route so that roles without access are redirected to their homeRoute
 * instead of being able to reach the page by typing the URL directly.
 * The sidebar already hides links per role; this enforces it at route level too.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { canAccess, config } = useRole()
  const location = useLocation()
  // For parameterized paths (e.g. /job-cards/JC-2024-0912), check the base segment
  const basePath = '/' + location.pathname.split('/').filter(Boolean)[0]
  if (!canAccess(location.pathname) && !canAccess(basePath)) {
    return <Navigate to={config.homeRoute} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <LanguageProvider>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
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
              <Route path="/invoices" element={<ProtectedRoute><InvoicesReports /></ProtectedRoute>} />
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
      </RoleProvider>
    </LanguageProvider>
  )
}
