import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { customersV3, type Customer } from '../api/v3/customers'
import { request } from '../api/client'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'
import { PERMS, backendErrorMessage } from '../api/v3/types'

const PAGE_SIZE = 20

interface Scope { id: string; name?: string; code?: string }

const emptyForm = {
  organizationScopeId: '',
  displayName: '',
  type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
  phone: '',
  email: '',
  preferredChannel: '' as '' | 'PHONE' | 'SMS' | 'EMAIL',
  preferredLocale: '' as '' | 'en' | 'ar',
}

export default function Customers() {
  const navigate = useNavigate()
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(PERMS.customersRead)
  const canWrite = hasPermission(PERMS.customersWrite)
  const canErase = hasPermission(PERMS.customersErasure)
  // When /auth/me is unreachable (offline preview) fall back to allowing reads
  // so the page still attempts the real API and shows a real error state.
  const permissive = true

  const [items, setItems] = useState<Customer[]>([])
  const [pageMeta, setPageMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'ARCHIVED'>('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [sort, setSort] = useState('')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const [scopes, setScopes] = useState<Scope[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Customer | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null)
  const [eraseTarget, setEraseTarget] = useState<Customer | null>(null)
  const [eraseReason, setEraseReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQ(search.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await customersV3.list({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedQ || undefined,
        status: statusFilter || undefined,
        phone: phoneFilter.trim() || undefined,
        sort: sort || undefined,
      })
      setItems(res.items)
      setPageMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page, debouncedQ, statusFilter, phoneFilter, sort])

  useEffect(() => {
    load()
  }, [load])

  const loadScopes = useCallback(async () => {
    try {
      const res = await request<{ items: Scope[] }>('/organization-scopes', { query: { page: 1, pageSize: 100 } })
      setScopes(res.items ?? [])
      if (res.items?.length === 1 && !form.organizationScopeId) {
        setForm((f) => ({ ...f, organizationScopeId: res.items[0].id }))
      }
    } catch {
      /* scope picker falls back to manual entry */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadScopes()
  }, [loadScopes])

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
    setSaveError(null)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, organizationScopeId: scopes.length === 1 ? scopes[0].id : '' })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      organizationScopeId: (c as unknown as { organizationScopeId?: string }).organizationScopeId ?? '',
      displayName: c.displayName ?? '',
      type: (c as unknown as { type?: 'INDIVIDUAL' | 'BUSINESS' }).type ?? 'INDIVIDUAL',
      phone: (c as unknown as { phone?: string }).phone ?? '',
      email: (c as unknown as { email?: string }).email ?? '',
      preferredChannel: ((c as unknown as { contactPreferences?: { preferredChannel?: string } }).contactPreferences?.preferredChannel as never) ?? '',
      preferredLocale: ((c as unknown as { contactPreferences?: { preferredLocale?: string } }).contactPreferences?.preferredLocale as never) ?? '',
    })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!editing && !form.organizationScopeId) next.organizationScopeId = 'Select an organizational unit.'
    if (!form.displayName.trim()) next.displayName = 'Display name is required.'
    if (!/^\+[1-9][0-9]{6,14}$/.test(form.phone.trim())) next.phone = 'Phone must be international format, e.g. +201000000001.'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const contactPreferences =
        form.preferredChannel || form.preferredLocale
          ? {
              ...(form.preferredChannel ? { preferredChannel: form.preferredChannel } : {}),
              ...(form.preferredLocale ? { preferredLocale: form.preferredLocale } : {}),
            }
          : undefined
      if (editing) {
        const payload: Record<string, unknown> = {}
        if (form.displayName.trim() !== (editing.displayName ?? '')) payload.displayName = form.displayName.trim()
        if (form.phone.trim() !== ((editing as unknown as { phone?: string }).phone ?? '')) payload.phone = form.phone.trim()
        const prevEmail = ((editing as unknown as { email?: string }).email ?? '')
        if (form.email.trim() !== prevEmail) payload.email = form.email.trim() || undefined
        if (contactPreferences) payload.contactPreferences = contactPreferences
        const prevType = ((editing as unknown as { type?: string }).type ?? 'INDIVIDUAL')
        if (form.type !== prevType) payload.type = form.type
        if (Object.keys(payload).length === 0) {
          setSaveError(new ApiError({ message: 'Nothing to change — edit at least one field.', code: 'BAD_REQUEST', status: 400 }))
          setSaving(false)
          return
        }
        const updated = await customersV3.update(editing.id, payload as never)
        showToast('success', 'Customer updated', updated.displayName)
      } else {
        const created = await customersV3.create({
          organizationScopeId: form.organizationScopeId,
          displayName: form.displayName.trim(),
          type: form.type,
          phone: form.phone.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          ...(contactPreferences ? { contactPreferences: contactPreferences as never } : {}),
        } as never)
        showToast('success', 'Customer added', created.displayName)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveError(err)
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        showToast('error', 'Record changed', 'Reload the latest version and retry.')
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmArchive = async (toStatus: 'ACTIVE' | 'ARCHIVED') => {
    if (!archiveTarget || busyId) return
    setBusyId(archiveTarget.id)
    try {
      await customersV3.update(archiveTarget.id, { status: toStatus } as never)
      showToast('success', toStatus === 'ARCHIVED' ? 'Customer archived' : 'Customer reactivated', archiveTarget.displayName)
      setArchiveTarget(null)
      if (selected?.id === archiveTarget.id) {
        const fresh = await customersV3.get(archiveTarget.id)
        setSelected(fresh)
      }
      load()
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Update failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    } finally {
      setBusyId(null)
    }
  }

  const confirmErase = async () => {
    if (!eraseTarget || busyId) return
    if (eraseReason.trim().length < 10) {
      showToast('error', 'Reason required', 'Erasure reason must be 10–500 characters.')
      return
    }
    setBusyId(eraseTarget.id)
    try {
      const updated = await customersV3.eraseContact(eraseTarget.id, eraseReason.trim())
      showToast('success', 'Contact data erased', 'This is permanent — phone/email removed.')
      setEraseTarget(null)
      setEraseReason('')
      setSelected(updated)
      load()
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Erasure failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    } finally {
      setBusyId(null)
    }
  }

  const initials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  const headerSubtitle = useMemo(
    () => `${pageMeta.totalItems} customers`,
    [pageMeta.totalItems],
  )

  if (!canRead && !permissive) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('customers.title')} subtitle="No permission" />
        <EmptyState title="You do not have customers.read permission" hint="Ask your administrator for access." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers.title')}
        subtitle={headerSubtitle}
        actions={
          canWrite ? (
            <Button
              onClick={openAdd}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              {t('customers.addBtn')}
            </Button>
          ) : undefined
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center md:gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder={t('customers.search')} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={phoneFilter}
              onChange={(e) => { setPhoneFilter(e.target.value); setPage(1) }}
              placeholder="Phone filter"
              dir="ltr"
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as '' | 'ACTIVE' | 'ARCHIVED'); setPage(1) }}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('customers.filter.allStatus')}</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Default sort</option>
              <option value="displayName">Name ↑</option>
              <option value="-displayName">Name ↓</option>
              <option value="createdAt">Oldest</option>
              <option value="-createdAt">Newest</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 md:ms-auto">{pageMeta.totalItems} {t('customers.results')}</span>
        </div>

        {status === 'loading' && <div className="p-4"><LoadingState label="Loading customers…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load customers" /></div>}
        {status === 'success' && items.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No customers found"
              hint="Try adjusting your search or filters."
              action={
                <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setPhoneFilter(''); setStatusFilter(''); setSort(''); setPage(1) }}>
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
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.customer')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.phone')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.status')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const rec = c as unknown as { phone?: string; email?: string; type?: string; status?: string }
                    return (
                      <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(c)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                              {initials(c.displayName)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{c.displayName}</p>
                              <p className="text-xs text-slate-400">{rec.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600" dir="ltr">{rec.phone ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-600">{rec.type ?? '—'}</td>
                        <td className="px-6 py-4"><Badge variant={badgeVariantFor(rec.status ?? 'ACTIVE')} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {canWrite && <button onClick={() => openEdit(c)} className="text-xs text-slate-500 hover:text-blue-600">{t('customers.action.edit')}</button>}
                            {canWrite && <span className="text-slate-200">|</span>}
                            <button onClick={() => navigate(`/vehicles?customerId=${c.id}`)} className="text-xs text-slate-500 hover:text-blue-600">Vehicles</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-50">
              {items.map((c) => {
                const rec = c as unknown as { phone?: string; status?: string }
                return (
                  <div key={c.id} className="px-4 py-3 active:bg-slate-50 cursor-pointer" onClick={() => setSelected(c)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                        {initials(c.displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 truncate">{c.displayName}</p>
                          <Badge variant={badgeVariantFor(rec.status ?? 'ACTIVE')} />
                        </div>
                        <p className="text-xs text-slate-400" dir="ltr">{rec.phone ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
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

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? t('customers.action.edit') : t('customers.modal.addTitle')} size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>{t('action.cancel')}</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : editing ? t('action.save') : t('customers.modal.saveBtn')}</Button></>}>
        <div className="flex flex-col gap-4">
          {!editing && (
            scopes.length > 0 ? (
              <Select label="Organizational unit" value={form.organizationScopeId} onChange={(e) => setField('organizationScopeId', e.target.value)}
                options={[{ value: '', label: 'Select unit' }, ...scopes.map((s) => ({ value: s.id, label: s.name ?? s.code ?? s.id }))]} required error={errors.organizationScopeId} />
            ) : (
              <Input label="Organization scope ID (UUID)" value={form.organizationScopeId} onChange={(e) => setField('organizationScopeId', e.target.value)} placeholder="UUID of your unit" required error={errors.organizationScopeId} />
            )
          )}
          <Input label="Display name" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} placeholder="Ahmed Hassan" required error={errors.displayName} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setField('type', e.target.value)} options={[{ value: 'INDIVIDUAL', label: 'Individual' }, { value: 'BUSINESS', label: 'Business' }]} />
            <Input label="Phone (international)" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+201000000001" required error={errors.phone} />
          </div>
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="customer@example.com" error={errors.email} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Preferred channel" value={form.preferredChannel} onChange={(e) => setField('preferredChannel', e.target.value)} options={[{ value: '', label: '—' }, { value: 'PHONE', label: 'Phone' }, { value: 'SMS', label: 'SMS' }, { value: 'EMAIL', label: 'Email' }]} />
            <Select label="Locale" value={form.preferredLocale} onChange={(e) => setField('preferredLocale', e.target.value)} options={[{ value: '', label: '—' }, { value: 'en', label: 'en' }, { value: 'ar', label: 'ar' }]} />
          </div>
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      <ConfirmDialog open={!!archiveTarget} title={archiveTarget ? ((archiveTarget as unknown as { status?: string }).status === 'ARCHIVED' ? 'Reactivate customer' : 'Archive customer') : ''}
        message={archiveTarget ? ((archiveTarget as unknown as { status?: string }).status === 'ARCHIVED'
          ? `Reactivate ${archiveTarget.displayName}? Erased customers can never be reactivated.`
          : `Archive ${archiveTarget.displayName}? Fails if the customer has an open job (409 RESOURCE_IN_USE).`) : ''}
        confirmLabel="Confirm" destructive={((archiveTarget as unknown as { status?: string })?.status !== 'ARCHIVED')}
        onConfirm={() => confirmArchive(((archiveTarget as unknown as { status?: string })?.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED'))}
        onCancel={() => setArchiveTarget(null)} />

      <Modal open={!!eraseTarget} onClose={() => setEraseTarget(null)} title="Erase contact data (permanent)" size="sm"
        footer={<><Button variant="secondary" onClick={() => setEraseTarget(null)}>Cancel</Button><Button disabled={!!busyId} onClick={confirmErase}>Erase permanently</Button></>}>
        <p className="text-sm text-slate-600">Customer must already be archived. Phone/email disappear and the name becomes a generic label. This cannot be undone.</p>
        <div className="mt-3">
          <label className="text-sm font-medium text-slate-700">Reason (10–500 chars, recorded in audit)</label>
          <textarea value={eraseReason} onChange={(e) => setEraseReason(e.target.value)} rows={3} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Customer requested erasure under data-protection policy." />
        </div>
      </Modal>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.displayName} size="lg"
          footer={<>
            <Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button>
            {canWrite && <Button variant="secondary" onClick={() => { openEdit(selected) }}>Edit</Button>}
            {canWrite && ((selected as unknown as { status?: string }).status !== 'ARCHIVED'
              ? <Button variant="secondary" onClick={() => setArchiveTarget(selected)}>Archive</Button>
              : <Button variant="secondary" onClick={() => setArchiveTarget(selected)}>Reactivate</Button>)}
            {canErase && ((selected as unknown as { status?: string }).status === 'ARCHIVED') && (
              <Button onClick={() => { setEraseReason(''); setEraseTarget(selected) }}>Erase contact data</Button>
            )}
            <Button onClick={() => { setSelected(null); navigate(`/vehicles?customerId=${selected.id}`) }}>View vehicles</Button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Customer ID', value: selected.id },
              { label: 'Status', value: ((selected as unknown as { status?: string }).status ?? '—') },
              { label: 'Type', value: ((selected as unknown as { type?: string }).type ?? '—') },
              { label: 'Phone', value: ((selected as unknown as { phone?: string }).phone ?? '—') },
              { label: 'Email', value: ((selected as unknown as { email?: string }).email ?? '—') },
              { label: 'Created', value: ((selected as unknown as { createdAt?: string }).createdAt ?? '—') },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <div className="mt-0.5 text-sm font-medium text-slate-800 break-all">{item.value}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
