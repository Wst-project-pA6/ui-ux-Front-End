import React, { useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { DemoBadge, EmptyState, LoadingRows, ApiErrorBanner } from '../components/ui/ApiState'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useApiList } from '../api/hooks'
import { usersApi, scopesApi } from '../api/resources'
import { ALL_ROLE_CODES, ROLE_CODE_LABELS } from '../api/mapping'
import { ApiError } from '../api/http'
import { ROLE_CONFIGS } from '../context/RoleContext'
import type { SystemUser, RoleCode } from '../api/types'

type StatusFilter = '' | 'ACTIVE' | 'DISABLED'

const PAGE_SIZE = 20

/** Offline demo directory mapped onto the contract User shape. */
function demoUsers(): SystemUser[] {
  const now = new Date().toISOString()
  return Object.entries(ROLE_CONFIGS).map(([role, cfg], i) => ({
    id: `demo-${i}`,
    email: `${role}@wst.sa`,
    displayName: cfg.userName,
    preferredLocale: 'en' as const,
    status: 'ACTIVE' as const,
    roles: [],
    organizationScopeIds: [],
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'demo',
    updatedBy: 'demo',
  }))
}

/**
 * System administration (Final v1 — SYSTEM_ADMIN + users.read only).
 * List/search/filter users, create, edit, enable/disable, reset password,
 * assign roles (PUT, replaces) and organization scopes (PUT, replaces).
 * The admin can never change their own roles, scopes, status or password
 * here — those controls disable on their own account (409 otherwise).
 */
export default function Users() {
  const { t } = useLang()
  const { user: me, mode, hasPermission } = useAuth()
  const canManage = hasPermission('users.manage')
  const canAssignRoles = hasPermission('roles.assign')
  const canAssignScopes = hasPermission('scopes.manage')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [sort, setSort] = useState('-createdAt')

  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [statusTarget, setStatusTarget] = useState<SystemUser | null>(null)
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  // Create form
  const [cEmail, setCEmail] = useState('')
  const [cName, setCName] = useState('')
  const [cLocale, setCLocale] = useState('en')
  const [cPassword, setCPassword] = useState('')
  const [cError, setCError] = useState('')

  // Edit form (loaded from GET /users/{id})
  const [detail, setDetail] = useState<SystemUser | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [eName, setEName] = useState('')
  const [eLocale, setELocale] = useState('en')
  const [ePassword, setEPassword] = useState('')
  const [editRoles, setEditRoles] = useState<RoleCode[]>([])
  const [editScopes, setEditScopes] = useState<string[]>([])
  const [allScopes, setAllScopes] = useState<{ id: string; name: string; type: string; status: string }[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [search])

  const list = useApiList<SystemUser>(
    (q) => usersApi.list(q),
    {
      query: {
        pageSize: PAGE_SIZE,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        sort,
      },
      fallbackItems: mode === 'demo' ? demoUsers() : undefined,
    },
  )

  const isSelf = (u: SystemUser | null) => !!u && !!me && u.id === me.id

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetail(null)
    setDetailError('')
    setActionError('')
    setEPassword('')
    if (mode === 'demo') {
      const found = demoUsers().find((u) => u.id === id) ?? null
      setDetail(found)
      if (found) {
        setEName(found.displayName)
        setELocale(found.preferredLocale)
        setEditRoles([])
        setEditScopes([])
      }
      return
    }
    setDetailLoading(true)
    try {
      const [u, scopes] = await Promise.all([
        usersApi.get(id),
        scopesApi.list().catch(() => ({ items: [] as typeof allScopes })),
      ])
      setDetail(u)
      setEName(u.displayName)
      setELocale(u.preferredLocale)
      setEditRoles([...u.roles])
      setEditScopes([...u.organizationScopeIds])
      setAllScopes(scopes.items)
    } catch (err) {
      setDetailError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Load failed')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setDetailError('')
    setActionError('')
    setEPassword('')
  }

  const submitCreate = async () => {
    setCError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cEmail.trim())) {
      setCError(t('users.error.emailInvalid'))
      return
    }
    if (!cName.trim()) {
      setCError(t('users.error.nameRequired'))
      return
    }
    if (cPassword.length < 12 || cPassword.length > 128) {
      setCError(t('users.error.tempPasswordLength'))
      return
    }
    if (mode === 'demo') {
      setCError(t('users.error.offlineUnavailable'))
      return
    }
    setSaving(true)
    try {
      const created = await usersApi.create({
        email: cEmail.trim(),
        displayName: cName.trim(),
        preferredLocale: cLocale as 'en' | 'ar',
        temporaryPassword: cPassword,
      })
      setCreatedCreds({ email: created.email, password: cPassword })
      setCEmail('')
      setCName('')
      setCPassword('')
      list.reload()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setCError(t('users.error.duplicate'))
      } else {
        setCError(err instanceof ApiError ? err.message : t('users.error.createFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const submitEdit = async () => {
    if (!detail || mode === 'demo') return
    setActionError('')
    const patch: { displayName?: string; preferredLocale?: 'en' | 'ar'; temporaryPassword?: string } = {}
    if (eName.trim() && eName.trim() !== detail.displayName) patch.displayName = eName.trim()
    if (eLocale !== detail.preferredLocale) patch.preferredLocale = eLocale as 'en' | 'ar'
    if (ePassword) {
      if (ePassword.length < 12 || ePassword.length > 128) {
        setActionError(t('users.error.tempPasswordLength'))
        return
      }
      patch.temporaryPassword = ePassword
    }
    setSaving(true)
    try {
      if (Object.keys(patch).length > 0) {
        const updated = await usersApi.update(detail.id, patch)
        setDetail(updated)
      }
      if (canAssignRoles && JSON.stringify([...editRoles].sort()) !== JSON.stringify([...detail.roles].sort())) {
        const updated = await usersApi.setRoles(detail.id, editRoles)
        setDetail(updated)
      }
      if (canAssignScopes && JSON.stringify([...editScopes].sort()) !== JSON.stringify([...detail.organizationScopeIds].sort())) {
        const updated = await usersApi.setScopes(detail.id, editScopes)
        setDetail(updated)
      }
      setEPassword('')
      list.reload()
    } catch (err) {
      setActionError(err instanceof ApiError ? `${err.code}: ${err.message}` : t('users.error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const confirmStatusChange = async () => {
    if (!statusTarget || mode === 'demo') return
    setSaving(true)
    try {
      await usersApi.update(statusTarget.id, {
        status: statusTarget.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
      })
      setStatusTarget(null)
      closeDetail()
      list.reload()
    } catch (err) {
      setActionError(err instanceof ApiError ? `${err.code}: ${err.message}` : t('users.error.saveFailed'))
      setSaving(false)
    }
  }

  const toggleRole = (code: RoleCode) => {
    setEditRoles((prev) => (prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]))
  }

  const toggleScope = (id: string) => {
    setEditScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <DemoBadge visible={list.isFallback} />
            {canManage && (
              <Button onClick={() => { setCError(''); setCreatedCreds(null); setCreateOpen(true) }}>
                {t('users.createBtn')}
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center md:gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder={t('users.search')} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('users.filter.allRoles')}</option>
              {ALL_ROLE_CODES.map((code) => (
                <option key={code} value={code}>{ROLE_CODE_LABELS[code]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('users.filter.allStatuses')}</option>
              <option value="ACTIVE">{t('users.status.active')}</option>
              <option value="DISABLED">{t('users.status.disabled')}</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="-createdAt">{t('users.sort.newest')}</option>
              <option value="displayName">{t('users.sort.name')}</option>
              <option value="email">{t('users.sort.email')}</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 md:ms-auto">{list.total} {t('users.results')}</span>
        </div>

        {list.loading ? (
          <LoadingRows rows={5} />
        ) : list.error ? (
          <ApiErrorBanner error={list.error} onRetry={list.reload} fallback={list.isFallback} />
        ) : list.items.length === 0 ? (
          <EmptyState title={t('users.empty')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.col.user')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.col.roles')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.col.status')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('users.col.lastLogin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((u) => (
                    <tr key={u.id} onClick={() => openDetail(u.id)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                            {u.displayName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {u.displayName}
                              {me?.id === u.id && <span className="ms-2 text-xs font-normal text-slate-400">({t('users.you')})</span>}
                            </p>
                            <p className="text-xs text-slate-400" dir="ltr">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {u.roles.length === 0 && <span className="text-xs text-slate-400">—</span>}
                          {u.roles.map((r) => (
                            <span key={r} className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-md">
                              {ROLE_CODE_LABELS[r as RoleCode] ?? r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.status === 'ACTIVE' ? (
                          <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">{t('users.status.active')}</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200">{t('users.status.disabled')}</span>
                        )}
                        {u.mustChangePassword && (
                          <span className="ms-2 bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full border border-amber-200">{t('users.mustChange')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs" dir="ltr">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">{t('users.showing')} {list.items.length} / {list.total}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => list.setPage(Math.max(1, (list.page?.page ?? 1) - 1))}
                  disabled={(list.page?.page ?? 1) <= 1}
                  className="h-8 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                <span className="text-xs text-slate-500 px-2" dir="ltr">
                  {(list.page?.page ?? 1)} / {(list.page?.totalPages ?? 1)}
                </span>
                <button
                  onClick={() => list.setPage(Math.min(list.page?.totalPages ?? 1, (list.page?.page ?? 1) + 1))}
                  disabled={(list.page?.page ?? 1) >= (list.page?.totalPages ?? 1)}
                  className="h-8 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create user */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('users.createTitle')}
        size="md"
        footer={
          createdCreds ? (
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t('action.close')}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t('action.cancel')}</Button>
              <Button loading={saving} onClick={submitCreate}>{t('users.createSubmit')}</Button>
            </>
          )
        }
      >
        {createdCreds ? (
          <div className="flex flex-col gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-emerald-800">{t('users.createdOk')}</p>
              <p className="text-xs text-emerald-700 mt-1">{t('users.tempPasswordNote')}</p>
              <div className="mt-3 bg-white rounded-lg p-3 border border-emerald-200">
                <p className="text-xs text-slate-400">{t('users.col.user')}</p>
                <p className="text-sm font-medium text-slate-800" dir="ltr">{createdCreds.email}</p>
                <p className="text-xs text-slate-400 mt-2">{t('users.tempPassword')}</p>
                <p className="text-sm font-mono font-bold text-slate-900" dir="ltr">{createdCreds.password}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {cError && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{cError}</p>}
            <Input label={t('users.form.email')} type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="name@example.com" required />
            <Input label={t('users.form.displayName')} value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Full name" required />
            <Select
              label={t('users.form.locale')}
              value={cLocale}
              onChange={(e) => setCLocale(e.target.value)}
              options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]}
            />
            <Input
              label={t('users.form.tempPassword')}
              type="text"
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
              placeholder="at-least-12-chars"
              required
              hint={t('users.form.tempPasswordHint')}
            />
          </div>
        )}
      </Modal>

      {/* User detail / edit */}
      <Modal
        open={!!detailId}
        onClose={closeDetail}
        title={detail?.displayName ?? t('users.detailTitle')}
        size="lg"
        footer={
          detail && canManage ? (
            <>
              <Button variant="secondary" onClick={closeDetail}>{t('action.close')}</Button>
              <Button
                variant={detail.status === 'ACTIVE' ? 'destructive' : 'primary'}
                onClick={() => setStatusTarget(detail)}
                disabled={isSelf(detail)}
                title={isSelf(detail) ? t('users.selfProtected') : undefined}
              >
                {detail.status === 'ACTIVE' ? t('users.disable') : t('users.enable')}
              </Button>
              <Button loading={saving} onClick={submitEdit} disabled={mode === 'demo'}>{t('action.save')}</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeDetail}>{t('action.close')}</Button>
          )
        }
      >
        {detailLoading && <LoadingRows rows={4} />}
        {detailError && <p role="alert" className="text-sm text-red-600">{detailError}</p>}
        {detail && (
          <div className="flex flex-col gap-5">
            {actionError && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>}
            {isSelf(detail) && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t('users.selfProtected')}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('users.form.displayName')} value={eName} onChange={(e) => setEName(e.target.value)} disabled={!canManage || mode === 'demo'} />
              <Select
                label={t('users.form.locale')}
                value={eLocale}
                onChange={(e) => setELocale(e.target.value)}
                options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]}
                disabled={!canManage || mode === 'demo'}
              />
            </div>
            {canManage && (
              <Input
                label={t('users.form.resetPassword')}
                type="text"
                value={ePassword}
                onChange={(e) => setEPassword(e.target.value)}
                placeholder="at-least-12-chars"
                hint={t('users.form.resetHint')}
                disabled={isSelf(detail) || mode === 'demo'}
              />
            )}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{t('users.rolesTitle')}</p>
              {!canAssignRoles && <p className="text-xs text-slate-400 mb-2">{t('users.noRolePermission')}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_ROLE_CODES.map((code) => (
                  <label key={code} className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${!canAssignRoles || isSelf(detail) ? 'opacity-50 cursor-not-allowed border-slate-100' : 'cursor-pointer border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={editRoles.includes(code)}
                      onChange={() => toggleRole(code)}
                      disabled={!canAssignRoles || isSelf(detail) || mode === 'demo'}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-slate-700">{ROLE_CODE_LABELS[code]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{t('users.scopesTitle')}</p>
              {!canAssignScopes && <p className="text-xs text-slate-400 mb-2">{t('users.noScopePermission')}</p>}
              {allScopes.length === 0 ? (
                <p className="text-xs text-slate-400">{t('users.noScopes')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allScopes.filter((s) => s.status === 'ACTIVE').map((s) => (
                    <label key={s.id} className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${!canAssignScopes || isSelf(detail) ? 'opacity-50 cursor-not-allowed border-slate-100' : 'cursor-pointer border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="checkbox"
                        checked={editScopes.includes(s.id)}
                        onChange={() => toggleScope(s.id)}
                        disabled={!canAssignScopes || isSelf(detail) || mode === 'demo'}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-slate-700">{s.name} <span className="text-xs text-slate-400">· {s.type}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
              <p>{t('users.detail.status')}: <strong>{detail.status}</strong></p>
              <p>{t('users.detail.mustChange')}: <strong>{detail.mustChangePassword ? t('users.yes') : '—'}</strong></p>
            </div>
          </div>
        )}
      </Modal>

      {/* Enable / disable confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === 'ACTIVE' ? t('users.disableTitle') : t('users.enableTitle')}
        message={
          statusTarget?.status === 'ACTIVE'
            ? t('users.disableMsg').replace('{email}', statusTarget?.email ?? '')
            : t('users.enableMsg').replace('{email}', statusTarget?.email ?? '')
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? t('users.disable') : t('users.enable')}
        destructive={statusTarget?.status === 'ACTIVE'}
        loading={saving}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  )
}
