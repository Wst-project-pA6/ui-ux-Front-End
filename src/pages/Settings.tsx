import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { usersV3, systemConfigV3 } from '../api/v4/management'
import type { Schemas } from '../api/v3/types'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

type User = Schemas['UserResponseDto']
type SettingsTab = 'users' | 'password' | 'finance' | 'dataQuality'

const PAGE_SIZE = 20

export default function Settings() {
  const { showToast } = useToast()
  const { me, hasPermission } = useAuth()
  const canUsersRead = hasPermission(PERMS.usersRead)
  const canUsersManage = hasPermission(PERMS.usersManage)
  const canRolesAssign = hasPermission(PERMS.rolesAssign)
  const canScopesManage = hasPermission(PERMS.scopesManage)
  const canConfigRead = hasPermission(PERMS.configRead)
  const canConfigManage = hasPermission(PERMS.configManage)

  const [tab, setTab] = useState<SettingsTab>('users')

  const tabs: { key: SettingsTab; label: string; visible: boolean }[] = [
    { key: 'users', label: 'Users', visible: canUsersRead },
    { key: 'password', label: 'Change Password', visible: true },
    { key: 'finance', label: 'Finance settings', visible: canConfigRead },
    { key: 'dataQuality', label: 'Data quality', visible: canConfigRead },
  ]
  const visibleTabs = tabs.filter((t) => t.visible)
  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key ?? 'password'

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="User administration and system configuration" />
      <div className="flex border-b border-slate-200">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <UsersTab
          meId={me?.id}
          canManage={canUsersManage}
          canRolesAssign={canRolesAssign}
          canScopesManage={canScopesManage}
        />
      )}
      {activeTab === 'password' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg">
          <h3 className="text-base font-semibold text-slate-900">Change your password</h3>
          <p className="text-sm text-slate-500 mt-1">Update the password you use to sign in.</p>
          <Link to="/change-password">
            <Button size="sm" className="mt-4">Go to Change Password</Button>
          </Link>
        </div>
      )}
      {activeTab === 'finance' && <FinanceTab canManage={canConfigManage} />}
      {activeTab === 'dataQuality' && <DataQualityTab canManage={canConfigManage} />}
    </div>
  )
}

// ── Users ────────────────────────────────────────────────────────────────

function UsersTab({
  meId,
  canManage,
  canRolesAssign,
  canScopesManage,
}: {
  meId?: string
  canManage: boolean
  canRolesAssign: boolean
  canScopesManage: boolean
}) {
  const { showToast } = useToast()
  const [items, setItems] = useState<User[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [roles, setRoles] = useState<string[]>([])
  const [scopes, setScopes] = useState<{ id: string; name?: string; code?: string }[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ email: '', displayName: '', preferredLocale: 'en', temporaryPassword: '' })
  const [formRoles, setFormRoles] = useState<string[]>([])
  const [formScopes, setFormScopes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  const [statusTarget, setStatusTarget] = useState<User | null>(null)
  const [selected, setSelected] = useState<User | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(id)
  }, [q])

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await usersV3.list({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedQ || undefined,
        status: statusFilter || undefined,
      })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, debouncedQ, statusFilter])

  const loadOptions = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        usersV3.roles().catch(() => ({ items: [] })),
        usersV3.scopes({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      ])
      const roleItems = Array.isArray(r) ? r : (r.items ?? [])
      setRoles(
        roleItems.map((x) => (typeof x === 'string' ? x : (x as { name?: string; code?: string }).name ?? (x as { code?: string }).code ?? '')),
      )
      setScopes(
        ((s as { items: { id: string; name?: string; code?: string }[] }).items ?? []).map((x) => ({
          id: x.id,
          name: x.name,
          code: x.code,
        })),
      )
    } catch {
      /* pickers optional */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const isSelf = (u: User | null) => !!u && !!meId && u.id === meId

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', displayName: '', preferredLocale: 'en', temporaryPassword: '' })
    setFormRoles([])
    setFormScopes([])
    setSaveError(null)
    setCreatedPassword(null)
    setModalOpen(true)
  }

  const openEdit = async (u: User) => {
    setEditing(u)
    const rec = u as unknown as Record<string, unknown>
    setForm({
      email: (rec.email as string) ?? '',
      displayName: (rec.displayName as string) ?? '',
      preferredLocale: (rec.preferredLocale as string) ?? 'en',
      temporaryPassword: '',
    })
    setFormRoles(((rec.roles as string[]) ?? []).filter((r) => typeof r === 'string'))
    setFormScopes(((rec.organizationScopeIds as string[]) ?? []).filter((s) => typeof s === 'string'))
    setSaveError(null)
    setCreatedPassword(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (saving) return
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setSaveError(new ApiError({ message: 'Enter a valid email address.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    if (!form.displayName.trim()) {
      setSaveError(new ApiError({ message: 'Display name is required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        const self = isSelf(editing)
        const payload: Record<string, unknown> = {}
        if (form.displayName.trim() !== ((editing as unknown as { displayName?: string }).displayName ?? '')) {
          payload.displayName = form.displayName.trim()
        }
        if (form.temporaryPassword) payload.temporaryPassword = form.temporaryPassword
        if (!self && (editing as unknown as { status?: string }).status) {
          // Status changes go through the dedicated enable/disable control.
        }
        if (Object.keys(payload).length > 0) {
          await usersV3.update(editing.id, payload as never)
        }
        if (!self) {
          if (canRolesAssign) await usersV3.replaceRoles(editing.id, formRoles)
          if (canScopesManage) await usersV3.replaceScopes(editing.id, formScopes)
        }
        showToast('success', 'User updated', form.displayName.trim())
        setModalOpen(false)
        load()
      } else {
        if (!form.temporaryPassword || form.temporaryPassword.length < 12) {
          setSaveError(
            new ApiError({ message: 'Temporary password is required (12+ characters).', code: 'BAD_REQUEST', status: 400 }),
          )
          setSaving(false)
          return
        }
        const created = await usersV3.create({
          email: form.email.trim(),
          displayName: form.displayName.trim(),
          preferredLocale: form.preferredLocale as 'en' | 'ar',
          temporaryPassword: form.temporaryPassword,
        })
        if (canRolesAssign && formRoles.length > 0) {
          await usersV3.replaceRoles(created.id, formRoles).catch((err) => {
            showToast('error', 'Roles not assigned', backendErrorMessage(err))
          })
        }
        if (canScopesManage && formScopes.length > 0) {
          await usersV3.replaceScopes(created.id, formScopes).catch((err) => {
            showToast('error', 'Scopes not assigned', backendErrorMessage(err))
          })
        }
        setCreatedPassword(form.temporaryPassword)
        showToast('success', 'User created', form.email.trim())
        load()
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SEPARATION_OF_DUTIES_VIOLATION') {
        setSaveError(
          new ApiError({
            message: 'You cannot change your own roles, scopes or status.',
            code: err.code,
            status: err.status,
            requestId: err.requestId,
          }),
        )
      } else {
        setSaveError(err)
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmStatus = async () => {
    if (!statusTarget) return
    const rec = statusTarget as unknown as { status?: string }
    const toStatus = rec.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
    try {
      await usersV3.update(statusTarget.id, { status: toStatus })
      showToast('success', toStatus === 'DISABLED' ? 'User disabled' : 'User re-enabled', statusTarget.id)
      setStatusTarget(null)
      load()
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={q} onChange={setQ} placeholder="Search users…" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            Create user
          </Button>
        )}
        <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} users</span>
      </div>

      {state === 'loading' && (
        <div className="p-4">
          <LoadingState label="Loading users…" />
        </div>
      )}
      {state === 'error' && (
        <div className="p-4">
          <ErrorState error={error} onRetry={load} title="Failed to load users" />
        </div>
      )}
      {state === 'success' && items.length === 0 && (
        <div className="p-4">
          <EmptyState title="No users found" />
        </div>
      )}
      {state === 'success' && items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">User</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Roles</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const rec = u as unknown as { email?: string; displayName?: string; roles?: string[]; status?: string }
                  const self = isSelf(u)
                  return (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(u)}>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {rec.displayName ?? '—'}
                        {self && <span className="ms-2 text-xs text-blue-600 font-semibold">(you)</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500" dir="ltr">
                        {rec.email ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600">{(rec.roles ?? []).join(', ') || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={badgeVariantFor(rec.status ?? 'ACTIVE')} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {canManage && (
                            <button onClick={() => openEdit(u)} className="text-xs text-slate-500 hover:text-blue-600">
                              Edit
                            </button>
                          )}
                          {canManage && !self && (
                            <>
                              <span className="text-slate-200">|</span>
                              <button onClick={() => setStatusTarget(u)} className="text-xs text-red-500 hover:text-red-700">
                                {rec.status === 'DISABLED' ? 'Re-enable' : 'Disable'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-400">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 rounded-lg border disabled:opacity-40">
                ‹
              </button>
              <span className="text-sm px-2">
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="h-8 px-2 rounded-lg border disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit user' : 'Create user'}
        size="md"
        footer={
          createdPassword ? (
            <Button onClick={() => setModalOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={save}>
                {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
              </Button>
            </>
          )
        }
      >
        {createdPassword ? (
          <div className="flex flex-col gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-800">Temporary password (shown once)</p>
              <p className="text-sm text-amber-700 mt-1">Share it securely with the new user. It will not be shown again.</p>
              <p className="font-mono text-base font-bold text-slate-900 mt-2 select-all" dir="ltr">
                {createdPassword}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {!editing && <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />}
            <Input label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
            <Select
              label="Preferred locale"
              value={form.preferredLocale}
              onChange={(e) => setForm({ ...form, preferredLocale: e.target.value })}
              options={[
                { value: 'en', label: 'English (en)' },
                { value: 'ar', label: 'Arabic (ar)' },
              ]}
            />
            <Input
              label={editing ? 'Reset temporary password (leave blank to keep)' : 'Temporary password (12+ chars)'}
              type="text"
              value={form.temporaryPassword}
              onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
              required={!editing}
              autoComplete="off"
            />
            {isSelf(editing) && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                This is your own account — roles, scopes and status cannot be changed here.
              </p>
            )}
            {!isSelf(editing) && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Roles {canRolesAssign ? '' : '(view only — you lack roles.assign)'}
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {roles.length === 0 && <span className="text-xs text-slate-400">No roles loaded.</span>}
                    {roles.map((r) => (
                      <label key={r} className="flex items-center gap-1 text-xs border rounded-lg px-2 py-1">
                        <input
                          type="checkbox"
                          disabled={!canRolesAssign}
                          checked={formRoles.includes(r)}
                          onChange={(e) =>
                            setFormRoles((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))
                          }
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Organization scopes {canScopesManage ? '' : '(view only — you lack scopes.manage)'}
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {scopes.length === 0 && <span className="text-xs text-slate-400">No scopes loaded.</span>}
                    {scopes.map((s) => (
                      <label key={s.id} className="flex items-center gap-1 text-xs border rounded-lg px-2 py-1">
                        <input
                          type="checkbox"
                          disabled={!canScopesManage}
                          checked={formScopes.includes(s.id)}
                          onChange={(e) =>
                            setFormScopes((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                          }
                        />
                        {s.name ?? s.code ?? s.id.slice(0, 8)}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            {saveError ? <FieldErrors error={saveError} /> : null}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!statusTarget}
        title={(statusTarget as unknown as { status?: string })?.status === 'DISABLED' ? 'Re-enable user' : 'Disable user'}
        message={
          (statusTarget as unknown as { status?: string })?.status === 'DISABLED'
            ? 'This user will regain access immediately.'
            : 'This user will lose access immediately. You can re-enable them later.'
        }
        confirmLabel={(statusTarget as unknown as { status?: string })?.status === 'DISABLED' ? 'Re-enable' : 'Disable'}
        destructive={(statusTarget as unknown as { status?: string })?.status !== 'DISABLED'}
        onConfirm={confirmStatus}
        onCancel={() => setStatusTarget(null)}
      />

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={(selected as unknown as { displayName?: string }).displayName ?? 'User'} size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {canManage && (
                <Button onClick={() => { openEdit(selected); setSelected(null) }}>Edit</Button>
              )}
            </>
          }>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(selected as unknown as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 font-mono">{k}</p>
                <p className="text-xs font-mono break-all mt-0.5">{typeof v === 'string' ? v : JSON.stringify(v)}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Finance settings ─────────────────────────────────────────────────────

function FinanceTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast()
  const [data, setData] = useState<Schemas['FinanceSettingsResponseDto'] | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState(false)
  const [rate, setRate] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await systemConfigV3.finance()
      setData(res)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = () => {
    if (!data) return
    // taxRatePercent stays a STRING end to end — never parsed to a number.
    setRate(data.taxRatePercent)
    setLabel(data.taxLabel ?? '')
    setSaveError(null)
    setEditing(true)
  }

  const save = async () => {
    if (!data || saving) return
    if (!/^-?[0-9]+(\.[0-9]+)?$/.test(rate.trim())) {
      setSaveError(new ApiError({ message: 'Tax rate must be a numeric string.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await systemConfigV3.updateFinance({
        version: data.version,
        taxRatePercent: rate.trim(),
        ...(label ? { taxLabel: label } : {}),
      })
      setData(updated)
      setEditing(false)
      showToast('success', 'Finance settings updated', '')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        setSaveError(new ApiError({ message: 'Settings changed by someone else — reloaded. Review and retry.', code: err.code, status: err.status, requestId: err.requestId }))
        load()
      } else {
        setSaveError(err)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl">
      <h3 className="text-base font-semibold text-slate-900">Finance settings</h3>
      <p className="text-xs text-slate-500 mt-1">
        A new tax rate applies to invoices generated afterwards. Existing drafts retain their rate unless regenerated.
        Issued invoices never change.
      </p>
      {state === 'loading' && <div className="mt-4"><LoadingState /></div>}
      {state === 'error' && <div className="mt-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && data && !editing && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400">Tax rate (percent)</p><p className="font-mono font-medium" dir="ltr">{data.taxRatePercent}%</p></div>
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400">Tax label</p><p className="font-medium">{data.taxLabel ?? '—'}</p></div>
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400">Currency (read-only)</p><p className="font-mono font-medium">{data.currencyCode}</p></div>
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400">Version</p><p className="font-mono">{data.version}</p></div>
          {canManage && <div className="col-span-2"><Button size="sm" onClick={startEdit}>Edit</Button></div>}
        </div>
      )}
      {editing && (
        <div className="flex flex-col gap-3 mt-4">
          <Input label="Tax rate percent (string, e.g. 15)" value={rate} onChange={(e) => setRate(e.target.value)} required />
          <Input label="Tax label" value={label} onChange={(e) => setLabel(e.target.value)} />
          {saveError ? <FieldErrors error={saveError} /> : null}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Data quality ─────────────────────────────────────────────────────────

function DataQualityTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast()
  const [data, setData] = useState<Schemas['DataQualitySettingsResponseDto'] | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await systemConfigV3.dataQuality()
      setData(res)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const humanize = (m: number) => {
    if (m % 1440 === 0) return `${m / 1440} day(s)`
    if (m % 60 === 0) return `${m / 60} hour(s)`
    return `${m} minute(s)`
  }

  const save = async () => {
    if (!data || saving) return
    const n = Number(minutes)
    if (!Number.isInteger(n) || n < 0) {
      setSaveError(new ApiError({ message: 'Enter a whole number of minutes (0 or more).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await systemConfigV3.updateDataQuality({ version: data.version, lateGracePeriodMinutes: n })
      setData(updated)
      setEditing(false)
      showToast('success', 'Data quality settings updated', '')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        setSaveError(new ApiError({ message: 'Settings changed by someone else — reloaded. Review and retry.', code: err.code, status: err.status, requestId: err.requestId }))
        load()
      } else {
        setSaveError(err)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl">
      <h3 className="text-base font-semibold text-slate-900">Data quality settings</h3>
      {state === 'loading' && <div className="mt-4"><LoadingState /></div>}
      {state === 'error' && <div className="mt-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && data && !editing && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Late grace period</p>
            <p className="font-medium">{data.lateGracePeriodMinutes} min ({humanize(data.lateGracePeriodMinutes)})</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400">Version</p><p className="font-mono">{data.version}</p></div>
          {canManage && <div className="col-span-2"><Button size="sm" onClick={() => { setMinutes(String(data.lateGracePeriodMinutes)); setSaveError(null); setEditing(true) }}>Edit</Button></div>}
        </div>
      )}
      {editing && (
        <div className="flex flex-col gap-3 mt-4">
          <Input label="Late grace period (minutes)" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} required />
          {saveError ? <FieldErrors error={saveError} /> : null}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
