import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { changePassword } from '../api/auth'
import { ApiError } from '../api/http'
import { isStrongEnough } from '../utils/demoAuth'
import { usersApi, type ManagedUser } from '../api/resources'
import { isUuid } from '../api/identity'

type Permission = 'view' | 'create' | 'edit' | 'approve' | 'delete' | 'sign-off' | 'export'
type Role =
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

type SettingsTab = 'rbac' | 'general' | 'users' | 'security'

const permissions: Permission[] = ['view', 'create', 'edit', 'approve', 'delete', 'sign-off', 'export']
const roles: Role[] = [
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

const permissionMatrix: Record<Role, Partial<Record<Permission, boolean>>> = {
  'Workshop Manager': { view: true, create: true, edit: true, approve: true, delete: true, 'sign-off': true, export: true },
  'Service Advisor': { view: true, create: true, edit: true, approve: false, delete: false, 'sign-off': false, export: true },
  Technician: { view: true, create: false, edit: false, approve: false, delete: false, 'sign-off': false, export: false },
  'Quality Checker': { view: true, create: false, edit: true, approve: true, delete: false, 'sign-off': true, export: false },
  Storekeeper: { view: true, create: true, edit: true, approve: false, delete: false, 'sign-off': false, export: true },
  Procurement: { view: true, create: true, edit: true, approve: true, delete: false, 'sign-off': false, export: true },
  'Training Supervisor': { view: true, create: true, edit: true, approve: true, delete: false, 'sign-off': true, export: true },
  Mentor: { view: true, create: false, edit: false, approve: false, delete: false, 'sign-off': true, export: false },
  Student: { view: true, create: false, edit: false, approve: false, delete: false, 'sign-off': false, export: false },
  'Finance Viewer': { view: true, create: false, edit: false, approve: false, delete: false, 'sign-off': false, export: true },
  Auditor: { view: true, create: false, edit: false, approve: false, delete: false, 'sign-off': false, export: true },
}

interface DemoUser {
  id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'inactive'
}

const INITIAL_USERS: DemoUser[] = [
  { id: 'demo-user-1', name: 'Ahmed Mohammed', email: 'ahmed@wst.sa', role: 'Workshop Manager' as Role, status: 'active' },
  { id: 'demo-user-2', name: 'Khalid Hassan', email: 'khalid@wst.sa', role: 'Technician' as Role, status: 'active' },
  { id: 'demo-user-3', name: 'Fahad Al-Amer', email: 'fahad@wst.sa', role: 'Technician' as Role, status: 'active' },
  { id: 'demo-user-4', name: 'Noura Al-Saud', email: 'noura@wst.sa', role: 'Service Advisor' as Role, status: 'active' },
  { id: 'demo-user-5', name: 'Waleed Khatib', email: 'waleed@wst.sa', role: 'Mentor' as Role, status: 'active' },
  { id: 'demo-user-6', name: 'Fatima Hassan', email: 'fatima@wst.sa', role: 'Mentor' as Role, status: 'active' },
  { id: 'demo-user-7', name: 'Sami Al-Rashidi', email: 'sami@wst.sa', role: 'Training Supervisor' as Role, status: 'active' },
]

const ROLE_TO_CODE: Record<Role, string> = {
  'Workshop Manager': 'WORKSHOP_MANAGER',
  'Service Advisor': 'SERVICE_ADVISOR',
  Technician: 'TECHNICIAN',
  'Quality Checker': 'QUALITY_CHECKER',
  Storekeeper: 'STOREKEEPER_PROCUREMENT',
  Procurement: 'STOREKEEPER_PROCUREMENT',
  'Training Supervisor': 'TRAINING_SUPERVISOR',
  Mentor: 'MENTOR',
  Student: 'STUDENT',
  'Finance Viewer': 'FINANCE_VIEWER_AUDITOR',
  Auditor: 'FINANCE_VIEWER_AUDITOR',
}

const CODE_TO_ROLE: Record<string, Role> = {
  SYSTEM_ADMIN: 'Workshop Manager',
  WORKSHOP_MANAGER: 'Workshop Manager',
  SERVICE_ADVISOR: 'Service Advisor',
  TECHNICIAN: 'Technician',
  QUALITY_CHECKER: 'Quality Checker',
  STOREKEEPER_PROCUREMENT: 'Storekeeper',
  TRAINING_SUPERVISOR: 'Training Supervisor',
  MENTOR: 'Mentor',
  STUDENT: 'Student',
  FINANCE_VIEWER_AUDITOR: 'Finance Viewer',
}

function toDisplayUser(user: ManagedUser): DemoUser {
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    role: CODE_TO_ROLE[user.roles[0]] ?? 'Technician',
    status: user.status === 'ACTIVE' ? 'active' : 'inactive',
  }
}

export default function Settings() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('rbac')
  const [selectedRole, setSelectedRole] = useState<Role>('Workshop Manager')
  const [users, setUsers] = useState<DemoUser[]>(INITIAL_USERS)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<DemoUser | null>(null)
  const [userSaving, setUserSaving] = useState(false)
  const [userError, setUserError] = useState('')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)

  // The backend identifies users by UUID, never by email. Load the live
  // directory before edits so mutations always use the server identifier.
  React.useEffect(() => {
    if (tab !== 'users') return
    let cancelled = false
    usersApi.list({ pageSize: 100, sort: 'displayName' })
      .then((result) => {
        if (!cancelled) setUsers(result.items.map(toDisplayUser))
      })
      .catch((err) => {
        if (!cancelled && !(err instanceof ApiError && err.status === 0)) {
          setUserError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Unable to load users')
        }
      })
    return () => { cancelled = true }
  }, [tab])

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'rbac', label: t('settings.tab.rbac') },
    { key: 'users', label: t('settings.tab.users') },
    { key: 'general', label: t('settings.tab.general') },
    { key: 'security', label: t('settings.tab.security') },
  ]

  // Admin user console: POST /users (invite) and PATCH status (deactivate).
  // New users start with no roles/scopes server-side (distinct permissions).
  const openInvite = () => {
    setEditingUser(null)
    setUserError('')
    setUserModalOpen(true)
  }

  const openEdit = (u: DemoUser) => {
    setEditingUser(u)
    setUserError('')
    setUserModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
    const role = String(fd.get('role') ?? 'Technician') as Role
    if (!name || !email) {
      setUserError(t('auth.error.emailRequired'))
      return
    }
    setUserSaving(true)
    setUserError('')
    try {
      if (editingUser) {
        if (!isUuid(editingUser.id)) {
          setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, name, role } : u)))
        } else {
          const updated = await usersApi.update(editingUser.id, { displayName: name })
          const withRole = await usersApi.replaceRoles(updated.id, [ROLE_TO_CODE[role]])
          setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? toDisplayUser(withRole) : u)))
        }
      } else {
        const created = await usersApi.create({
          email,
          displayName: name,
          preferredLocale: lang,
          temporaryPassword: 'TempPass@2026',
        })
        const withRole = await usersApi.replaceRoles(created.id, [ROLE_TO_CODE[role]])
        setUsers((prev) => [...prev, toDisplayUser(withRole)])
      }
      setUserModalOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        if (editingUser) {
          setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, name, role } : u)))
        } else {
          setUsers((prev) => [...prev, { id: `demo-user-${Date.now()}`, name, email, role, status: 'active' }])
        }
        setUserModalOpen(false)
      } else {
        setUserError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Save failed')
      }
    } finally {
      setUserSaving(false)
    }
  }

  const handleDeactivate = async (u: DemoUser) => {
    const next = u.status === 'active' ? 'inactive' : 'active'
    setUserError('')
    try {
      if (isUuid(u.id)) {
        await usersApi.update(u.id, { status: next === 'active' ? 'ACTIVE' : 'DISABLED' })
      }
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)))
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)))
      } else {
        setUserError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Update failed')
      }
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {    e.preventDefault()
    setPwError('')
    setPwDone(false)
    if (pwNew !== pwConfirm) {
      setPwError(t('auth.error.passwordMismatch'))
      return
    }
    // Backend enforces Length(12, 128) — shorter would fail live with 422.
    if (pwNew.length < 12 || !isStrongEnough(pwNew)) {
      setPwError(t('auth.error.weakPassword'))
      return
    }
    setPwLoading(true)
    try {
      // Contract: POST /auth/change-password clears mustChangePassword and
      // revokes other refresh tokens.
      await changePassword(pwCurrent, pwNew)
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      setPwDone(true)
    } catch (err) {
      setPwError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Password change failed')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="flex border-b border-slate-200">
        {tabs.map((tab_item) => (
          <button
            key={tab_item.key}
            onClick={() => setTab(tab_item.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === tab_item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab_item.label}
          </button>
        ))}
      </div>

      {tab === 'rbac' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{t('settings.rbac.viewFor')}</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">{t('settings.rbac.title')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('settings.rbac.desc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide sticky start-0 bg-white min-w-[160px]">Role</th>
                    {permissions.map((p) => (
                      <th key={p} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide capitalize min-w-[80px]">
                        {t(`settings.perm.${p}` as Parameters<typeof t>[0])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                        role === selectedRole ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`px-4 py-3 font-medium sticky start-0 ${role === selectedRole ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-800'}`}>
                        {role}
                      </td>
                      {permissions.map((perm) => {
                        const has = permissionMatrix[role]?.[perm] ?? false
                        return (
                          <td key={perm} className="px-3 py-3 text-center">
                            {has ? (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
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
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">{t('settings.users.title')}</h3>
            <Button size="sm" onClick={openInvite}>{t('action.inviteUser')}</Button>
          </div>
          {userError && !userModalOpen && (
            <div role="alert" className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{userError}</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.user')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.email')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.role')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.status')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500" dir="ltr">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    {u.status === 'active' ? (
                      <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">{t('settings.users.active')}</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200">{t('badge.inactive')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="text-xs text-slate-500 hover:text-blue-600">{t('settings.users.edit')}</button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleDeactivate(u)} className="text-xs text-red-500 hover:text-red-700">
                        {u.status === 'active' ? t('settings.users.deactivate') : t('settings.users.active')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite / Edit User Modal */}
      {userModalOpen && (
        <Modal
          open={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          title={editingUser ? t('settings.users.edit') : t('action.inviteUser')}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setUserModalOpen(false)}>{t('action.cancel')}</Button>
              <Button loading={userSaving} onClick={() => (document.getElementById('user-save-form') as HTMLFormElement | null)?.requestSubmit()}>{t('action.save')}</Button>
            </>
          }
        >
          <form id="user-save-form" onSubmit={handleSaveUser} className="flex flex-col gap-4">
            {userError && (
              <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{userError}</div>
            )}
            <Input name="name" label={t('signup.fullName')} defaultValue={editingUser?.name ?? ''} required />
            <Input name="email" label={t('signup.email')} type="email" defaultValue={editingUser?.email ?? ''} disabled={!!editingUser} required />
            <Select name="role" label={t('settings.users.col.role')} defaultValue={editingUser?.role ?? 'Technician'} options={roles.map((r) => ({ value: r, label: r }))} />
          </form>
        </Modal>
      )}

      {tab === 'security' && (
        <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900">{t('settings.security.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.security.desc')}</p>
          {user?.mustChangePassword && (
            <div role="alert" className="mt-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {t('settings.security.mustChange')}
            </div>
          )}
          {pwError && (
            <div role="alert" className="mt-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{pwError}</div>
          )}
          {pwDone && (
            <div role="status" className="mt-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{t('settings.security.changed')}</div>
          )}
          <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-4">
            <Input label={t('settings.security.current')} type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" required />
            <Input label={t('settings.security.new')} type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" required />
            <Input label={t('settings.security.confirm')} type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} autoComplete="new-password" required />
            <div>
              <Button type="submit" loading={pwLoading}>{t('settings.security.submit')}</Button>
            </div>
          </form>
        </div>
      )}

      {tab === 'general' && (
        <div className="max-w-2xl space-y-6">
          {[
            {
              titleKey: 'settings.general.workshopInfo' as const,
              fields: [
                { label: 'Workshop Name', value: 'WST Workshop — Riyadh Main Branch' },
                { label: 'Address', value: 'King Fahd Road, Al Olaya, Riyadh 12211' },
                { label: 'Phone', value: '+966 11 234 5678' },
                { label: 'VAT Number', value: '300123456700003' },
              ],
            },
            {
              titleKey: 'settings.general.sysConfig' as const,
              fields: [
                { label: 'High-Value PO Threshold (SAR)', value: '5,000' },
                { label: 'Required Approvals for High-Value PO', value: '2' },
                { label: 'Default Invoice Currency', value: 'SAR (Saudi Riyal)' },
                { label: 'Time Zone', value: 'Asia/Riyadh (UTC+3)' },
              ],
            },
          ].map((section) => (
            <div key={section.titleKey} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">{t(section.titleKey)}</h3>
                <Button size="sm" variant="secondary">{t('action.edit')}</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">{field.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800" dir="ltr">{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
