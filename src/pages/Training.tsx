import { Navigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { DemoBadge } from '../components/ui/ApiState'
import { useLang } from '../i18n/LanguageContext'
import { useRole } from '../context/RoleContext'
import { useAuth } from '../context/AuthContext'
import SupervisorTraining from '../components/training/SupervisorTraining'
import MentorView from '../components/training/MentorView'
import StudentTraining from '../components/training/StudentTraining'

/**
 * Shared Training module — ONE route (/training), THREE role experiences.
 *
 * Role detection comes from the centralized RoleContext (synced with the
 * backend session in AuthContext). The route guard already restricts
 * /training to supervisor + mentor + student; the dispatcher below is a
 * second, defensive layer:
 *
 *   authenticated user → role → SupervisorTraining | MentorView | StudentTraining
 *
 * Per the WST Roles & Use Cases documentation:
 * - Training Supervisor: full program management (courses → certificates).
 * - Mentor: ONLY assigned sessions/groups/students; attendance + result
 *   entry; correct returned results. Never sign-off, never administration.
 * - Student: ONLY their own sessions/attendance/tasks/results/
 *   competencies/certificates. No dashboard, no other students, no admin.
 * Training APIs are not in Final v1: all views run on clearly isolated
 * mock data (DemoBadge) until the official Training contract arrives.
 */
export default function Training() {
  const { t } = useLang()
  const { role, config } = useRole()
  const { mode } = useAuth()

  if (role !== 'supervisor' && role !== 'mentor' && role !== 'student') {
    return <Navigate to={config.homeRoute} replace />
  }

  const subtitle =
    role === 'student'
      ? t('training.subtitleStudent')
      : role === 'mentor'
        ? t('training.subtitleMentor')
        : t('training.subtitle')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('training.title')}
        subtitle={subtitle}
        actions={<DemoBadge visible={mode === 'demo'} />}
      />
      {role === 'student' ? (
        <StudentTraining />
      ) : role === 'mentor' ? (
        <MentorView />
      ) : (
        <SupervisorTraining />
      )}
    </div>
  )
}
