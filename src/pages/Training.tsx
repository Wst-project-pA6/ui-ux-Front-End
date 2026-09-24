import { Navigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { DemoBadge } from '../components/ui/ApiState'
import { useLang } from '../i18n/LanguageContext'
import { useRole } from '../context/RoleContext'
import { useAuth } from '../context/AuthContext'
import SupervisorTraining from '../components/training/SupervisorTraining'
import StudentTraining from '../components/training/StudentTraining'

/**
 * Shared Training module — ONE route (/training) for both roles.
 *
 * Role detection comes from the centralized RoleContext (synced with the
 * backend session in AuthContext). The route guard already restricts /training
 * to supervisor + student; the dispatcher below is a second, defensive layer:
 *
 *   authenticated user → role → SupervisorTraining | StudentTraining
 *
 * Supervisor and student never share management actions or each other's
 * private data: students see only their own records (the backend restricts
 * GET /assessments via students.self), and sign-off requires
 * training.signoff, which students do not have.
 */
export default function Training() {
  const { t } = useLang()
  const { role, config } = useRole()
  const { mode } = useAuth()

  if (role !== 'supervisor' && role !== 'student') {
    return <Navigate to={config.homeRoute} replace />
  }

  const isStudent = role === 'student'

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('training.title')}
        subtitle={isStudent ? t('training.subtitleStudent') : t('training.subtitle')}
        actions={<DemoBadge visible={mode === 'demo'} />}
      />
      {isStudent ? <StudentTraining /> : <SupervisorTraining />}
    </div>
  )
}
