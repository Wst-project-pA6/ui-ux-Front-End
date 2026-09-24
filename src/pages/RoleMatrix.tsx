import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import {
  MATRIX_ROLES,
  RoleMatrix,
  type MatrixRole,
} from '../components/settings/RoleMatrix'
import { useLang } from '../i18n/LanguageContext'

/**
 * Standalone Role Matrix page. Lives outside Workshop Manager navigation —
 * accessible to the Training Supervisor (and other authorized roles) so
 * permission boundaries stay visible without being a workshop feature.
 */
export default function RoleMatrixPage() {
  const { t } = useLang()
  const [selectedRole, setSelectedRole] =
    useState<MatrixRole>('Workshop Manager')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.rbac.title')}
        subtitle={t('settings.rbac.desc')}
      />

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">
          {t('settings.rbac.viewFor')}
        </span>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as MatrixRole)}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MATRIX_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <RoleMatrix selectedRole={selectedRole} onSelectRole={setSelectedRole} />
    </div>
  )
}
