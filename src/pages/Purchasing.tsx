import { useCallback, useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { vendorsV3, purchaseOrdersV3, purchasePolicyV3, newIdempotencyKey, type Vendor, type PurchaseOrder } from '../api/v4/purchasing'
import { inventoryV3 } from '../api/v3/inventory'
import { PERMS, formatMoney, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

type Tab = 'orders' | 'vendors' | 'policy'
const PAGE_SIZE = 20

export default function Purchasing() {
  const { hasPermission } = useAuth()
  const canVendorsRead = hasPermission(PERMS.vendorsRead)
  const canPurchasingRead = hasPermission(PERMS.purchasingRead)
  const canPolicyView = hasPermission(PERMS.purchasingRead) || hasPermission(PERMS.configRead)

  const [tab, setTab] = useState<Tab>('orders')

  return (
    <div className="space-y-6">
      <PageHeader title="Purchasing" subtitle="Vendors, purchase orders, receipts (FINAL v4)" />
      <div className="flex border-b border-slate-200">
        {(
          [
            { key: 'orders', label: 'Purchase orders', visible: canPurchasingRead || hasPermission(PERMS.purchasingCreate) },
            { key: 'vendors', label: 'Vendors', visible: canVendorsRead },
            { key: 'policy', label: 'Approval policy', visible: canPolicyView },
          ] as { key: Tab; label: string; visible: boolean }[]
        )
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
      </div>
      {tab === 'orders' && <OrdersTab />}
      {tab === 'vendors' && <VendorsTab />}
      {tab === 'policy' && <PolicyTab />}
    </div>
  )
}

// ── Vendors ──────────────────────────────────────────────────────────────

function VendorsTab() {
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(PERMS.vendorsWrite)
  const [items, setItems] = useState<Vendor[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ code: '', name: '', contactName: '', phone: '', email: '', status: 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

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
      const res = await vendorsV3.list({ page, pageSize: PAGE_SIZE, query: debouncedQ || undefined, status: status || undefined })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, debouncedQ, status])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ code: '', name: '', contactName: '', phone: '', email: '', status: 'ACTIVE' })
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (v: Vendor) => {
    const r = v as unknown as Record<string, string | null | undefined>
    setEditing(v)
    setForm({
      code: r.code ?? '',
      name: r.name ?? '',
      contactName: r.contactName ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
      status: r.status ?? 'ACTIVE',
    })
    setSaveError(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (saving) return
    if (!editing && !form.code.trim()) {
      setSaveError(new ApiError({ message: 'Vendor code is required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    if (!form.name.trim()) {
      setSaveError(new ApiError({ message: 'Vendor name is required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        await vendorsV3.update(editing.id, {
          name: form.name.trim(),
          ...(form.contactName ? { contactName: form.contactName } : {}),
          ...(form.phone ? { phone: form.phone } : {}),
          ...(form.email ? { email: form.email } : {}),
          status: form.status as 'ACTIVE' | 'INACTIVE',
        })
        showToast('success', 'Vendor updated', form.name.trim())
      } else {
        await vendorsV3.create({
          code: form.code.trim(),
          name: form.name.trim(),
          ...(form.contactName ? { contactName: form.contactName } : {}),
          ...(form.phone ? { phone: form.phone } : {}),
          ...(form.email ? { email: form.email } : {}),
        })
        showToast('success', 'Vendor created', form.code.trim())
      }
      setModalOpen(false)
      load()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_RESOURCE') {
        setSaveError(new ApiError({ message: 'This vendor code is already used.', code: err.code, status: err.status, requestId: err.requestId }))
      } else {
        setSaveError(err)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={q} onChange={setQ} placeholder="Search vendors…" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {canWrite && <Button size="sm" onClick={openCreate}>Add vendor</Button>}
        <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} vendors</span>
      </div>
      {state === 'loading' && <div className="p-4"><LoadingState /></div>}
      {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title="No vendors" /></div>}
      {state === 'success' && items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-50">
                <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Code</th>
                <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Name</th>
                <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Contact</th>
                <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Status</th>
                {canWrite && <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Actions</th>}
              </tr></thead>
              <tbody>
                {items.map((v) => {
                  const r = v as unknown as Record<string, string | null | undefined>
                  return (
                    <tr key={v.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{r.code ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{r.name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{[r.contactName, r.phone, r.email].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={badgeVariantFor(r.status ?? 'ACTIVE')} /></td>
                      {canWrite && <td className="px-4 py-3"><button onClick={() => openEdit(v)} className="text-xs text-blue-600">Edit</button></td>}
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
      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? 'Edit vendor' : 'Add vendor'} size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          {!editing && <Input label="Code (unique)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />}
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {editing && (
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
          )}
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>
    </div>
  )
}

// ── Purchase orders ──────────────────────────────────────────────────────

interface POLineForm { partId: string; sku: string; quantityOrdered: string; unitCost: string }

function OrdersTab() {
  const { showToast } = useToast()
  const { me, hasPermission } = useAuth()
  const canCreate = hasPermission(PERMS.purchasingCreate)
  const canApprove = hasPermission(PERMS.purchasingApprove)
  const canReceive = hasPermission(PERMS.purchasingReceive)

  const [items, setItems] = useState<PurchaseOrder[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [detail, setDetail] = useState<PurchaseOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [approvals, setApprovals] = useState<never[]>([])
  const [receipts, setReceipts] = useState<never[]>([])
  const [busy, setBusy] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<PurchaseOrder | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [stores, setStores] = useState<{ id: string; name?: string; code?: string }[]>([])
  const [parts, setParts] = useState<{ id: string; sku?: string }[]>([])
  const [form, setForm] = useState({ vendorId: '', storeId: '', expectedDeliveryDate: '', notes: '' })
  const [lines, setLines] = useState<POLineForm[]>([{ partId: '', sku: '', quantityOrdered: '1', unitCost: '' }])
  const [saveError, setSaveError] = useState<unknown>(null)

  const [decideOpen, setDecideOpen] = useState(false)
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [decideReason, setDecideReason] = useState('')

  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptLines, setReceiptLines] = useState<{ lineId: string; sku: string; received: string; accepted: string; rejected: string; reason: string }[]>([])
  const [deliveryRef, setDeliveryRef] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null)
  const [closeTarget, setCloseTarget] = useState<{ lineId: string; sku: string } | null>(null)
  const [closeReason, setCloseReason] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await purchaseOrdersV3.list({
        page, pageSize: PAGE_SIZE,
        status: status || undefined,
        poNumber: poNumber.trim() || undefined,
      })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, status, poNumber])

  useEffect(() => {
    load()
  }, [load])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const [po, ap, rc] = await Promise.all([
        purchaseOrdersV3.get(id),
        purchaseOrdersV3.approvals(id, { page: 1, pageSize: 50 }).catch(() => ({ items: [] })),
        purchaseOrdersV3.receipts(id, { page: 1, pageSize: 50 }).catch(() => ({ items: [] })),
      ])
      setDetail(po)
      setApprovals(((ap as { items: never[] }).items ?? []) as never[])
      setReceipts(((rc as { items: never[] }).items ?? []) as never[])
    } catch (err) {
      showToast('error', 'Failed to load order', backendErrorMessage(err))
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [showToast])

  const loadPickers = useCallback(async () => {
    try {
      const [v, s, p] = await Promise.all([
        vendorsV3.list({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        inventoryV3.stores({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        inventoryV3.parts({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      ])
      setVendors((v as { items: Vendor[] }).items ?? [])
      setStores(((s as { items: never[] }).items ?? []) as never[])
      setParts(((p as { items: never[] }).items ?? []) as never[])
    } catch {
      /* pickers optional */
    }
  }, [])

  useEffect(() => {
    loadPickers()
  }, [loadPickers])

  const statusOf = (po: PurchaseOrder) => (po as unknown as { status?: string }).status ?? ''
  const isCreator = (po: PurchaseOrder) => !!me?.id && (po as unknown as { createdBy?: string }).createdBy === me.id
  const isDraft = (po: PurchaseOrder) => statusOf(po) === 'DRAFT'

  const openCreate = () => {
    setEditing(null)
    setForm({ vendorId: '', storeId: '', expectedDeliveryDate: '', notes: '' })
    setLines([{ partId: '', sku: '', quantityOrdered: '1', unitCost: '' }])
    setSaveError(null)
    setCreateOpen(true)
  }

  const openEdit = (po: PurchaseOrder) => {
    const r = po as unknown as { vendorId?: string; storeId?: string; expectedDeliveryDate?: string | null; notes?: string | null; lines?: { partId?: string; sku?: string; quantityOrdered?: number; unitCost?: { amount?: string } }[] }
    setEditing(po)
    setForm({
      vendorId: r.vendorId ?? '',
      storeId: r.storeId ?? '',
      expectedDeliveryDate: r.expectedDeliveryDate ?? '',
      notes: r.notes ?? '',
    })
    setLines(
      (r.lines ?? []).map((l) => ({
        partId: l.partId ?? '',
        sku: l.sku ?? '',
        quantityOrdered: String(l.quantityOrdered ?? 1),
        unitCost: l.unitCost?.amount ?? '',
      })),
    )
    setSaveError(null)
    setCreateOpen(true)
  }

  const validateLines = (): boolean => {
    if (lines.length === 0) {
      setSaveError(new ApiError({ message: 'Add at least one line.', code: 'BAD_REQUEST', status: 400 }))
      return false
    }
    for (const l of lines) {
      const qty = Number(l.quantityOrdered)
      if (!l.partId || !Number.isInteger(qty) || qty < 1 || qty > 100000 || !l.unitCost || Number.isNaN(Number(l.unitCost))) {
        setSaveError(new ApiError({ message: 'Each line needs a part, quantity 1–100000 and a unit cost.', code: 'BAD_REQUEST', status: 400 }))
        return false
      }
    }
    if (!form.vendorId || !form.storeId) {
      setSaveError(new ApiError({ message: 'Vendor and receiving store are required.', code: 'BAD_REQUEST', status: 400 }))
      return false
    }
    return true
  }

  const save = async () => {
    if (busy || !validateLines()) return
    setBusy(true)
    setSaveError(null)
    try {
      const payload = {
        vendorId: form.vendorId,
        storeId: form.storeId,
        lines: lines.map((l) => ({
          partId: l.partId,
          quantityOrdered: Number(l.quantityOrdered),
          unitCost: { amount: Number(l.unitCost).toFixed(4), currency: 'EGP' },
        })),
        ...(form.expectedDeliveryDate ? { expectedDeliveryDate: form.expectedDeliveryDate } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      }
      if (editing) {
        const updated = await purchaseOrdersV3.update(editing.id, {
          version: (editing as unknown as { version?: number }).version,
          ...payload,
        } as never)
        showToast('success', 'Draft updated', (updated as unknown as { poNumber?: string }).poNumber ?? '')
      } else {
        const created = await purchaseOrdersV3.create(payload as never)
        showToast('success', 'Draft created', (created as unknown as { poNumber?: string }).poNumber ?? '')
      }
      setCreateOpen(false)
      load()
      if (detail) loadDetail(detail.id)
    } catch (err) {
      setSaveError(err)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (po: PurchaseOrder) => {
    setBusy(true)
    try {
      const updated = await purchaseOrdersV3.submit(po.id)
      setDetail(updated)
      showToast('success', 'Submitted for approval', 'Managers notified.')
      load()
    } catch (err) {
      showToast('error', 'Submit failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const decide = async () => {
    if (!detail) return
    if (decision === 'REJECTED' && decideReason.trim().length < 3) {
      showToast('error', 'Reason required', 'Rejection needs a reason (3+ characters).')
      return
    }
    setBusy(true)
    try {
      await purchaseOrdersV3.decide(detail.id, {
        decision,
        ...(decideReason.trim() ? { reason: decideReason.trim() } : {}),
      })
      showToast('success', `Order ${decision}`, '')
      setDecideOpen(false)
      setDecideReason('')
      loadDetail(detail.id)
      load()
    } catch (err) {
      showToast('error', 'Decision failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const openReceipt = () => {
    if (!detail) return
    const poLines = ((detail as unknown as { lines?: { id?: string; sku?: string }[] }).lines ?? [])
    setReceiptLines(
      poLines.map((l) => ({ lineId: l.id ?? '', sku: l.sku ?? '', received: '', accepted: '', rejected: '0', reason: '' })),
    )
    setDeliveryRef('')
    setReceiptOpen(true)
  }

  const receive = async () => {
    if (!detail || busy) return
    for (const l of receiptLines) {
      const rec = Number(l.received)
      const acc = Number(l.accepted)
      const rej = Number(l.rejected || '0')
      if ([rec, acc, rej].some((n) => Number.isNaN(n) || n < 0) || rec !== acc + rej) {
        showToast('error', 'Invalid quantities', `Line ${l.sku}: quantityReceived must equal accepted + rejected.`)
        return
      }
      if (rej > 0 && l.reason.trim().length === 0) {
        showToast('error', 'Rejection reason required', `Line ${l.sku}: explain the rejection.`)
        return
      }
    }
    setBusy(true)
    try {
      await purchaseOrdersV3.receive(
        detail.id,
        {
          ...(deliveryRef ? { deliveryReference: deliveryRef } : {}),
          lines: receiptLines
            .filter((l) => Number(l.received) > 0)
            .map((l) => ({
              purchaseOrderLineId: l.lineId,
              quantityReceived: Number(l.received),
              quantityAccepted: Number(l.accepted),
              quantityRejected: Number(l.rejected || '0'),
              ...(Number(l.rejected || '0') > 0 ? { rejectionReason: l.reason.trim() } : {}),
            })),
        } as never,
        newIdempotencyKey(),
      )
      showToast('success', 'Goods received', 'Accepted quantities entered stock.')
      setReceiptOpen(false)
      loadDetail(detail.id)
      load()
    } catch (err) {
      showToast('error', 'Receipt failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await purchaseOrdersV3.remove(deleteTarget.id)
      showToast('success', 'Draft discarded', '')
      setDeleteTarget(null)
      if (detail?.id === deleteTarget.id) setDetail(null)
      load()
    } catch (err) {
      showToast('error', 'Delete failed', backendErrorMessage(err))
    }
  }

  const closeRemainder = async () => {
    if (!detail || !closeTarget || closeReason.trim().length < 3) {
      showToast('error', 'Reason required', 'Closing the remainder needs a reason (3+ characters).')
      return
    }
    try {
      const updated = await purchaseOrdersV3.closeRemainder(detail.id, closeTarget.lineId, closeReason.trim())
      setDetail(updated)
      showToast('success', 'Remainder closed', '')
      setCloseTarget(null)
      setCloseReason('')
      loadDetail(detail.id)
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <input value={poNumber} onChange={(e) => { setPoNumber(e.target.value); setPage(1) }} placeholder="PO number…" className="h-9 px-3 border border-slate-200 rounded-lg text-sm w-44" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
            <option value="">All statuses</option>
            {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {canCreate && <Button size="sm" onClick={openCreate}>New draft</Button>}
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} orders</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title="No purchase orders" /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">PO</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Total</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Approvals</th>
                </tr></thead>
                <tbody>
                  {items.map((po) => {
                    const r = po as unknown as { poNumber?: string; status?: string; approvalsRecorded?: number; requiredApprovals?: number | null }
                    return (
                      <tr key={po.id} onClick={() => loadDetail(po.id)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">{r.poNumber}</td>
                        <td className="px-4 py-3"><Badge variant={badgeVariantFor(r.status ?? '')} /></td>
                        <td className="px-4 py-3 text-end">{formatMoney((po as unknown as { total?: never }).total as never)}</td>
                        <td className="px-4 py-3 text-xs">{r.requiredApprovals == null ? '—' : `${r.approvalsRecorded}/${r.requiredApprovals}`}</td>
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

      {detail && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {detailLoading ? <LoadingState /> : <PODetail
            po={detail}
            approvals={approvals}
            receipts={receipts}
            isCreator={isCreator(detail)}
            canCreate={canCreate}
            canApprove={canApprove}
            canReceive={canReceive}
            busy={busy}
            onEdit={() => openEdit(detail)}
            onSubmit={() => submit(detail)}
            onDelete={() => setDeleteTarget(detail)}
            onDecide={() => { setDecision('APPROVED'); setDecideReason(''); setDecideOpen(true) }}
            onReceive={openReceipt}
            onCloseLine={(lineId, sku) => { setCloseTarget({ lineId, sku }); setCloseReason('') }}
            onClose={() => setDetail(null)}
          />}
        </div>
      )}

      <Modal open={createOpen} onClose={() => !busy && setCreateOpen(false)} title={editing ? 'Edit draft' : 'New purchase order draft'} size="lg"
        footer={<><Button variant="secondary" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save draft'}</Button></>}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Vendor" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
              options={[{ value: '', label: 'Select vendor' }, ...vendors.map((v) => ({ value: v.id, label: `${(v as unknown as { code?: string }).code ?? ''} — ${(v as unknown as { name?: string }).name ?? ''}` }))]} required />
            <Select label="Receiving store" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}
              options={[{ value: '', label: 'Select store' }, ...stores.map((s) => ({ value: s.id, label: s.name ?? s.code ?? s.id }))]} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Expected delivery (YYYY-MM-DD)" value={form.expectedDeliveryDate} onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })} placeholder="2026-10-01" />
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Lines</p>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <select value={l.partId} onChange={(e) => {
                  const p = parts.find((x) => x.id === e.target.value)
                  setLines((prev) => prev.map((x, j) => (j === i ? { ...x, partId: e.target.value, sku: p?.sku ?? '' } : x)))
                }} className="col-span-6 h-9 px-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select part</option>
                  {parts.map((p) => <option key={p.id} value={p.id}>{p.sku ?? p.id.slice(0, 8)}</option>)}
                </select>
                <input type="number" value={l.quantityOrdered} onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, quantityOrdered: e.target.value } : x)))} placeholder="Qty" className="col-span-2 h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                <input type="number" step="0.0001" value={l.unitCost} onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)))} placeholder="Unit cost" className="col-span-3 h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                <button onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} className="col-span-1 text-red-500 text-sm">×</button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { partId: '', sku: '', quantityOrdered: '1', unitCost: '' }])}>+ Line</Button>
          </div>
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      <Modal open={decideOpen} onClose={() => setDecideOpen(false)} title="Approve / reject purchase order" size="md"
        footer={<><Button variant="secondary" onClick={() => setDecideOpen(false)}>Cancel</Button><Button disabled={busy} onClick={decide}>{busy ? 'Submitting…' : 'Submit decision'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Decision" value={decision} onChange={(e) => setDecision(e.target.value as 'APPROVED' | 'REJECTED')}
            options={[{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }]} />
          <Textarea label="Reason (required for rejection)" value={decideReason} onChange={(e) => setDecideReason(e.target.value)} rows={3} />
        </div>
      </Modal>

      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Record goods receipt (idempotent)" size="lg"
        footer={<><Button variant="secondary" onClick={() => setReceiptOpen(false)}>Cancel</Button><Button disabled={busy} onClick={receive}>{busy ? 'Saving…' : 'Save receipt'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Delivery reference" value={deliveryRef} onChange={(e) => setDeliveryRef(e.target.value)} />
          {receiptLines.map((l, i) => (
            <div key={l.lineId} className="border border-slate-100 rounded-lg p-3">
              <p className="text-sm font-mono mb-2">{l.sku}</p>
              <div className="grid grid-cols-3 gap-2">
                <Input label="Received" type="number" value={l.received} onChange={(e) => setReceiptLines((prev) => prev.map((x, j) => (j === i ? { ...x, received: e.target.value } : x)))} />
                <Input label="Accepted" type="number" value={l.accepted} onChange={(e) => setReceiptLines((prev) => prev.map((x, j) => (j === i ? { ...x, accepted: e.target.value } : x)))} />
                <Input label="Rejected" type="number" value={l.rejected} onChange={(e) => setReceiptLines((prev) => prev.map((x, j) => (j === i ? { ...x, rejected: e.target.value } : x)))} />
              </div>
              <Input label="Rejection reason (required if rejected > 0)" value={l.reason} onChange={(e) => setReceiptLines((prev) => prev.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))} />
            </div>
          ))}
          <p className="text-xs text-slate-400">Only accepted quantities enter stock. received must equal accepted + rejected per line.</p>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Discard draft"
        message={`Delete draft ${(deleteTarget as unknown as { poNumber?: string })?.poNumber}? This cannot be undone. Only drafts can be deleted.`}
        confirmLabel="Delete draft" destructive onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      <Modal open={!!closeTarget} onClose={() => setCloseTarget(null)} title={`Close remainder — ${closeTarget?.sku}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setCloseTarget(null)}>Cancel</Button><Button onClick={closeRemainder}>Close remainder</Button></>}>
        <Textarea label="Reason (required)" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} rows={3} required />
      </Modal>
    </div>
  )
}

function PODetail({ po, approvals, receipts, isCreator, canCreate, canApprove, canReceive, busy, onEdit, onSubmit, onDelete, onDecide, onReceive, onCloseLine, onClose }: {
  po: PurchaseOrder
  approvals: never[]
  receipts: never[]
  isCreator: boolean
  canCreate: boolean
  canReceive: boolean
  canApprove: boolean
  busy: boolean
  onEdit: () => void
  onSubmit: () => void
  onDelete: () => void
  onDecide: () => void
  onReceive: () => void
  onCloseLine: (lineId: string, sku: string) => void
  onClose: () => void
}) {
  const r = po as unknown as {
    poNumber?: string; status?: string; version?: number; notes?: string | null;
    expectedDeliveryDate?: string | null; approvalsRecorded?: number; requiredApprovals?: number | null;
    lines?: { id?: string; sku?: string; quantityOrdered?: number; quantityAccepted?: number; quantityRejected?: number; remainderClosedAt?: string; lineTotal?: never }[];
  }
  const draft = r.status === 'DRAFT'
  const pending = r.status === 'PENDING_APPROVAL'
  const receivable = r.status === 'APPROVED' || r.status === 'PARTIALLY_RECEIVED'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono font-semibold" dir="ltr">{r.poNumber}</p>
          <p className="mt-1"><Badge variant={badgeVariantFor(r.status ?? '')} /></p>
          {r.requiredApprovals != null && <p className="text-xs text-slate-500 mt-1">Approvals {r.approvalsRecorded}/{r.requiredApprovals}</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {canCreate && isCreator && draft && <Button variant="secondary" size="sm" onClick={onEdit}>Edit draft</Button>}
        {canCreate && isCreator && draft && <Button size="sm" disabled={busy} onClick={onSubmit}>Submit for approval</Button>}
        {canCreate && isCreator && draft && <Button variant="secondary" size="sm" onClick={onDelete}>Discard draft</Button>}
        {canApprove && pending && !isCreator && <Button size="sm" onClick={onDecide}>Approve / reject</Button>}
        {canReceive && receivable && <Button size="sm" onClick={onReceive}>Record receipt</Button>}
      </div>
      {pending && isCreator && <p className="text-xs text-amber-700">You created this order — you cannot approve it (separation of duties).</p>}
      {r.status === 'REJECTED' && <p className="text-xs text-red-600">Rejected — closed. Create a new draft to reorder.</p>}

      <div>
        <p className="text-sm font-semibold mb-2">Lines</p>
        {(r.lines ?? []).map((l) => (
          <div key={l.id} className="border border-slate-100 rounded-lg p-3 mb-2 text-sm">
            <p className="font-mono text-xs">{l.sku} · ordered {l.quantityOrdered} · accepted {l.quantityAccepted} · rejected {l.quantityRejected}</p>
            <p className="text-xs text-slate-500">Total {formatMoney(l.lineTotal as never)}{l.remainderClosedAt ? ` · remainder closed ${l.remainderClosedAt}` : ''}</p>
            {canReceive && receivable && !l.remainderClosedAt && (l.quantityAccepted ?? 0) < (l.quantityOrdered ?? 0) && (
              <Button variant="secondary" size="sm" onClick={() => l.id && onCloseLine(l.id, l.sku ?? '')} className="mt-2">Close remainder</Button>
            )}
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Approvals ({approvals.length})</p>
        {approvals.length === 0 ? <p className="text-xs text-slate-400">None yet.</p> : (approvals as unknown as { id: string; decision?: string; reason?: string }[]).map((a) => (
          <p key={a.id} className="text-xs border border-slate-100 rounded-lg p-2 mb-1 font-mono">{a.decision} · {a.reason ?? ''}</p>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Goods receipts ({receipts.length})</p>
        {receipts.length === 0 ? <p className="text-xs text-slate-400">None yet.</p> : (receipts as unknown as { id: string }[]).map((g) => (
          <p key={g.id} className="text-xs font-mono border border-slate-100 rounded-lg p-2 mb-1">{g.id}</p>
        ))}
      </div>
    </div>
  )
}

// ── Approval policy ──────────────────────────────────────────────────────

function PolicyTab() {
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PERMS.purchasingPolicyManage)
  const [policy, setPolicy] = useState<{ version?: number; tiers?: { minimumTotal?: string; requiredApprovals?: number }[] } | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState(false)
  const [tiers, setTiers] = useState<{ minimumTotal: string; requiredApprovals: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await purchasePolicyV3.get()
      setPolicy(res as unknown as { version?: number; tiers?: { minimumTotal?: string; requiredApprovals?: number }[] })
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
    setTiers((policy?.tiers ?? []).map((t) => ({ minimumTotal: t.minimumTotal ?? '', requiredApprovals: String(t.requiredApprovals ?? 1) })))
    setSaveError(null)
    setEditing(true)
  }

  const save = async () => {
    if (!policy || saving) return
    for (const t of tiers) {
      if (!/^\d+(\.\d{1,4})?$/.test(t.minimumTotal.trim()) || (t.requiredApprovals !== '1' && t.requiredApprovals !== '2')) {
        setSaveError(new ApiError({ message: 'Each tier needs minimumTotal (number, ≤4 decimals) and requiredApprovals 1 or 2.', code: 'BAD_REQUEST', status: 400 }))
        return
      }
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await purchasePolicyV3.update({
        version: policy.version,
        tiers: tiers.map((t) => ({ minimumTotal: t.minimumTotal.trim(), requiredApprovals: Number(t.requiredApprovals) })),
      } as never)
      setPolicy(updated as unknown as { version?: number; tiers?: { minimumTotal?: string; requiredApprovals?: number }[] })
      setEditing(false)
      showToast('success', 'Policy updated', 'Already submitted POs keep their original thresholds.')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        setSaveError(new ApiError({ message: 'Policy changed by someone else — reloaded. Review and retry.', code: err.code, status: err.status, requestId: err.requestId }))
        load()
      } else {
        setSaveError(err)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl">
      <h3 className="text-base font-semibold">Purchase approval policy</h3>
      <p className="text-xs text-slate-500 mt-1">Changing the policy does not alter already submitted POs.</p>
      {state === 'loading' && <div className="mt-4"><LoadingState /></div>}
      {state === 'error' && <div className="mt-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && policy && !editing && (
        <div className="mt-4 flex flex-col gap-2">
          {(policy.tiers ?? []).map((t, i) => (
            <p key={i} className="text-sm border border-slate-100 rounded-lg p-2">
              Orders ≥ <span className="font-mono">{t.minimumTotal}</span> need <b>{t.requiredApprovals}</b> approval(s)
            </p>
          ))}
          {(policy.tiers ?? []).length === 0 && <p className="text-xs text-slate-400">No tiers configured.</p>}
          {canManage && <div><Button size="sm" onClick={startEdit}>Edit policy</Button></div>}
        </div>
      )}
      {editing && (
        <div className="mt-4 flex flex-col gap-2">
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input value={t.minimumTotal} onChange={(e) => setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, minimumTotal: e.target.value } : x)))} placeholder="minimumTotal" className="col-span-7 h-9 px-2 border rounded-lg text-sm" />
              <select value={t.requiredApprovals} onChange={(e) => setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, requiredApprovals: e.target.value } : x)))} className="col-span-4 h-9 px-2 border rounded-lg text-sm">
                <option value="1">1 approval</option>
                <option value="2">2 approvals</option>
              </select>
              <button onClick={() => setTiers((prev) => prev.filter((_, j) => j !== i))} className="col-span-1 text-red-500">×</button>
            </div>
          ))}
          <div><Button variant="secondary" size="sm" onClick={() => setTiers((prev) => [...prev, { minimumTotal: '', requiredApprovals: '1' }])}>+ Tier</Button></div>
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
