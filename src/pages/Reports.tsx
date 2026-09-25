import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { exportsV3, type ExportJob } from '../api/v6/insights'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const EXPORT_TYPES = [
  'JOBS', 'LABOR_ENTRIES', 'PART_ISSUES', 'STOCK_BALANCES', 'STOCK_MOVEMENTS',
  'PURCHASE_ORDERS', 'INVOICES', 'CUSTOMER_STATEMENT', 'ATTENDANCE', 'ASSESSMENTS',
  'CERTIFICATES', 'REORDER_SUGGESTIONS', 'TRAINING_RISK', 'DASHBOARD_WORKSHOP',
  'DASHBOARD_INVENTORY_FINANCE', 'DASHBOARD_TRAINING', 'DASHBOARD_AI_DATA', 'AUDIT_EVENTS',
]

/**
 * Exports — create a job, poll until COMPLETED/FAILED/EXPIRED, then download
 * via a short-lived authorized blob URL. Totals shown come from the server.
 */
export default function Reports() {
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission(PERMS.exportsCreate)

  const [items, setItems] = useState<ExportJob[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ exportType: 'JOBS', format: 'CSV', from: '', to: '', customerId: '', locale: lang as 'en' | 'ar' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const pollers = useRef<Record<string, number>>({})

  const load = useCallback(async () => {
    // Clear previous pollers first — the job set may have changed page.
    Object.values(pollers.current).forEach((t) => window.clearInterval(t))
    pollers.current = {}
    setState('loading')
    setError(null)
    try {
      const res = await exportsV3.list({ page, pageSize: 20, status: status || undefined })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
      // Poll unfinished jobs while the list is visible.
      for (const job of res.items) {
        const st = (job as unknown as { status?: string }).status
        if ((st === 'PENDING' || st === 'PROCESSING') && !pollers.current[job.id]) {
          pollers.current[job.id] = window.setInterval(async () => {
            try {
              const fresh = await exportsV3.get(job.id)
              const fst = (fresh as unknown as { status?: string }).status
              setItems((prev) => prev.map((j) => (j.id === job.id ? fresh : j)))
              if (fst !== 'PENDING' && fst !== 'PROCESSING') {
                window.clearInterval(pollers.current[job.id])
                delete pollers.current[job.id]
              }
            } catch {
              window.clearInterval(pollers.current[job.id])
              delete pollers.current[job.id]
            }
          }, 5000)
        }
      }
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, status])

  useEffect(() => {
    load()
    const timers = pollers.current
    return () => {
      Object.values(timers).forEach((t) => window.clearInterval(t))
    }
  }, [load])

  const create = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const job = await exportsV3.create({
        exportType: form.exportType,
        format: form.format,
        ...(form.from || form.to ? { filters: { ...(form.from ? { from: form.from } : {}), ...(form.to ? { to: form.to } : {}) } } : {}),
        ...(form.customerId ? { customerId: form.customerId } : {}),
        locale: form.locale as 'en' | 'ar',
      } as never)
      showToast('success', 'Export started', 'Polling until it completes.')
      setCreateOpen(false)
      load()
      void job
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const download = async (job: ExportJob) => {
    const st = (job as unknown as { status?: string; exportType?: string; format?: string }).status
    if (st === 'EXPIRED') {
      showToast('error', 'Export expired', 'Create a new export.')
      return
    }
    if (st !== 'COMPLETED') {
      showToast('info', 'Export not ready', `Status: ${st}. It will download automatically once completed.`)
      return
    }
    setDownloadingId(job.id)
    try {
      const objectUrl = await exportsV3.blobUrl(job.id)
      const a = document.createElement('a')
      a.href = objectUrl
      const r = job as unknown as { exportType?: string; format?: string }
      a.download = `export-${r.exportType ?? 'data'}.${(r.format ?? 'csv').toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
      showToast('success', 'Download started', a.download)
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Download failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={canCreate ? <Button onClick={() => { setSaveError(null); setCreateOpen(true) }}>New export</Button> : undefined}
      />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">All statuses</option>
            {['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} exports</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title="No exports" hint="Create one to download CSV/PDF data." /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="divide-y divide-slate-50">
              {items.map((job) => {
                const r = job as unknown as {
                  exportType?: string; format?: string; status?: string; rowCount?: number;
                  failureMessage?: string; expiresAt?: string; totals?: { label?: string; value?: string }[];
                  filterFingerprint?: string;
                }
                return (
                  <div key={job.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm flex-1" dir="ltr">{r.exportType}.{r.format}</p>
                      <Badge variant={badgeVariantFor(r.status ?? '')} />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={downloadingId === job.id || r.status !== 'COMPLETED'}
                        onClick={() => download(job)}
                      >
                        {downloadingId === job.id ? 'Downloading…' : 'Download'}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {r.rowCount != null ? `${r.rowCount} rows · ` : ''}fingerprint <span className="font-mono">{r.filterFingerprint}</span>
                      {r.expiresAt ? ` · expires ${r.expiresAt}` : ''}
                    </p>
                    {r.status === 'FAILED' && r.failureMessage && (
                      <p className="text-xs text-red-600 mt-1">{r.failureMessage}</p>
                    )}
                    {(r.totals ?? []).length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {(r.totals ?? []).map((x) => `${x.label}: ${x.value}`).join(' · ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 border rounded-lg disabled:opacity-40">‹</button>
                <span className="text-sm px-2">{page} / {meta.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 px-2 border rounded-lg disabled:opacity-40">›</button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="New export" size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={saving} onClick={create}>{saving ? 'Starting…' : 'Start export'}</Button></>}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.exportType} onChange={(e) => setForm({ ...form, exportType: e.target.value })}
              options={EXPORT_TYPES.map((x) => ({ value: x, label: x }))} />
            <Select label="Format" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}
              options={[{ value: 'CSV', label: 'CSV' }, { value: 'PDF', label: 'PDF' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From (date, optional)" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
            <Input label="To (date, optional)" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </div>
          <Input label="Customer ID (only for CUSTOMER_STATEMENT)" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
          <Select label="Locale" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value as 'en' | 'ar' })}
            options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }]} />
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>
    </div>
  )
}
