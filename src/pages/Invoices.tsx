import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { invoicesV3, newIdempotencyKey, type Invoice } from '../api/v4/management'
import { customersV3 } from '../api/v3/customers'
import { jobsV3 } from '../api/v3/jobs'
import { vehiclesV3 } from '../api/v3/vehicles'
import { PERMS, formatMoney, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const PAGE_SIZE = 20

function moneyOf(v: unknown): { amount: string; currency: string } | null {
  if (v && typeof v === 'object' && 'amount' in (v as Record<string, unknown>)) {
    const m = v as { amount?: unknown; currency?: unknown }
    if (typeof m.amount === 'string') return { amount: m.amount, currency: typeof m.currency === 'string' ? m.currency : '' }
  }
  return null
}

function renderValue(v: unknown): string {
  const m = moneyOf(v)
  if (m) return formatMoney(m as never)
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default function Invoices() {
  const { id } = useParams<{ id?: string }>()
  const location = useLocation()
  const isPrint = location.pathname.endsWith('/print')

  if (isPrint && id) return <InvoicePrint invoiceId={id} />
  if (id) return <InvoiceDetail invoiceId={id} />
  return <InvoiceList />
}

// ── List ─────────────────────────────────────────────────────────────────

function InvoiceList() {
  const [items, setItems] = useState<Invoice[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await invoicesV3.list({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        invoiceNumber: debouncedQ || undefined,
      })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, status, debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle={`${meta.totalItems} invoices`} />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <SearchBar value={q} onChange={setQ} placeholder="Search invoice number…" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} total</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title="No invoices" hint="Drafts appear here once a job reaches READY (quality PASSED creates one)." /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Invoice</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Job</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Total</th>
                </tr></thead>
                <tbody>
                  {items.map((inv) => {
                    const r = inv as unknown as { invoiceNumber?: string; jobNumber?: string; status?: string; totals?: { total?: unknown } }
                    return (
                      <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">{r.invoiceNumber ?? `${inv.id.slice(0, 8)}… (draft)`}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.jobNumber}</td>
                        <td className="px-4 py-3"><Badge variant={badgeVariantFor(r.status ?? '')} /></td>
                        <td className="px-4 py-3 text-end">{renderValue(r.totals?.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
    </div>
  )
}

// ── Detail ───────────────────────────────────────────────────────────────

function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PERMS.invoicesManage)
  const canPay = hasPermission(PERMS.paymentsRecord)

  const [inv, setInv] = useState<Invoice | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountForm, setDiscountForm] = useState({ type: 'PERCENT', value: '', reason: '' })
  const [notes, setNotes] = useState('')
  const [discountError, setDiscountError] = useState<unknown>(null)

  const [subletOpen, setSubletOpen] = useState(false)
  const [subletForm, setSubletForm] = useState({ description: '', cost: '', vendorId: '' })

  const [issueConfirm, setIssueConfirm] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({ method: 'CASH', reference: '' })

  const [removeSubletId, setRemoveSubletId] = useState<string | null>(null)
  const [removeSubletReason, setRemoveSubletReason] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await invoicesV3.get(invoiceId)
      setInv(res)
      setNotes((res as unknown as { notes?: string }).notes ?? '')
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [invoiceId])

  useEffect(() => {
    load()
  }, [load])

  // Sublets are invoice LINES with lineType SUBLET; the DELETE target is sourceId.
  const sublets = (
    (inv as unknown as { lines?: { lineType?: string; sourceId?: string; description?: string; lineTotal?: unknown }[] })?.lines ?? []
  ).filter((l) => l.lineType === 'SUBLET')

  const statusOf = () => (inv as unknown as { status?: string })?.status ?? ''
  const locked = statusOf() !== 'DRAFT'

  const saveDiscount = async (remove = false) => {
    if (!inv || busy) return
    if (!remove) {
      if (!discountForm.value || !discountForm.reason.trim() || discountForm.reason.trim().length < 3) {
        setDiscountError(new ApiError({ message: 'Discount needs a value and a reason (3+ characters).', code: 'BAD_REQUEST', status: 400 }))
        return
      }
      if (discountForm.type === 'PERCENT' && (Number(discountForm.value) < 0 || Number(discountForm.value) > 100)) {
        setDiscountError(new ApiError({ message: 'PERCENT discount must be 0–100.', code: 'BAD_REQUEST', status: 400 }))
        return
      }
    }
    setBusy(true)
    setDiscountError(null)
    try {
      const updated = await invoicesV3.update(inv.id, {
        version: (inv as unknown as { version?: number }).version,
        discount: remove
          ? null
          : { type: discountForm.type, value: discountForm.value.trim(), reason: discountForm.reason.trim() },
        notes: notes || undefined,
      } as never)
      setInv(updated)
      setDiscountOpen(false)
      showToast('success', remove ? 'Discount removed' : 'Discount saved', '')
    } catch (err) {
      setDiscountError(err)
    } finally {
      setBusy(false)
    }
  }

  const saveNotes = async () => {
    if (!inv || busy) return
    setBusy(true)
    try {
      const updated = await invoicesV3.update(inv.id, {
        version: (inv as unknown as { version?: number }).version,
        notes: notes || undefined,
      } as never)
      setInv(updated)
      showToast('success', 'Notes saved', '')
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
      load()
    } finally {
      setBusy(false)
    }
  }

  const addSublet = async () => {
    if (!inv || busy) return
    if (!subletForm.description.trim() || !subletForm.cost) {
      showToast('error', 'Description and cost required', '')
      return
    }
    setBusy(true)
    try {
      const updated = await invoicesV3.addSublet(inv.id, {
        description: subletForm.description.trim(),
        cost: { amount: Number(subletForm.cost).toFixed(4), currency: (inv as unknown as { currencyCode?: string }).currencyCode ?? 'EGP' },
        ...(subletForm.vendorId ? { vendorId: subletForm.vendorId } : {}),
      })
      setInv(updated)
      setSubletOpen(false)
      setSubletForm({ description: '', cost: '', vendorId: '' })
      showToast('success', 'Sublet cost added', '')
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const removeSublet = async (subletId: string, reason: string) => {
    if (!inv) return
    try {
      const updated = await invoicesV3.removeSublet(inv.id, subletId, reason)
      setInv(updated)
      showToast('success', 'Sublet removed', '')
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const issue = async () => {
    if (!inv) return
    setBusy(true)
    try {
      const updated = await invoicesV3.issue(inv.id)
      setInv(updated)
      setIssueConfirm(false)
      showToast('success', 'Invoice issued', 'It is now locked. Deliver is available on the READY job.')
    } catch (err) {
      showToast('error', 'Issue failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const voidInvoice = async () => {
    if (!inv || voidReason.trim().length < 3) {
      showToast('error', 'Reason required', 'Voiding needs a reason (3+ characters).')
      return
    }
    setBusy(true)
    try {
      const updated = await invoicesV3.void(inv.id, voidReason.trim())
      setInv(updated)
      setVoidOpen(false)
      setVoidReason('')
      showToast('success', 'Invoice voided', '')
    } catch (err) {
      showToast('error', 'Void failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    if (!inv || busy) return
    const total = (inv as unknown as { totals?: { total?: { amount?: string; currency?: string } } }).totals?.total
    if (!total?.amount) {
      showToast('error', 'No total', 'Invoice has no server total to pay.')
      return
    }
    if (!payForm.reference.trim()) {
      showToast('error', 'Reference required', 'Payment reference is required.')
      return
    }
    setBusy(true)
    try {
      const updated = await invoicesV3.pay(
        inv.id,
        {
          method: payForm.method,
          reference: payForm.reference.trim(),
          amount: { amount: total.amount, currency: total.currency ?? 'EGP' },
          paidAt: new Date().toISOString(),
        } as never,
        newIdempotencyKey(),
      )
      setInv(updated)
      setPayOpen(false)
      showToast('success', 'Payment recorded', 'Invoice is PAID.')
    } catch (err) {
      showToast('error', 'Payment failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async () => {
    if (!inv) return
    const jobId = (inv as unknown as { jobId?: string }).jobId
    if (!jobId) return
    try {
      const draft = await invoicesV3.regenerate(jobId)
      navigate(`/invoices/${draft.id}`)
      showToast('success', 'New draft generated', '')
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  if (state === 'loading') return <div className="space-y-6"><PageHeader title="Invoice" /><LoadingState /></div>
  if (state === 'error' || !inv) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" />
        <ErrorState error={error} onRetry={load} title="Failed to load invoice" />
        <Button variant="secondary" size="sm" onClick={() => navigate('/invoices')}>Back to list</Button>
      </div>
    )
  }

  const r = inv as unknown as {
    invoiceNumber?: string; jobId?: string; jobNumber?: string; status?: string;
    currencyCode?: string; lines?: { description?: string; quantity?: number; unitPrice?: unknown; lineTotal?: unknown }[];
    discount?: { type?: string; value?: string; reason?: string } | null;
    totals?: Record<string, unknown>; payments?: { reference?: string; paidAt?: string }[];
    issuedAt?: string; paidAt?: string; voidReason?: string;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={r.invoiceNumber ? `Invoice ${r.invoiceNumber}` : 'Draft invoice'}
        subtitle={`Job ${r.jobNumber ?? ''} · ${r.status}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/invoices')}>Back</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/invoices/${inv.id}/print`)}>Print</Button>
            {canManage && !locked && <Button size="sm" onClick={() => setIssueConfirm(true)}>Issue</Button>}
          </>
        }
      />

      {statusOf() === 'DRAFT' && (
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">DRAFT — not a final invoice</p>
      )}
      {statusOf() === 'VOID' && (
        <div className="bg-slate-100 border rounded-lg px-3 py-2">
          <p className="text-sm font-bold">VOID{ r.voidReason ? ` — ${r.voidReason}` : ''}</p>
          {canManage && <Button variant="secondary" size="sm" onClick={regenerate} className="mt-2">Generate new draft</Button>}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-start text-xs text-slate-500">Description</th>
              <th className="px-4 py-2 text-end text-xs text-slate-500">Qty</th>
              <th className="px-4 py-2 text-end text-xs text-slate-500">Unit price</th>
              <th className="px-4 py-2 text-end text-xs text-slate-500">Line total</th>
            </tr>
          </thead>
          <tbody>
            {(r.lines ?? []).map((l, i) => (
              <tr key={i} className="border-t border-slate-50">
                <td className="px-4 py-2">{l.description ?? '—'}</td>
                <td className="px-4 py-2 text-end">{l.quantity ?? '—'}</td>
                <td className="px-4 py-2 text-end">{renderValue(l.unitPrice)}</td>
                <td className="px-4 py-2 text-end font-medium">{renderValue(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-200 px-4 py-3 flex flex-col gap-1 items-end">
          {Object.entries(r.totals ?? {}).map(([k, v]) => (
            <p key={k} className={`text-sm ${k === 'total' ? 'font-bold text-base' : 'text-slate-600'}`}>
              {k}: {renderValue(v)}
            </p>
          ))}
        </div>
      </div>

      {r.discount != null && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
          <p className="font-semibold">Discount</p>
          <p className="text-slate-600">{r.discount.type} {r.discount.value} — {r.discount.reason}</p>
        </div>
      )}

      {(r.payments ?? []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
          <p className="font-semibold">Payments</p>
          {r.payments!.map((p, i) => (
            <p key={i} className="text-slate-600 font-mono text-xs">{p.reference} · {p.paidAt}</p>
          ))}
        </div>
      )}

      {canManage && !locked && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Draft controls</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => { setDiscountError(null); setDiscountOpen(true) }}>Discount</Button>
            <Button variant="secondary" size="sm" onClick={() => setSubletOpen(true)}>Add sublet</Button>
            <Button variant="secondary" size="sm" onClick={saveNotes} disabled={busy}>Save notes</Button>
          </div>
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          {sublets.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {sublets.map((s) => (
                <div key={s.sourceId ?? s.description} className="flex items-center gap-2 text-sm border border-slate-100 rounded-lg p-2">
                  <span className="flex-1">{s.description} · {renderValue(s.lineTotal)}</span>
                  <Button variant="secondary" size="sm" onClick={() => { setRemoveSubletId(s.sourceId ?? null); setRemoveSubletReason('') }}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canManage && statusOf() === 'ISSUED' && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setVoidReason(''); setVoidOpen(true) }}>Void invoice</Button>
        </div>
      )}

      {canPay && (statusOf() === 'ISSUED') && (
        <div>
          <Button size="sm" onClick={() => setPayOpen(true)}>Record payment</Button>
        </div>
      )}

      <Modal open={discountOpen} onClose={() => setDiscountOpen(false)} title="Edit discount" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscountOpen(false)}>Cancel</Button>
            <Button variant="secondary" disabled={busy} onClick={() => saveDiscount(true)}>Remove discount</Button>
            <Button disabled={busy} onClick={() => saveDiscount(false)}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }>
        <div className="flex flex-col gap-3">
          <Select label="Type" value={discountForm.type} onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
            options={[{ value: 'PERCENT', label: 'Percent (0–100)' }, { value: 'AMOUNT', label: 'Amount (≤ subtotal)' }]} />
          <Input label="Value (string)" value={discountForm.value} onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })} required />
          <Input label="Reason (required, 3+ chars)" value={discountForm.reason} onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })} required />
          {discountError ? <FieldErrors error={discountError} /> : null}
        </div>
      </Modal>

      <Modal open={subletOpen} onClose={() => setSubletOpen(false)} title="Add sublet cost (DRAFT only)" size="md"
        footer={<><Button variant="secondary" onClick={() => setSubletOpen(false)}>Cancel</Button><Button disabled={busy} onClick={addSublet}>{busy ? 'Adding…' : 'Add'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Description" value={subletForm.description} onChange={(e) => setSubletForm({ ...subletForm, description: e.target.value })} required />
          <Input label={`Cost (${r.currencyCode ?? 'EGP'})`} type="number" step="0.0001" value={subletForm.cost} onChange={(e) => setSubletForm({ ...subletForm, cost: e.target.value })} required />
          <Input label="Vendor ID (optional)" value={subletForm.vendorId} onChange={(e) => setSubletForm({ ...subletForm, vendorId: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={issueConfirm} title="Issue invoice"
        message="Issue this invoice? It cannot be changed afterwards."
        confirmLabel="Issue" onConfirm={issue} onCancel={() => setIssueConfirm(false)} />

      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title="Void issued invoice" size="sm"
        footer={<><Button variant="secondary" onClick={() => setVoidOpen(false)}>Cancel</Button><Button disabled={busy} onClick={voidInvoice}>{busy ? 'Voiding…' : 'Void'}</Button></>}>
        <Textarea label="Reason (required)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} required />
        <p className="text-xs text-slate-400 mt-1">Paid invoices cannot be voided.</p>
      </Modal>

      <Modal open={removeSubletId !== null} onClose={() => setRemoveSubletId(null)} title="Remove sublet cost" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveSubletId(null)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (!removeSubletId || removeSubletReason.trim().length < 3) {
                  showToast('error', 'Reason required', 'Minimum 3 characters.')
                  return
                }
                removeSublet(removeSubletId, removeSubletReason.trim())
                setRemoveSubletId(null)
                setRemoveSubletReason('')
              }}
            >
              {busy ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }>
        <Textarea label="Reason (required)" value={removeSubletReason} onChange={(e) => setRemoveSubletReason(e.target.value)} rows={3} required />
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record payment (idempotent)" size="md"
        footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button><Button disabled={busy} onClick={pay}>{busy ? 'Recording…' : 'Record payment'}</Button></>}>
        <div className="flex flex-col gap-3">
          <p className="text-sm bg-slate-50 rounded-lg p-3">Amount (from server total, exact): <b className="font-mono">{renderValue((r.totals as Record<string, unknown> | undefined)?.total)}</b></p>
          <Select label="Method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
            options={['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'].map((m) => ({ value: m, label: m }))} />
          <Input label="Reference (required)" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} required />
        </div>
      </Modal>
    </div>
  )
}

// ── Print ────────────────────────────────────────────────────────────────

function InvoicePrint({ invoiceId }: { invoiceId: string }) {
  const navigate = useNavigate()
  const [inv, setInv] = useState<Invoice | null>(null)
  const [customer, setCustomer] = useState<{ displayName?: string; phone?: string; email?: string } | null>(null)
  const [job, setJob] = useState<{ jobNumber?: string; vehiclePlate?: string; vehicleId?: string } | null>(null)
  const [plate, setPlate] = useState('')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const invoice = await invoicesV3.get(invoiceId)
        if (cancelled) return
        setInv(invoice)
        const rec = invoice as unknown as { customerId?: string; jobId?: string }
        const [c, j] = await Promise.all([
          rec.customerId ? customersV3.get(rec.customerId).catch(() => null) : Promise.resolve(null),
          rec.jobId ? jobsV3.get(rec.jobId).catch(() => null) : Promise.resolve(null),
        ])
        if (cancelled) return
        setCustomer((c as unknown as { displayName?: string; phone?: string; email?: string }) ?? null)
        setJob((j as unknown as { jobNumber?: string; vehiclePlate?: string; vehicleId?: string }) ?? null)
        const vehicleId = (j as unknown as { vehicleId?: string })?.vehicleId
        if (vehicleId) {
          const v = await vehiclesV3.get(vehicleId).catch(() => null)
          if (!cancelled && v) setPlate((v as unknown as { plate?: string }).plate ?? '')
        }
      } catch (err) {
        if (!cancelled) setError(err)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [invoiceId])

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState error={error} onRetry={() => navigate(0)} title="Failed to load invoice" />
      </div>
    )
  }
  if (!inv) return <LoadingState label="Loading invoice…" />

  const r = inv as unknown as {
    invoiceNumber?: string; status?: string; currencyCode?: string;
    lines?: { description?: string; quantity?: number; unitPrice?: unknown; lineTotal?: unknown }[];
    discount?: { type?: string; value?: string; reason?: string } | null;
    totals?: Record<string, unknown>; payments?: { reference?: string; paidAt?: string }[];
    issuedAt?: string; notes?: string;
  }
  const status = r.status ?? ''

  return (
    <div className="print-area">
      <style>{`
        @media print {
          aside, header, nav, button, .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          body { background: #fff !important; }
          .print-area { max-width: 100% !important; box-shadow: none !important; border: none !important; }
        }
        @page { size: A4; margin: 16mm; }
      `}</style>
      <div className="no-print flex gap-2 mb-4">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/invoices/${invoiceId}`)}>Back</Button>
        <Button size="sm" onClick={() => window.print()}>Print / save PDF</Button>
      </div>
      <div className="print-area relative bg-white border border-slate-200 rounded-xl p-8 max-w-3xl mx-auto">
        {(status === 'DRAFT' || status === 'VOID') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-6xl font-black text-slate-200 rotate-[-20deg]">
              {status === 'DRAFT' ? 'DRAFT — not a final invoice' : 'VOID'}
            </span>
          </div>
        )}
        <div className="flex justify-between border-b pb-4">
          <div>
            <p className="text-xl font-bold">WST Workshop</p>
            <p className="text-xs text-slate-500">Invoice {r.invoiceNumber ?? '(draft — number assigned on issue)'}</p>
          </div>
          <div className="text-end text-xs text-slate-600">
            <p>Status: <b>{status}</b></p>
            {r.issuedAt && <p>Issued: {r.issuedAt}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 py-4 text-sm border-b">
          <div>
            <p className="text-xs text-slate-400">Customer</p>
            <p className="font-medium">{customer?.displayName ?? '—'}</p>
            <p className="text-xs text-slate-500">{customer?.phone ?? ''} {customer?.email ?? ''}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-slate-400">Job / Vehicle</p>
            <p className="font-medium font-mono">{job?.jobNumber ?? '—'}</p>
            <p className="text-xs font-mono">Plate: {plate || job?.vehiclePlate || '—'}</p>
          </div>
        </div>
        <table className="w-full text-sm my-4">
          <thead>
            <tr className="border-b text-start">
              <th className="py-2 text-start">Description</th>
              <th className="py-2 text-end">Qty</th>
              <th className="py-2 text-end">Unit price</th>
              <th className="py-2 text-end">Line total</th>
            </tr>
          </thead>
          <tbody>
            {(r.lines ?? []).map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{l.description ?? '—'}</td>
                <td className="py-2 text-end">{l.quantity ?? '—'}</td>
                <td className="py-2 text-end">{renderValue(l.unitPrice)}</td>
                <td className="py-2 text-end">{renderValue(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col items-end gap-1 text-sm border-b pb-4">
          {Object.entries(r.totals ?? {}).map(([k, v]) => (
            <p key={k} className={k === 'total' ? 'font-bold text-base' : ''}>{k}: {renderValue(v)}</p>
          ))}
        </div>
        <div className="py-4 text-sm">
          <p><b>Payment status:</b> {status}</p>
          {(r.payments ?? []).map((p, i) => (
            <p key={i} className="font-mono text-xs">{p.reference} · {p.paidAt}</p>
          ))}
          {r.notes && <p className="text-xs text-slate-500 mt-2">Notes: {r.notes}</p>}
        </div>
      </div>
    </div>
  )
}
