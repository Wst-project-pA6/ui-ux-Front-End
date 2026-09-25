import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { serviceTypesV3, type ServiceType } from '../api/v3/workshop'
import { PERMS, backendErrorMessage, formatMoney } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const PAGE_SIZE = 20

type ServiceStatus = 'ACTIVE' | 'INACTIVE'

export default function ServiceTypes() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()

  const canManage = hasPermission(PERMS.serviceTypesManage)

  const [items, setItems] = useState<ServiceType[]>([])
  const [pageMeta, setPageMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [form, setForm] = useState({ code: '', name: '', laborHourlyRate: '', status: 'ACTIVE' as ServiceStatus })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await serviceTypesV3.list({ page, pageSize: PAGE_SIZE })
      if (Array.isArray(res)) {
        setItems(res)
        setPageMeta({ page: 1, pageSize: PAGE_SIZE, totalItems: res.length, totalPages: 1 })
      } else {
        setItems(res.items)
        setPageMeta(res.page)
      }
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  // laborHourlyRate is only present for callers holding service-types.manage —
  // never assume it exists; hide the column when the backend omits it.
  const showRate = useMemo(
    () => items.some((s) => s.laborHourlyRate !== undefined && s.laborHourlyRate !== null),
    [items],
  )

  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setFormErrors((e) => ({ ...e, [key]: '' }))
    setSaveError(null)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ code: '', name: '', laborHourlyRate: '', status: 'ACTIVE' })
    setFormErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (st: ServiceType) => {
    setEditing(st)
    setForm({
      code: st.code ?? '',
      name: st.name ?? '',
      laborHourlyRate: st.laborHourlyRate ?? '',
      status: (st.status as ServiceStatus | undefined) ?? 'ACTIVE',
    })
    setFormErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!editing && !/^[A-Z0-9_-]{1,20}$/.test(form.code.trim())) {
      next.code = 'Code: 1–20 chars, uppercase letters/digits/_/- only.'
    }
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!editing) {
      const rate = Number(form.laborHourlyRate)
      if (form.laborHourlyRate.trim() === '' || Number.isNaN(rate) || rate < 0) {
        next.laborHourlyRate = 'Labor hourly rate is required and must be ≥ 0.'
      }
    } else if (form.laborHourlyRate.trim() !== '') {
      const rate = Number(form.laborHourlyRate)
      if (Number.isNaN(rate) || rate < 0) next.laborHourlyRate = 'Labor hourly rate must be ≥ 0.'
    }
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  const reloadEditing = async (id: string) => {
    try {
      const fresh = await serviceTypesV3.get(id)
      setEditing(fresh)
      setForm((f) => ({
        ...f,
        name: fresh.name ?? f.name,
        laborHourlyRate: fresh.laborHourlyRate ?? f.laborHourlyRate,
        status: (fresh.status as ServiceStatus | undefined) ?? f.status,
      }))
    } catch {
      /* keep the stale copy; the toast below already explains the conflict */
    }
  }

  const save = async () => {
    if (!validate() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        if (editing.version === undefined || editing.version === null) {
          showToast('error', 'Version missing', 'Reload the record and try again.')
          await reloadEditing(editing.id)
          setSaving(false)
          return
        }
        const payload: { version: number; name?: string; laborHourlyRate?: number; status?: ServiceStatus } = {
          version: editing.version,
        }
        if (form.name.trim() !== (editing.name ?? '')) payload.name = form.name.trim()
        if (form.laborHourlyRate.trim() !== (editing.laborHourlyRate ?? '')) payload.laborHourlyRate = Number(form.laborHourlyRate)
        if (form.status !== editing.status) payload.status = form.status
        if (payload.name === undefined && payload.laborHourlyRate === undefined && payload.status === undefined) {
          setSaveError(new ApiError({ message: 'Nothing to change — edit at least one field.', code: 'BAD_REQUEST', status: 400 }))
          setSaving(false)
          return
        }
        const updated = await serviceTypesV3.update(editing.id, payload)
        showToast('success', 'Service type updated', updated.name)
      } else {
        // Contract: laborHourlyRate is sent as a JSON number on create,
        // and comes back as a money string — never send it as a string.
        const created = await serviceTypesV3.create({
          code: form.code.trim(),
          name: form.name.trim(),
          laborHourlyRate: Number(form.laborHourlyRate),
        })
        showToast('success', 'Service type created', created.name)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveError(err)
      if (err instanceof ApiError && err.status === 409 && err.code === 'VERSION_CONFLICT') {
        showToast('error', 'Version conflict', 'Someone else changed this record — reloaded the latest version. Review and save again.')
        if (editing) await reloadEditing(editing.id)
      } else if (err instanceof ApiError && err.code === 'DUPLICATE_RESOURCE') {
        showToast('error', 'Duplicate code', backendErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const headerSubtitle = useMemo(() => `${pageMeta.totalItems} service types`, [pageMeta.totalItems])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service types"
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
              Add service type
            </Button>
          ) : undefined
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <span className="text-xs text-slate-400 ms-auto">{pageMeta.totalItems} results</span>
        </div>

        {status === 'loading' && <div className="p-4"><LoadingState label="Loading service types…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load service types" /></div>}
        {status === 'success' && items.length === 0 && (
          <div className="p-4"><EmptyState title="No service types found" hint="No service types have been set up yet." /></div>
        )}

        {status === 'success' && items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    {showRate && (
                      <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Labor rate</th>
                    )}
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    {canManage && (
                      <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((st) => (
                    <tr key={st.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-slate-900" dir="ltr">{st.code}</td>
                      <td className="px-6 py-4 text-slate-700">{st.name}</td>
                      {showRate && (
                        <td className="px-6 py-4 text-slate-600" dir="ltr">
                          {st.laborHourlyRate != null
                            ? formatMoney({ amount: st.laborHourlyRate, currency: 'EGP' })
                            : '—'}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <Badge variant={st.status === 'ACTIVE' ? 'active' : 'inactive'} label={st.status} />
                      </td>
                      {canManage && (
                        <td className="px-6 py-4">
                          <button onClick={() => openEdit(st)} className="text-xs text-slate-500 hover:text-blue-600">Edit</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-50">
              {items.map((st) => (
                <div key={st.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{st.name}</p>
                    <Badge variant={st.status === 'ACTIVE' ? 'active' : 'inactive'} label={st.status} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono" dir="ltr">{st.code}</p>
                  {showRate && st.laborHourlyRate != null && (
                    <p className="text-xs text-slate-500 mt-0.5" dir="ltr">
                      {formatMoney({ amount: st.laborHourlyRate, currency: 'EGP' })}
                    </p>
                  )}
                  {canManage && (
                    <button onClick={() => openEdit(st)} className="text-xs text-blue-600 mt-2">Edit</button>
                  )}
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
        title={editing ? 'Edit service type' : 'Add service type'}
        size="md"
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>{t('action.cancel')}</Button>
            <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? t('action.save') : 'Create service type'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!editing ? (
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toUpperCase())}
              placeholder="REPAIR"
              required
              error={formErrors.code}
              hint="1–20 chars: A–Z, 0–9, _ or -."
            />
          ) : (
            <Input label="Code" value={form.code} disabled hint="Code cannot be changed after creation." />
          )}
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Repair"
            required
            error={formErrors.name}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={editing ? 'Labor hourly rate (empty = unchanged)' : 'Labor hourly rate'}
              type="number"
              min={0}
              step="any"
              value={form.laborHourlyRate}
              onChange={(e) => setField('laborHourlyRate', e.target.value)}
              placeholder="150"
              required={!editing}
              error={formErrors.laborHourlyRate}
              hint="Sent as a number; stored and displayed as money."
            />
            {editing && (
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            )}
          </div>
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>
    </div>
  )
}
