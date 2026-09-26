import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { baysV3, type Bay } from '../api/v3/workshop'
import { PERMS, backendErrorMessage, type Schemas } from '../api/v3/types'
import { request } from '../api/client'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const PAGE_SIZE = 20
const MAX_WINDOW_MS = 31 * 24 * 3600 * 1000

type BayStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
type CalEntry = Schemas['BayCalendarEntryResponseDto']

interface Scope {
  id: string
  name?: string
  code?: string
}

function statusBadgeVariant(status?: string): 'active' | 'in-progress' | 'inactive' {
  if (status === 'ACTIVE') return 'active'
  if (status === 'MAINTENANCE') return 'in-progress'
  return 'inactive'
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTs(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export default function Bays() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission, organizationScopeIds } = useAuth()

  const canManage = hasPermission(PERMS.baysManage)

  const [items, setItems] = useState<Bay[]>([])
  const [pageMeta, setPageMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'' | BayStatus>('')
  const [sort, setSort] = useState('')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [scopes, setScopes] = useState<Scope[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Bay | null>(null)
  const [form, setForm] = useState({ organizationScopeId: '', code: '', name: '', capacity: '1', status: 'ACTIVE' as BayStatus })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const [calBay, setCalBay] = useState<Bay | null>(null)
  const [calFrom, setCalFrom] = useState(() => toLocalInputValue(new Date(Date.now() - 7 * 24 * 3600 * 1000)))
  const [calTo, setCalTo] = useState(() => toLocalInputValue(new Date()))
  const [calEntries, setCalEntries] = useState<CalEntry[]>([])
  const [calStatus, setCalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [calError, setCalError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await baysV3.list({
        page,
        pageSize: PAGE_SIZE,
        sort: sort || undefined,
        status: statusFilter || undefined,
      })
      setItems(res.items)
      setPageMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page, statusFilter, sort])

  useEffect(() => {
    load()
  }, [load])

  const loadScopes = useCallback(async () => {
    try {
      const res = await request<{ items: Scope[] }>('/organization-scopes', { query: { page: 1, pageSize: 100 } })
      setScopes(res.items ?? [])
    } catch {
      // Workshop Manager has bays.manage but not scopes.manage/users.read, so
      // this list is a 403 for them — fall back to their own unit(s) from
      // /auth/me instead of making them hand-type a UUID.
      if (organizationScopeIds.length > 0) {
        setScopes(organizationScopeIds.map((id) => ({ id, name: undefined })))
      }
    }
  }, [organizationScopeIds])

  useEffect(() => {
    loadScopes()
  }, [loadScopes])

  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setFormErrors((e) => ({ ...e, [key]: '' }))
    setSaveError(null)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({
      organizationScopeId: scopes.length === 1 ? scopes[0].id : '',
      code: '',
      name: '',
      capacity: '1',
      status: 'ACTIVE',
    })
    setFormErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (bay: Bay) => {
    setEditing(bay)
    setForm({
      organizationScopeId: bay.organizationScopeId ?? '',
      code: bay.code ?? '',
      name: bay.name ?? '',
      capacity: String(bay.capacity ?? 1),
      status: bay.status ?? 'ACTIVE',
    })
    setFormErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!editing && !form.organizationScopeId.trim()) next.organizationScopeId = 'Select an organizational unit.'
    if (!editing && !form.code.trim()) next.code = 'Code is required (1–20 chars).'
    else if (!editing && (form.code.trim().length > 20)) next.code = 'Code must be 1–20 characters.'
    if (!form.name.trim()) next.name = 'Name is required.'
    const cap = Number(form.capacity)
    if (!Number.isInteger(cap) || cap < 1) next.capacity = 'Capacity must be a whole number of at least 1.'
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        const updated = await baysV3.update(editing.id, {
          name: form.name.trim(),
          capacity: Number(form.capacity),
          status: form.status,
        })
        showToast('success', 'Bay updated', updated.name)
      } else {
        const created = await baysV3.create({
          organizationScopeId: form.organizationScopeId.trim(),
          code: form.code.trim(),
          name: form.name.trim(),
          capacity: Number(form.capacity),
        })
        showToast('success', 'Bay created', created.name)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveError(err)
      if (err instanceof ApiError && err.code === 'DUPLICATE_RESOURCE') {
        showToast('error', 'Duplicate code', backendErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const openCalendar = (bay: Bay) => {
    setCalBay(bay)
    setCalFrom(toLocalInputValue(new Date(Date.now() - 7 * 24 * 3600 * 1000)))
    setCalTo(toLocalInputValue(new Date()))
    setCalEntries([])
    setCalStatus('idle')
    setCalError(null)
  }

  const loadCalendar = useCallback(async () => {
    if (!calBay) return
    const fromDate = new Date(calFrom)
    const toDate = new Date(calTo)
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      showToast('error', 'Invalid range', 'Enter both a start and an end date/time.')
      return
    }
    if (toDate <= fromDate) {
      showToast('error', 'Invalid range', 'The end must be after the start.')
      return
    }
    if (toDate.getTime() - fromDate.getTime() > MAX_WINDOW_MS) {
      showToast('error', 'Range too wide', 'The calendar window must be at most 31 days.')
      return
    }
    setCalStatus('loading')
    setCalError(null)
    try {
      const res = await baysV3.calendar(calBay.id, fromDate.toISOString(), toDate.toISOString())
      setCalEntries(res.entries ?? [])
      setCalStatus('success')
    } catch (err) {
      setCalError(err)
      setCalStatus('error')
    }
  }, [calBay, calFrom, calTo, showToast])

  const headerSubtitle = useMemo(() => `${pageMeta.totalItems} bays`, [pageMeta.totalItems])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bays"
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
              Add bay
            </Button>
          ) : undefined
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center md:gap-3">
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as '' | BayStatus); setPage(1) }}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Sort bays"
            >
              <option value="">Default sort</option>
              <option value="code">Code ↑</option>
              <option value="-code">Code ↓</option>
              <option value="name">Name ↑</option>
              <option value="-name">Name ↓</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 md:ms-auto">{pageMeta.totalItems} results</span>
        </div>

        {status === 'loading' && <div className="p-4"><LoadingState label="Loading bays…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load bays" /></div>}
        {status === 'success' && items.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No bays found"
              hint="Try adjusting your filters."
              action={
                <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(''); setSort(''); setPage(1) }}>
                  Clear filters
                </Button>
              }
            />
          </div>
        )}

        {status === 'success' && items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((bay) => (
                    <tr key={bay.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-slate-900" dir="ltr">{bay.code}</td>
                      <td className="px-6 py-4 text-slate-700">{bay.name}</td>
                      <td className="px-6 py-4 text-slate-600">{bay.capacity}</td>
                      <td className="px-6 py-4"><Badge variant={statusBadgeVariant(bay.status)} label={bay.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openCalendar(bay)} className="text-xs text-slate-500 hover:text-blue-600">Calendar</button>
                          {canManage && <span className="text-slate-200">|</span>}
                          {canManage && <button onClick={() => openEdit(bay)} className="text-xs text-slate-500 hover:text-blue-600">Edit</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-50">
              {items.map((bay) => (
                <div key={bay.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 font-mono" dir="ltr">{bay.code}</p>
                    <Badge variant={statusBadgeVariant(bay.status)} label={bay.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{bay.name} · capacity {bay.capacity}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => openCalendar(bay)} className="text-xs text-blue-600">Calendar</button>
                    {canManage && <button onClick={() => openEdit(bay)} className="text-xs text-blue-600">Edit</button>}
                  </div>
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
        title={editing ? 'Edit bay' : 'Add bay'}
        size="md"
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>{t('action.cancel')}</Button>
            <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? t('action.save') : 'Create bay'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!editing && (
            scopes.length > 0 ? (
              <Select
                label="Organizational unit"
                value={form.organizationScopeId}
                onChange={(e) => setField('organizationScopeId', e.target.value)}
                options={[{ value: '', label: 'Select unit' }, ...scopes.map((s) => ({ value: s.id, label: s.name ?? s.code ?? s.id }))]}
                required
                error={formErrors.organizationScopeId}
              />
            ) : (
              <Input
                label="Organization scope ID (UUID)"
                value={form.organizationScopeId}
                onChange={(e) => setField('organizationScopeId', e.target.value)}
                placeholder="UUID of your unit"
                required
                error={formErrors.organizationScopeId}
              />
            )
          )}
          {!editing && (
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toUpperCase())}
              placeholder="BAY-01"
              required
              error={formErrors.code}
              hint="1–20 characters."
            />
          )}
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Bay 1 - General Service"
            required
            error={formErrors.name}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Capacity"
              type="number"
              min={1}
              step={1}
              value={form.capacity}
              onChange={(e) => setField('capacity', e.target.value)}
              required
              error={formErrors.capacity}
            />
            {editing && (
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'MAINTENANCE', label: 'Maintenance' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            )}
          </div>
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      <Modal open={!!calBay} onClose={() => setCalBay(null)} title={calBay ? `Calendar — ${calBay.code}` : ''} size="lg">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Input label="From" type="datetime-local" value={calFrom} onChange={(e) => setCalFrom(e.target.value)} />
            <Input label="To" type="datetime-local" value={calTo} onChange={(e) => setCalTo(e.target.value)} />
            <Button onClick={loadCalendar} disabled={calStatus === 'loading'}>
              {calStatus === 'loading' ? 'Loading…' : 'Load'}
            </Button>
          </div>
          <p className="text-xs text-slate-400">ISO datetimes (Z); window must be at most 31 days.</p>

          {calStatus === 'idle' && <EmptyState title="No calendar loaded yet" hint="Pick a range and press Load." />}
          {calStatus === 'loading' && <LoadingState label="Loading calendar…" />}
          {calStatus === 'error' && <ErrorState error={calError} onRetry={loadCalendar} title="Failed to load calendar" />}
          {calStatus === 'success' && calEntries.length === 0 && (
            <EmptyState title="Bay is free in this window" hint="No jobs or training sessions overlap the selected range." />
          )}
          {calStatus === 'success' && calEntries.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-500 uppercase">Kind</th>
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-500 uppercase">Reference</th>
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-500 uppercase">Window</th>
                  </tr>
                </thead>
                <tbody>
                  {calEntries.map((entry, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <Badge variant={entry.kind === 'JOB' ? 'received' : 'quality-check'} label={entry.kind === 'JOB' ? 'Job' : 'Training session'} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{entry.referenceLabel}</p>
                        {entry.kind === 'TRAINING_SESSION' && (
                          <p className="text-xs text-slate-400">
                            {[entry.courseName, entry.mentorName].filter(Boolean).join(' · ') || '—'}
                          </p>
                        )}
                        {entry.kind === 'JOB' && !entry.referenceId && (
                          <p className="text-xs text-slate-400">Time window only — no link available.</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600" dir="ltr">
                        {formatTs(entry.startsAt)} → {formatTs(entry.endsAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
