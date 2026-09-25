import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { technicianProfilesV3, type TechnicianProfile } from '../api/v3/workshop'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const PAGE_SIZE = 20

type ProfileStatus = 'ACTIVE' | 'INACTIVE'
type UserIdMode = 'keep' | 'set' | 'unlink'

function friendlyProfileError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'ACCOUNT_NOT_ELIGIBLE') {
      return 'Account not eligible: userId must be an ACTIVE account holding the TECHNICIAN role.'
    }
    if (err.code === 'DUPLICATE_RESOURCE') {
      return 'This account already has a technician profile (one account → one profile).'
    }
    if (err.code === 'VERSION_CONFLICT') {
      return 'Someone else changed this profile — the latest version was reloaded. Review and save again.'
    }
  }
  return backendErrorMessage(err)
}

export default function TechnicianProfiles() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()

  const canManage = hasPermission(PERMS.techProfilesManage)

  const [items, setItems] = useState<TechnicianProfile[]>([])
  const [pageMeta, setPageMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TechnicianProfile | null>(null)
  const [form, setForm] = useState({ displayName: '', userId: '', status: 'ACTIVE' as ProfileStatus })
  const [userIdMode, setUserIdMode] = useState<UserIdMode>('keep')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const [selected, setSelected] = useState<TechnicianProfile | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await technicianProfilesV3.list({ page, pageSize: PAGE_SIZE })
      setItems(res.items)
      setPageMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setFormErrors((e) => ({ ...e, [key]: '' }))
    setSaveError(null)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ displayName: '', userId: '', status: 'ACTIVE' })
    setUserIdMode('keep')
    setFormErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (profile: TechnicianProfile) => {
    setEditing(profile)
    setForm({
      displayName: profile.displayName ?? '',
      userId: profile.userId ?? '',
      status: profile.status ?? 'ACTIVE',
    })
    setUserIdMode('keep')
    setFormErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.displayName.trim()) next.displayName = 'Display name is required.'
    if (!editing && form.userId.trim() !== '') {
      if (!/^[0-9a-fA-F-]{36}$/.test(form.userId.trim())) next.userId = 'userId must be a valid UUID, or left empty.'
    }
    if (editing && userIdMode === 'set') {
      if (!form.userId.trim()) next.userId = 'Enter an account UUID, or choose Unlink instead.'
      else if (!/^[0-9a-fA-F-]{36}$/.test(form.userId.trim())) next.userId = 'userId must be a valid UUID.'
    }
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  const reloadEditing = async (id: string) => {
    try {
      const fresh = await technicianProfilesV3.get(id)
      setEditing(fresh)
      setForm({ displayName: fresh.displayName ?? '', userId: fresh.userId ?? '', status: fresh.status ?? 'ACTIVE' })
      setUserIdMode('keep')
      if (selected?.id === id) setSelected(fresh)
    } catch {
      /* keep the stale copy; the toast already explains the conflict */
    }
  }

  const save = async () => {
    if (!validate() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        const payload: { version: number; displayName?: string; userId?: string | null; status?: ProfileStatus } = {
          version: editing.version,
        }
        if (form.displayName.trim() !== (editing.displayName ?? '')) payload.displayName = form.displayName.trim()
        if (userIdMode === 'unlink') payload.userId = null
        else if (userIdMode === 'set' && form.userId.trim() !== (editing.userId ?? '')) payload.userId = form.userId.trim()
        if (form.status !== editing.status) payload.status = form.status
        if (payload.displayName === undefined && payload.userId === undefined && payload.status === undefined) {
          setSaveError(new ApiError({ message: 'Nothing to change — edit at least one field.', code: 'BAD_REQUEST', status: 400 }))
          setSaving(false)
          return
        }
        const updated = await technicianProfilesV3.update(editing.id, payload)
        showToast('success', 'Technician profile updated', updated.displayName)
        if (selected?.id === updated.id) setSelected(updated)
      } else {
        const created = await technicianProfilesV3.create({
          displayName: form.displayName.trim(),
          ...(form.userId.trim() ? { userId: form.userId.trim() } : {}),
        })
        showToast('success', 'Technician profile created', created.displayName)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveError(err)
      const friendly = friendlyProfileError(err)
      showToast('error', 'Save failed', err instanceof ApiError && err.requestId ? `${friendly} (requestId ${err.requestId})` : friendly)
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT' && editing) {
        await reloadEditing(editing.id)
      }
    } finally {
      setSaving(false)
    }
  }

  const unlinkAccount = async (profile: TechnicianProfile) => {
    if (busyId || !profile.userId) return
    setBusyId(profile.id)
    try {
      const updated = await technicianProfilesV3.update(profile.id, { version: profile.version, userId: null })
      showToast('success', 'Account unlinked', 'The profile itself was kept; only the login link was removed.')
      if (selected?.id === updated.id) setSelected(updated)
      load()
    } catch (err) {
      const friendly = friendlyProfileError(err)
      showToast('error', 'Unlink failed', err instanceof ApiError && err.requestId ? `${friendly} (requestId ${err.requestId})` : friendly)
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        await reloadEditing(profile.id)
      }
    } finally {
      setBusyId(null)
    }
  }

  const headerSubtitle = useMemo(() => `${pageMeta.totalItems} technician profiles`, [pageMeta.totalItems])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician profiles"
        subtitle={headerSubtitle}
        actions={
          canManage ? (
            <Button
              onClick={openAdd}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              Add profile
            </Button>
          ) : undefined
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <span className="text-xs text-slate-400 ms-auto">{pageMeta.totalItems} results</span>
        </div>

        {status === 'loading' && <div className="p-4"><LoadingState label="Loading technician profiles…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load technician profiles" /></div>}
        {status === 'success' && items.length === 0 && (
          <div className="p-4"><EmptyState title="No technician profiles found" hint="Profiles make accounts assignable to jobs." /></div>
        )}

        {status === 'success' && items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Display name</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked account</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(p)}>
                      <td className="px-6 py-4 font-medium text-slate-900">{p.displayName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600" dir="ltr">{p.userId ?? '— not linked —'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={p.status === 'ACTIVE' ? 'active' : 'inactive'} label={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {canManage && <button onClick={() => openEdit(p)} className="text-xs text-slate-500 hover:text-blue-600">Edit</button>}
                          {canManage && p.userId && (
                            <>
                              <span className="text-slate-200">|</span>
                              <button
                                onClick={() => unlinkAccount(p)}
                                disabled={busyId === p.id}
                                className="text-xs text-slate-500 hover:text-red-600 disabled:opacity-40"
                              >
                                {busyId === p.id ? 'Unlinking…' : 'Unlink'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-50">
              {items.map((p) => (
                <div key={p.id} className="px-4 py-3 active:bg-slate-50 cursor-pointer" onClick={() => setSelected(p)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 truncate">{p.displayName}</p>
                    <Badge variant={p.status === 'ACTIVE' ? 'active' : 'inactive'} label={p.status} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono" dir="ltr">{p.userId ?? 'not linked'}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">
                Page {pageMeta.page} of {pageMeta.totalPages} · {pageMeta.totalItems} total
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                <span className="text-sm text-slate-600 px-2">{page} / {pageMeta.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(pageMeta.totalPages, p + 1))} disabled={page >= pageMeta.totalPages} className="h-8 px-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit technician profile' : 'Add technician profile'}
        size="md"
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>{t('action.cancel')}</Button>
            <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? t('action.save') : 'Create profile'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Display name"
            value={form.displayName}
            onChange={(e) => setField('displayName', e.target.value)}
            placeholder="Amr Shawky"
            required
            error={formErrors.displayName}
          />
          {!editing ? (
            <Input
              label="Account user ID (optional)"
              value={form.userId}
              onChange={(e) => setField('userId', e.target.value)}
              placeholder="UUID of an ACTIVE TECHNICIAN account"
              error={formErrors.userId}
              hint="Must be an ACTIVE account holding the TECHNICIAN role (422 ACCOUNT_NOT_ELIGIBLE otherwise)."
            />
          ) : (
            <>
              <div className="flex gap-2">
                {(['keep', 'set', 'unlink'] as UserIdMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setUserIdMode(mode); setSaveError(null) }}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      userIdMode === mode
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'keep' ? 'Keep link' : mode === 'set' ? 'Set / change link' : 'Unlink account'}
                  </button>
                ))}
              </div>
              {userIdMode === 'set' && (
                <Input
                  label="Account user ID"
                  value={form.userId}
                  onChange={(e) => setField('userId', e.target.value)}
                  placeholder="UUID of an ACTIVE TECHNICIAN account"
                  error={formErrors.userId}
                />
              )}
              {userIdMode === 'unlink' && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  The account will be unlinked (userId: null). The profile itself is kept.
                </p>
              )}
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </>
          )}
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.displayName} size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button>
              {canManage && selected.userId && (
                <Button variant="secondary" disabled={busyId === selected.id} onClick={() => unlinkAccount(selected)}>
                  {busyId === selected.id ? 'Unlinking…' : 'Unlink account'}
                </Button>
              )}
              {canManage && <Button onClick={() => openEdit(selected)}>Edit</Button>}
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Profile ID', value: selected.id },
              { label: 'Status', value: selected.status },
              { label: 'Linked account (userId)', value: selected.userId ?? '— not linked —' },
              { label: 'Version', value: String(selected.version) },
              { label: 'Updated', value: selected.updatedAt ?? '—' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <div className="mt-0.5 text-sm font-medium text-slate-800 break-all" dir="ltr">{item.value}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
