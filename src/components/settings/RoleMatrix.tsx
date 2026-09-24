import { useLang } from '../../i18n/LanguageContext'

export type Permission =
  | 'view'
  | 'create'
  | 'edit'
  | 'approve'
  | 'delete'
  | 'sign-off'
  | 'export'

export type MatrixRole =
  | 'Workshop Manager'
  | 'Service Advisor'
  | 'Technician'
  | 'Quality Checker'
  | 'Storekeeper'
  | 'Procurement'
  | 'Training Supervisor'
  | 'Mentor'
  | 'Student'
  | 'Finance Viewer'
  | 'Auditor'

export const MATRIX_PERMISSIONS: Permission[] = [
  'view',
  'create',
  'edit',
  'approve',
  'delete',
  'sign-off',
  'export',
]

export const MATRIX_ROLES: MatrixRole[] = [
  'Workshop Manager',
  'Service Advisor',
  'Technician',
  'Quality Checker',
  'Storekeeper',
  'Procurement',
  'Training Supervisor',
  'Mentor',
  'Student',
  'Finance Viewer',
  'Auditor',
]

/**
 * Canonical permission matrix. Mirrors the backend separation-of-duties
 * rules: job execution, stock adjustment, purchase approval, invoice
 * viewing, assessment entry and supervisor sign-off are distinct
 * permissions enforced server-side (frontend display only).
 */
export const PERMISSION_MATRIX: Record<
  MatrixRole,
  Partial<Record<Permission, boolean>>
> = {
  'Workshop Manager': {
    view: true,
    create: true,
    edit: true,
    approve: true,
    delete: true,
    'sign-off': true,
    export: true,
  },
  'Service Advisor': {
    view: true,
    create: true,
    edit: true,
    approve: false,
    delete: false,
    'sign-off': false,
    export: true,
  },
  Technician: {
    view: true,
    create: false,
    edit: false,
    approve: false,
    delete: false,
    'sign-off': false,
    export: false,
  },
  'Quality Checker': {
    view: true,
    create: false,
    edit: true,
    approve: true,
    delete: false,
    'sign-off': true,
    export: false,
  },
  Storekeeper: {
    view: true,
    create: true,
    edit: true,
    approve: false,
    delete: false,
    'sign-off': false,
    export: true,
  },
  Procurement: {
    view: true,
    create: true,
    edit: true,
    approve: true,
    delete: false,
    'sign-off': false,
    export: true,
  },
  'Training Supervisor': {
    view: true,
    create: true,
    edit: true,
    approve: true,
    delete: false,
    'sign-off': true,
    export: true,
  },
  Mentor: {
    view: true,
    create: false,
    edit: false,
    approve: false,
    delete: false,
    'sign-off': true,
    export: false,
  },
  Student: {
    view: true,
    create: false,
    edit: false,
    approve: false,
    delete: false,
    'sign-off': false,
    export: false,
  },
  'Finance Viewer': {
    view: true,
    create: false,
    edit: false,
    approve: false,
    delete: false,
    'sign-off': false,
    export: true,
  },
  Auditor: {
    view: true,
    create: false,
    edit: false,
    approve: false,
    delete: false,
    'sign-off': false,
    export: true,
  },
}

interface RoleMatrixProps {
  selectedRole: MatrixRole
  onSelectRole: (role: MatrixRole) => void
}

/** Read-only permission matrix table shared by Settings and RoleMatrix page. */
export function RoleMatrix({ selectedRole, onSelectRole }: RoleMatrixProps) {
  const { t } = useLang()

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-900">
          {t('settings.rbac.title')}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{t('settings.rbac.desc')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide sticky start-0 bg-white min-w-[160px]">
                Role
              </th>
              {MATRIX_PERMISSIONS.map((p) => (
                <th
                  key={p}
                  className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide capitalize min-w-[80px]"
                >
                  {t(`settings.perm.${p}` as Parameters<typeof t>[0])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROLES.map((role) => (
              <tr
                key={role}
                onClick={() => onSelectRole(role)}
                className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                  role === selectedRole ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <td
                  className={`px-4 py-3 font-medium sticky start-0 ${
                    role === selectedRole
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-white text-slate-800'
                  }`}
                >
                  {role}
                </td>
                {MATRIX_PERMISSIONS.map((perm) => {
                  const has = PERMISSION_MATRIX[role]?.[perm] ?? false
                  return (
                    <td key={perm} className="px-3 py-3 text-center">
                      {has ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                          <div className="w-1.5 h-px bg-slate-300 rounded-full" />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
