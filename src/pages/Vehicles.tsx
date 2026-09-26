import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { vehiclesV3, type Vehicle, type VehicleDetail } from '../api/v3/vehicles'
import { customersV3 } from '../api/v3/customers'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'
import { PERMS, backendErrorMessage } from '../api/v3/types'

const PAGE_SIZE = 20

const emptyForm = { customerId: '', plate: '', vin: '', make: '', model: '', year: '', mileage: '', mileageUnit: 'KM' }

export default function Vehicles() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedCustomer = searchParams.get('customerId') ?? ''
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(PERMS.vehiclesWrite)

  const [items, setItems] = useState<Vehicle[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [customerId, setCustomerId] = useState(preselectedCustomer)
  const [statusFilter, setStatusFilter] = useState('')
  const [makeFilter, setMakeFilter] = useState('')

  const [status, setStatusState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [selected, setSelected] = useState<VehicleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState({ ...emptyForm, customerId: preselectedCustomer })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)
  const [archiveTarget, setArchiveTarget] = useState<Vehicle | null>(null)
  const [busy, setBusy] = useState(false)
  const [customerOptions, setCustomerOptions] = useState<{ id: string; displayName: string }[]>([])

  // Reminders
  const [reminders, setReminders] = useState<never[]>([])
  const [reminderForm, setReminderForm] = useState({ title: '', dueDate: '', dueMileage: '', notes: '' })
  const [reminderOpen, setReminderOpen] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => { setDebouncedQ(search.trim()); setPage(1) }, 400)
    return () => window.clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    setStatusState('loading')
    setError(null)
    try {
      const res = await vehiclesV3.list({
        page, pageSize: PAGE_SIZE,
        q: debouncedQ || undefined,
        customerId: customerId || undefined,
        make: makeFilter || undefined,
        status: statusFilter || undefined,
      })
      setItems(res.items)
      setMeta(res.page)
      setStatusState('success')
    } catch (err) {
      setError(err)
      setStatusState('error')
    }
  }, [page, debouncedQ, customerId, makeFilter, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    customersV3.list({ page: 1, pageSize: 100 }).then(
      (res) => setCustomerOptions(res.items.map((c) => ({ id: c.id, displayName: c.displayName }))),
      () => {},
    )
  }, [])

  const openDetail = async (v: Vehicle) => {
    setDetailLoading(true)
    try {
      const detail = await vehiclesV3.get(v.id)
      setSelected(detail)
      const rem = await vehiclesV3.reminders(v.id, { page: 1, pageSize: 20 })
      setReminders(rem.items as never[])
    } catch (err) {
      showToast('error', 'Failed to load vehicle', backendErrorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
    setSaveError(null)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.customerId && !editing) next.customerId = 'Customer is required.'
    if (!form.make.trim()) next.make = 'Make is required.'
    if (!form.model.trim()) next.model = 'Model is required.'
    const year = Number(form.year)
    if (!form.year || !Number.isInteger(year) || year < 1950 || year > 2100) next.year = 'Enter a valid year (1950–2100).'
    if (form.plate.trim().length < 2) next.plate = 'Plate number is required.'
    if (!form.vin.trim()) next.vin = 'VIN is required (17 characters, no I, O, Q).'
    else if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(form.vin.trim())) next.vin = 'VIN must be 17 characters (no I, O, Q).'
    if (form.mileage === '') next.mileage = 'Mileage is required (whole number ≥ 0).'
    else if (!(Number(form.mileage) >= 0) || !Number.isInteger(Number(form.mileage))) next.mileage = 'Mileage must be a whole number ≥ 0.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        const payload: Record<string, unknown> = {}
        if (form.plate.trim()) payload.plate = form.plate.trim()
        if (form.vin.trim()) payload.vin = form.vin.trim().toUpperCase()
        if (form.make.trim()) payload.make = form.make.trim()
        if (form.model.trim()) payload.model = form.model.trim()
        if (form.year) payload.year = Number(form.year)
        if (form.mileage !== '') payload.mileage = Number(form.mileage)
        const updated = await vehiclesV3.update(editing.id, payload as never)
        showToast('success', 'Vehicle updated', (updated as unknown as { plate?: string }).plate ?? editing.id)
      } else {
        const created = await vehiclesV3.create({
          customerId: form.customerId,
          plate: form.plate.trim(),
          vin: form.vin.trim().toUpperCase(),
          make: form.make.trim(),
          model: form.model.trim(),
          year: Number(form.year),
          mileage: Number(form.mileage),
          mileageUnit: form.mileageUnit as 'KM' | 'MI',
        } as never)
        showToast('success', 'Vehicle registered', (created as unknown as { plate?: string }).plate ?? '')
      }
      setAddOpen(false)
      setEditing(null)
      load()
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (v: Vehicle) => {
    const r = v as unknown as Record<string, string | number | undefined>
    setEditing(v)
    setForm({
      customerId: (r.customerId as string) ?? '',
      plate: (r.plate as string) ?? '',
      vin: (r.vin as string) ?? '',
      make: (r.make as string) ?? '',
      model: (r.model as string) ?? '',
      year: String(r.year ?? ''),
      mileage: r.mileage !== undefined ? String(r.mileage) : '',
      mileageUnit: 'KM',
    })
    setErrors({})
    setSaveError(null)
    setAddOpen(true)
  }

  const confirmArchive = async (toStatus: 'ACTIVE' | 'ARCHIVED') => {
    if (!archiveTarget || busy) return
    setBusy(true)
    try {
      await vehiclesV3.update(archiveTarget.id, { status: toStatus } as never)
      showToast('success', toStatus === 'ARCHIVED' ? 'Vehicle archived' : 'Vehicle reactivated', archiveTarget.id)
      setArchiveTarget(null)
      load()
    } catch (err) {
      showToast('error', 'Update failed', err instanceof ApiError && err.requestId ? `${backendErrorMessage(err)} (requestId ${err.requestId})` : backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const createReminder = async () => {
    if (!selected) return
    if (!reminderForm.title.trim()) { showToast('error', 'Title required', 'Reminder title is required.'); return }
    if (!reminderForm.dueDate && !reminderForm.dueMileage) { showToast('error', 'Trigger required', 'Provide dueDate or dueMileage.'); return }
    try {
      await vehiclesV3.createReminder(selected.id, {
        title: reminderForm.title.trim(),
        ...(reminderForm.dueDate ? { dueDate: reminderForm.dueDate } : {}),
        ...(reminderForm.dueMileage ? { dueMileage: Number(reminderForm.dueMileage) } : {}),
        ...(reminderForm.notes ? { notes: reminderForm.notes } : {}),
      } as never)
      showToast('success', 'Reminder created', reminderForm.title.trim())
      setReminderOpen(false)
      setReminderForm({ title: '', dueDate: '', dueMileage: '', notes: '' })
      const rem = await vehiclesV3.reminders(selected.id, { page: 1, pageSize: 20 })
      setReminders(rem.items as never[])
    } catch (err) {
      showToast('error', 'Reminder failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('vehicles.title')} subtitle={`${meta.totalItems} vehicles`}
        actions={canWrite
          ? <Button onClick={() => { setEditing(null); setForm({ ...emptyForm, customerId }); setErrors({}); setSaveError(null); setAddOpen(true) }}>{t('vehicles.registerBtn')}</Button>
          : <span title="Requires vehicles.write permission (Service Advisor role)"><Button disabled>{t('vehicles.registerBtn')}</Button></span>} />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center md:gap-3">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder={t('vehicles.search')} /></div>
          <input value={makeFilter} onChange={(e) => { setMakeFilter(e.target.value); setPage(1) }} placeholder="Make filter" className="h-9 px-3 border border-slate-200 rounded-lg text-sm w-32" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
            <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option>
          </select>
          {customerId && <button onClick={() => setCustomerId('')} className="text-xs text-blue-600 font-medium">Clear customer filter ×</button>}
          <span className="text-xs text-slate-400 md:ms-auto">{meta.totalItems} results</span>
        </div>

        {status === 'loading' && <div className="p-4"><LoadingState label="Loading vehicles…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load vehicles" /></div>}
        {status === 'success' && items.length === 0 && (
          <div className="p-4"><EmptyState title="No vehicles found" hint="Try adjusting your search or filters."
            action={<Button variant="secondary" size="sm" onClick={() => { setSearch(''); setMakeFilter(''); setStatusFilter(''); setCustomerId(''); setPage(1) }}>Clear filters</Button>} /></div>
        )}
        {status === 'success' && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Plate / VIN</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Mileage</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map((v) => {
                    const r = v as unknown as Record<string, string | number | undefined>
                    return (
                      <tr key={v.id} onClick={() => openDetail(v)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                        <td className="px-6 py-4"><p className="font-medium text-slate-900">{r.year} {r.make} {r.model}</p><p className="text-xs text-slate-400 font-mono">{String(r.customerId ?? '').slice(0, 8)}…</p></td>
                        <td className="px-6 py-4" dir="ltr"><p className="font-mono font-medium">{String(r.plate ?? '')}</p><p className="text-xs text-slate-400 font-mono">{String(r.vin ?? '')}</p></td>
                        <td className="px-6 py-4" dir="ltr">{r.mileage !== undefined ? `${r.mileage} km` : '—'}</td>
                        <td className="px-6 py-4"><Badge variant={badgeVariantFor(String(r.status ?? 'ACTIVE'))} /></td>
                        <td className="px-6 py-4"><div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {canWrite && <button onClick={() => openEdit(v)} className="text-xs text-slate-500 hover:text-blue-600">Edit</button>}
                          {canWrite && (
                            <button
                              onClick={() => setArchiveTarget(v)}
                              className="text-xs text-slate-500 hover:text-amber-600"
                              title="Archive fails with 409 if the vehicle has an open job"
                            >
                              {(v as unknown as { status?: string }).status === 'ARCHIVED' ? 'Reactivate' : 'Archive'}
                            </button>
                          )}
                        </div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">Page {meta.page} of {meta.totalPages} · {meta.totalItems} total</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 rounded-lg border border-slate-200 disabled:opacity-40">‹</button>
                <span className="text-sm px-2">{page} / {meta.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 px-2 rounded-lg border border-slate-200 disabled:opacity-40">›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`${(selected as unknown as Record<string, string>).make ?? ''} ${(selected as unknown as Record<string, string>).model ?? ''}`} size="lg"
          footer={<><Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button><Button onClick={() => { setSelected(null); navigate('/job-cards') }}>{t('vehicles.detail.newJobCard')}</Button></>}>
          {detailLoading ? <LoadingState /> : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(selected as unknown as Record<string, unknown>)
                  .filter(([k]) => ['plate', 'vin', 'make', 'model', 'year', 'mileage', 'status'].includes(k))
                  .map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400">{k}</p><p className="text-sm font-medium font-mono">{String(v ?? '—')}</p></div>
                  ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Service history ({((selected as unknown as { serviceHistory?: unknown[] }).serviceHistory ?? []).length})</h3>
                  {canWrite && <button onClick={() => setReminderOpen(true)} className="text-xs text-blue-600 font-medium">+ Reminder</button>}
                </div>
                {((selected as unknown as { serviceHistory?: { jobId: string; jobNumber: string; complaint: string; deliveredAt: string }[] }).serviceHistory ?? []).length === 0
                  ? <p className="text-xs text-slate-400">No delivered jobs yet.</p>
                  : <div className="flex flex-col gap-2">{((selected as unknown as { serviceHistory?: { jobId: string; jobNumber: string; complaint: string; deliveredAt: string }[] }).serviceHistory ?? []).map((h) => (
                    <button key={h.jobId} onClick={() => { setSelected(null); navigate(`/job-cards/${h.jobId}`) }} className="text-start border border-slate-100 rounded-lg p-3 hover:bg-slate-50">
                      <p className="text-sm font-medium">{h.complaint}</p>
                      <p className="text-xs text-slate-400">{h.jobNumber} · {h.deliveredAt}</p>
                    </button>))}</div>}
                {(selected as unknown as { nextService?: { dueMileage?: number; dueDate?: string } }).nextService && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                    Next service: {JSON.stringify((selected as unknown as { nextService?: unknown }).nextService)}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Reminders ({reminders.length})</h3>
                {reminders.length === 0 ? <p className="text-xs text-slate-400">No reminders.</p> : (
                  <div className="flex flex-col gap-2">{reminders.map((r) => {
                    const rec = r as unknown as Record<string, string | undefined>
                    return <div key={rec.id} className="border border-slate-100 rounded-lg p-3 text-sm"><p className="font-medium">{rec.title}</p><p className="text-xs text-slate-400">{rec.status} · due {rec.dueDate ?? rec.dueMileage ?? '—'}</p></div>
                  })}</div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      <Modal open={addOpen} onClose={() => !saving && setAddOpen(false)} title={editing ? 'Edit vehicle' : t('vehicles.modal.registerTitle')} size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? 'Save' : t('vehicles.modal.registerBtn')}</Button></>}>
        <div className="flex flex-col gap-4">
          {!editing && (
            customerOptions.length > 0 ? (
              <Select label="Customer" value={form.customerId} onChange={(e) => setField('customerId', e.target.value)}
                options={[{ value: '', label: 'Select customer' }, ...customerOptions.map((c) => ({ value: c.id, label: c.displayName }))]} required error={errors.customerId} />
            ) : (
              <Input label="Customer ID (UUID)" value={form.customerId} onChange={(e) => setField('customerId', e.target.value)} placeholder="Paste customer UUID" required error={errors.customerId} />
            )
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Make" value={form.make} onChange={(e) => setField('make', e.target.value)} required error={errors.make} />
            <Input label="Model" value={form.model} onChange={(e) => setField('model', e.target.value)} required error={errors.model} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Year" type="number" value={form.year} onChange={(e) => setField('year', e.target.value)} required error={errors.year} />
            <Input label="Plate" value={form.plate} onChange={(e) => setField('plate', e.target.value)} required error={errors.plate} />
          </div>
          <Input label="VIN (17 chars)" value={form.vin} onChange={(e) => setField('vin', e.target.value.toUpperCase())} required error={errors.vin} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mileage (whole km, only increases)" type="number" value={form.mileage} onChange={(e) => setField('mileage', e.target.value)} required error={errors.mileage} />
            <Select label="Unit" value={form.mileageUnit} onChange={(e) => setField('mileageUnit', e.target.value)}
              options={[{ value: 'KM', label: 'KM' }, { value: 'MI', label: 'MI' }]} />
          </div>
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      <Modal open={reminderOpen} onClose={() => setReminderOpen(false)} title="New service reminder" size="sm"
        footer={<><Button variant="secondary" onClick={() => setReminderOpen(false)}>Cancel</Button><Button onClick={createReminder}>Create</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Title" value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label='Due date (YYYY-MM-DD)' value={reminderForm.dueDate} onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })} placeholder="2026-12-01" />
            <Input label="Due mileage" type="number" value={reminderForm.dueMileage} onChange={(e) => setReminderForm({ ...reminderForm, dueMileage: e.target.value })} />
          </div>
          <Input label="Notes (≤500)" value={reminderForm.notes} onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })} />
          <p className="text-xs text-slate-400">At least one of dueDate / dueMileage is required.</p>
        </div>
      </Modal>

      <ConfirmDialog open={!!archiveTarget} title={(archiveTarget as unknown as { status?: string } | null)?.status === 'ARCHIVED' ? 'Reactivate vehicle' : 'Archive vehicle'}
        message={archiveTarget ? ((archiveTarget as unknown as { status?: string }).status === 'ARCHIVED'
          ? `Reactivate ${(archiveTarget as unknown as { plate?: string }).plate}?`
          : `Archive ${(archiveTarget as unknown as { plate?: string }).plate}? Fails with 409 RESOURCE_IN_USE if the vehicle has an open job.`) : ''}
        confirmLabel={(archiveTarget as unknown as { status?: string } | null)?.status === 'ARCHIVED' ? 'Reactivate' : 'Archive'}
        destructive={(archiveTarget as unknown as { status?: string } | null)?.status !== 'ARCHIVED'}
        onConfirm={() => confirmArchive((archiveTarget as unknown as { status?: string })?.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')} onCancel={() => setArchiveTarget(null)} />
    </div>
  )
}
