// Customers — contract-bound list/create/update.
// Contract: GET /customers (filters: q, phone, status; sort: displayName,createdAt),
// POST /customers, PATCH /customers/{id}. ARCHIVED with open jobs -> 409.
// Offline: falls back to demo rows so the UI never goes blank.
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { LoadingRows, ApiErrorBanner, EmptyState, DemoBadge } from '../components/ui/ApiState'
import { useLang } from '../i18n/LanguageContext'
import { customersApi } from '../api/resources'
import { useApiList } from '../api/hooks'
import { ApiError } from '../api/http'
import { useAuth } from '../context/AuthContext'
import type { Customer } from '../api/types'

// Demo fallback (used only when the backend is unreachable).
const fallbackCustomers: Customer[] = [
  { id: 'C-001', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', organizationScopeId: 'demo-scope', displayName: 'Mohammed Al-Rashid', type: 'INDIVIDUAL', phone: '+966501234567', email: 'mohammed@email.com', status: 'ACTIVE' },
  { id: 'C-002', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', organizationScopeId: 'demo-scope', displayName: 'Sarah Al-Anazi', type: 'INDIVIDUAL', phone: '+966559876543', email: 'sarah@email.com', status: 'ACTIVE' },
  { id: 'C-003', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', organizationScopeId: 'demo-scope', displayName: 'Rayan Omar', type: 'INDIVIDUAL', phone: '+966544567890', email: 'rayan@email.com', status: 'ACTIVE' },
  { id: 'C-004', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', organizationScopeId: 'demo-scope', displayName: 'Noura Al-Saud', type: 'INDIVIDUAL', phone: '+966503210987', email: 'noura@email.com', status: 'ACTIVE' },
  { id: 'C-005', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', organizationScopeId: 'demo-scope', displayName: 'Omar Al-Harthi', type: 'BUSINESS', phone: '+966566543210', email: 'omar@email.com', status: 'ARCHIVED' },
  { id: 'C-006', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '', organizationScopeId: 'demo-scope', displayName: 'Fatima Hassan', type: 'INDIVIDUAL', phone: '+966537890123', email: 'fatima@email.com', status: 'ACTIVE' },
]

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('')
}

export default function Customers() {
  const navigate = useNavigate()
  const { t } = useLang()
  const { scopeId } = useAuth()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'ARCHIVED'>('')
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Debounce search -> contract `q` param (server-side filtering).
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350)
    return () => clearTimeout(id)
  }, [search])

  const query = useMemo(
    () => ({ q: debounced || undefined, status: status || undefined, sort: 'displayName', pageSize: 20 }),
    [debounced, status],
  )

  const { items, total, loading, error, isFallback, reload, page, setPage } = useApiList<Customer>(
    (q) => customersApi.list(q),
    { fallbackItems: fallbackCustomers, query },
  )

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const displayName = `${String(fd.get('firstName') ?? '').trim()} ${String(fd.get('lastName') ?? '').trim()}`.trim()
    // Contract phone: E.164 ^\+[1-9][0-9]{6,14}$ — strip spaces/dashes.
    const phone = String(fd.get('phone') ?? '').replace(/[\s-]/g, '')
    const email = String(fd.get('email') ?? '').trim() || undefined
    setCreating(true)
    setCreateError('')
    try {
      await customersApi.create({
        // Organization scope comes from the authenticated user (/auth/me);
        // the zero UUID below only applies before any login (demo mode).
        organizationScopeId: scopeId,
        displayName,
        type: 'INDIVIDUAL',
        phone,
        email,
      })
      setAddOpen(false)
      reload()
    } catch (err) {
      setCreateError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers.title')}
        subtitle={`${total} ${t('customers.subtitle')}`}
        actions={
          <div className="flex items-center gap-2">
            <DemoBadge visible={isFallback} />
            <Button
              onClick={() => setAddOpen(true)}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              {t('customers.addBtn')}
            </Button>
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center md:gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder={t('customers.search')} />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | 'ACTIVE' | 'ARCHIVED')}
              className="flex-1 md:flex-none h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              aria-label="Status filter"
            >
              <option value="">{t('customers.filter.allStatus')}</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 md:ms-auto">{items.length} {t('customers.results')}</span>
        </div>

        {error && <ApiErrorBanner error={error} onRetry={reload} fallback={isFallback} />}

        {loading ? (
          <LoadingRows rows={6} />
        ) : items.length === 0 ? (
          <EmptyState title="No customers found" hint="Adjust search or status filter." />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-50">
              {items.map((c) => (
                <div key={c.id} className="px-4 py-3 active:bg-slate-50 cursor-pointer" onClick={() => setSelected(c)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                      {initials(c.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900 truncate">{c.displayName}</p>
                        <Badge variant={c.status === 'ACTIVE' ? 'active' : 'inactive'} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400" dir="ltr">{c.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.customer')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.phone')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.status')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('customers.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(c)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                            {initials(c.displayName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{c.displayName}</p>
                            <p className="text-xs text-slate-400" dir="ltr">{c.email ?? c.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600" dir="ltr">{c.phone}</td>
                      <td className="px-6 py-4">
                        <Badge variant={c.status === 'ACTIVE' ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setSelected(c)} className="text-xs text-slate-500 hover:text-blue-600 transition-colors">{t('customers.action.edit')}</button>
                          <span className="text-slate-200">|</span>
                          <button onClick={() => navigate('/job-cards')} className="text-xs text-slate-500 hover:text-blue-600 transition-colors">
                            {t('customers.action.jobs')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">
                {t('customers.showing')} {page ? (page.page - 1) * page.pageSize + 1 : 1}–{page ? Math.min(page.page * page.pageSize, page.totalItems) : items.length} {t('customers.of')} {total}
              </p>
              {page && page.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={page.page <= 1}
                    onClick={() => setPage(page.page - 1)}
                    className="h-8 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="text-sm text-slate-500 px-2">{page.page} / {page.totalPages}</span>
                  <button
                    disabled={page.page >= page.totalPages}
                    onClick={() => setPage(page.page + 1)}
                    className="h-8 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('customers.modal.addTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button>
            <Button loading={creating} onClick={() => (document.getElementById('customer-create-form') as HTMLFormElement | null)?.requestSubmit()}>
              {t('customers.modal.saveBtn')}
            </Button>
          </>
        }
      >
        <form id="customer-create-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          {createError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{createError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="firstName" label={t('customers.form.firstName')} placeholder="Mohammed" required />
            <Input name="lastName" label={t('customers.form.lastName')} placeholder="Al-Rashid" required />
          </div>
          <Input name="phone" label={t('customers.form.phone')} type="tel" placeholder="+966500000000" required />
          <Input name="email" label={t('customers.form.email')} type="email" placeholder="customer@email.com" />
          <Textarea label={t('customers.form.notes')} placeholder={t('customers.form.notesPlaceholder')} rows={3} />
        </form>
      </Modal>

      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.displayName}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button>
              <Button onClick={() => { setSelected(null); navigate('/vehicles') }}>{t('customers.detail.viewVehicles')}</Button>
              <Button onClick={() => { setSelected(null); navigate('/job-cards') }}>{t('customers.detail.newJobCard')}</Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('customers.detail.contactInfo')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('customers.detail.customerId'), value: <span dir="ltr">{selected.id}</span> },
                  { label: t('customers.detail.status'), value: <Badge variant={selected.status === 'ACTIVE' ? 'active' : 'inactive'} /> },
                  { label: t('customers.detail.phone'), value: <span dir="ltr">{selected.phone}</span> },
                  { label: t('customers.detail.email'), value: selected.email ?? '—' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <div className="mt-0.5 text-sm font-medium text-slate-800">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
