import { useState, useEffect } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { useLang } from '../i18n/LanguageContext'
import { getRoles, RoleDto } from '../api/v6/roles'
import { Badge } from '../components/ui/Badge'

export default function RoleMatrixPage() {
  const { t, lang } = useLang()
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await getRoles()
        setRoles(res.items || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load roles')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const translateRole = (code: string) => {
    // Try to get translation, fallback to code (formatted)
    const key = `role.${code}` as any
    const translated = t(key)
    if (translated && translated !== key) return translated
    return code.replace(/_/g, ' ')
  }

  const translateGroup = (prefix: string) => {
    const key = `perm.group.${prefix}` as any
    const translated = t(key)
    if (translated && translated !== key) return translated
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }

  // Group permissions for a role by prefix
  const renderPermissions = (permissions: string[]) => {
    const grouped = permissions.reduce((acc, perm) => {
      const [prefix] = perm.split('.')
      if (!acc[prefix]) acc[prefix] = []
      acc[prefix].push(perm)
      return acc
    }, {} as Record<string, string[]>)

    return Object.entries(grouped).map(([prefix, perms]) => (
      <div key={prefix} className="mb-4 last:mb-0">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          {translateGroup(prefix)}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {perms.map((p) => (
            <Badge key={p} variant="default" className="font-mono text-[10px]" label={p} showDot={false} />
          ))}
        </div>
      </div>
    ))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.rbac.title')}
        subtitle={t('settings.rbac.desc')}
      />

      {loading && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <div className="text-sm">{error}</div>
        </div>
      )}

      {!loading && !error && roles.length === 0 && (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200 text-slate-500">
          {lang === 'ar' ? 'لا توجد أدوار' : 'No roles found'}
        </div>
      )}

      {!loading && !error && roles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-start font-semibold text-slate-900 w-1/3">
                    {lang === 'ar' ? 'الدور' : 'Role'}
                  </th>
                  <th className="px-6 py-4 text-start font-semibold text-slate-900">
                    {lang === 'ar' ? 'الصلاحيات' : 'Permissions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-slate-900 mb-1">
                        {translateRole(role.code)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {role.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {role.permissions && role.permissions.length > 0 ? (
                        renderPermissions(role.permissions)
                      ) : (
                        <span className="text-slate-400 italic">
                          {lang === 'ar' ? 'لا توجد صلاحيات' : 'No permissions'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
