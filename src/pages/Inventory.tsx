import { useCallback, useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { inventoryV3, type Part, type StockBalance, type StockMovement, type StockCount, type StockAdjustment, type Store } from '../api/v3/inventory'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'
import { PERMS, formatMoney, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'

type Tab = 'parts' | 'stock' | 'movements' | 'counts' | 'adjustments'

export default function Inventory() {
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canReadParts = hasPermission(PERMS.partsRead)
  const canWriteParts = hasPermission(PERMS.partsWrite)
  const canReadStock = hasPermission(PERMS.inventoryRead) || hasPermission(PERMS.inventoryStockRead)
  const canCount = hasPermission(PERMS.inventoryCount)
  const canAdjust = hasPermission(PERMS.inventoryAdjust)
  const canApprove = hasPermission(PERMS.inventoryAdjustApprove)
  const canSeeCost = hasPermission(PERMS.inventoryCostRead)

  const [tab, setTab] = useState<Tab>('parts')

  // Parts
  const [parts, setParts] = useState<Part[]>([])
  const [partsMeta, setPartsMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [partsPage, setPartsPage] = useState(1)
  const [partsQ, setPartsQ] = useState('')
  const [partsStatus, setPartsStatus] = useState('')
  const [partsState, setPartsState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [partsError, setPartsError] = useState<unknown>(null)
  const [partModal, setPartModal] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [partForm, setPartForm] = useState({ sku: '', nameEn: '', nameAr: '', barcode: '', category: '', unitOfMeasure: 'EA', sellingPrice: '', compatibilityMake: '' })
  const [partSaving, setPartSaving] = useState(false)
  const [partError, setPartError] = useState<unknown>(null)

  // Stock balances
  const [balances, setBalances] = useState<StockBalance[]>([])
  const [balMeta, setBalMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [balPage, setBalPage] = useState(1)
  const [balQ, setBalQ] = useState('')
  const [belowMin, setBelowMin] = useState(false)
  const [balState, setBalState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [balError, setBalError] = useState<unknown>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [storeFilter, setStoreFilter] = useState('')
  const [levelsTarget, setLevelsTarget] = useState<StockBalance | null>(null)
  const [levelsForm, setLevelsForm] = useState({ minLevel: '', maxLevel: '' })

  // Movements
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movMeta, setMovMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [movPage, setMovPage] = useState(1)
  const [movState, setMovState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [movError, setMovError] = useState<unknown>(null)
  const [recon, setRecon] = useState<unknown>(null)

  // Counts
  const [counts, setCounts] = useState<StockCount[]>([])
  const [countsMeta, setCountsMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [countsPage, setCountsPage] = useState(1)
  const [countsState, setCountsState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [countsError, setCountsError] = useState<unknown>(null)
  const [countModal, setCountModal] = useState(false)
  const [countForm, setCountForm] = useState({ storeId: '', partId: '', countedQuantity: '', note: '' })
  const [countSaving, setCountSaving] = useState(false)

  // Adjustments
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [adjMeta, setAdjMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [adjPage, setAdjPage] = useState(1)
  const [adjStatus, setAdjStatus] = useState('')
  const [adjState, setAdjState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [adjError, setAdjError] = useState<unknown>(null)
  const [adjModal, setAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState({ storeId: '', partId: '', stockCountId: '', reasonCode: 'DAMAGE', note: '' })
  const [adjSaving, setAdjSaving] = useState(false)
  const [decideTarget, setDecideTarget] = useState<StockAdjustment | null>(null)
  const [decideForm, setDecideForm] = useState({ decision: 'APPROVED' as 'APPROVED' | 'REJECTED', reason: '' })

  const loadParts = useCallback(async () => {
    setPartsState('loading')
    try {
      const res = await inventoryV3.parts({ page: partsPage, pageSize: 20, q: partsQ || undefined, status: partsStatus || undefined })
      setParts(res.items)
      setPartsMeta(res.page)
      setPartsState('success')
    } catch (err) { setPartsError(err); setPartsState('error') }
  }, [partsPage, partsQ, partsStatus])

  const loadBalances = useCallback(async () => {
    setBalState('loading')
    try {
      const [b, s] = await Promise.all([
        inventoryV3.balances({ page: balPage, pageSize: 20, q: balQ || undefined, storeId: storeFilter || undefined, belowMinimum: belowMin || undefined }),
        stores.length === 0 ? inventoryV3.stores({ page: 1, pageSize: 100 }) : Promise.resolve(null),
      ])
      setBalances(b.items)
      setBalMeta(b.page)
      if (s) setStores(s.items)
      setBalState('success')
    } catch (err) { setBalError(err); setBalState('error') }
  }, [balPage, balQ, storeFilter, belowMin, stores.length])

  const loadMovements = useCallback(async () => {
    setMovState('loading')
    try {
      const [m, r] = await Promise.all([
        inventoryV3.movements({ page: movPage, pageSize: 20 }),
        movPage === 1 ? inventoryV3.reconciliation(storeFilter || undefined).catch(() => null) : Promise.resolve(null),
      ])
      setMovements(m.items)
      setMovMeta(m.page)
      if (r) setRecon(r)
      setMovState('success')
    } catch (err) { setMovError(err); setMovState('error') }
  }, [movPage, storeFilter])

  const loadCounts = useCallback(async () => {
    setCountsState('loading')
    try {
      const res = await inventoryV3.counts({ page: countsPage, pageSize: 20 })
      setCounts(res.items)
      setCountsMeta(res.page)
      setCountsState('success')
    } catch (err) { setCountsError(err); setCountsState('error') }
  }, [countsPage])

  const loadAdjustments = useCallback(async () => {
    setAdjState('loading')
    try {
      const res = await inventoryV3.adjustments({ page: adjPage, pageSize: 20, status: adjStatus || undefined })
      setAdjustments(res.items)
      setAdjMeta(res.page)
      setAdjState('success')
    } catch (err) { setAdjError(err); setAdjState('error') }
  }, [adjPage, adjStatus])

  useEffect(() => { if (tab === 'parts') loadParts() }, [tab, loadParts])
  useEffect(() => { if (tab === 'stock') loadBalances() }, [tab, loadBalances])
  useEffect(() => { if (tab === 'movements') loadMovements() }, [tab, loadMovements])
  useEffect(() => { if (tab === 'counts') loadCounts() }, [tab, loadCounts])
  useEffect(() => { if (tab === 'adjustments') loadAdjustments() }, [tab, loadAdjustments])

  const savePart = async () => {
    if (partSaving) return
    if (!partForm.sku.trim() || !partForm.nameEn.trim() || !partForm.category) {
      setPartError(new ApiError({ message: 'SKU, English name and category are required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setPartSaving(true)
    setPartError(null)
    try {
      if (editingPart) {
        const rec = editingPart as unknown as { version?: number }
        await inventoryV3.updatePart(editingPart.id, {
          version: rec.version,
          barcode: partForm.barcode || undefined,
          name: { en: partForm.nameEn.trim(), ...(partForm.nameAr ? { ar: partForm.nameAr } : {}) },
          category: partForm.category,
          sellingPrice: partForm.sellingPrice ? { amount: Number(partForm.sellingPrice).toFixed(4), currency: 'EGP' } : undefined,
        } as never)
        showToast('success', 'Part updated', partForm.sku)
      } else {
        await inventoryV3.createPart({
          sku: partForm.sku.trim().toUpperCase(),
          barcode: partForm.barcode || undefined,
          name: { en: partForm.nameEn.trim(), ...(partForm.nameAr ? { ar: partForm.nameAr } : {}) },
          category: partForm.category,
          unitOfMeasure: partForm.unitOfMeasure,
          sellingPrice: partForm.sellingPrice ? { amount: Number(partForm.sellingPrice).toFixed(4), currency: 'EGP' } : undefined,
          compatibility: partForm.compatibilityMake ? [{ make: partForm.compatibilityMake }] : undefined,
        } as never)
        showToast('success', 'Part created', partForm.sku.trim().toUpperCase())
      }
      setPartModal(false)
      setEditingPart(null)
      loadParts()
    } catch (err) {
      setPartError(err)
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') showToast('error', 'Version conflict', 'Reload and retry.')
    } finally {
      setPartSaving(false)
    }
  }

  const saveLevels = async () => {
    if (!levelsTarget) return
    try {
      await inventoryV3.replaceLevels(
        (levelsTarget as unknown as { storeId: string }).storeId,
        (levelsTarget as unknown as { partId: string }).partId,
        { minLevel: Number(levelsForm.minLevel), maxLevel: Number(levelsForm.maxLevel) },
      )
      showToast('success', 'Levels updated', '')
      setLevelsTarget(null)
      loadBalances()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const saveCount = async () => {
    if (countSaving) return
    setCountSaving(true)
    try {
      await inventoryV3.createCount({
        storeId: countForm.storeId,
        partId: countForm.partId,
        countedQuantity: Number(countForm.countedQuantity),
        ...(countForm.note ? { note: countForm.note } : {}),
      })
      showToast('success', 'Count recorded', '')
      setCountModal(false)
      setCountForm({ storeId: '', partId: '', countedQuantity: '', note: '' })
      loadCounts()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setCountSaving(false)
    }
  }

  const saveAdjustment = async () => {
    if (adjSaving) return
    setAdjSaving(true)
    try {
      await inventoryV3.createAdjustment({
        storeId: adjForm.storeId,
        partId: adjForm.partId,
        stockCountId: adjForm.stockCountId,
        reasonCode: adjForm.reasonCode,
        ...(adjForm.note ? { note: adjForm.note } : {}),
      } as never)
      showToast('success', 'Adjustment submitted', 'PENDING_APPROVAL — managers notified.')
      setAdjModal(false)
      loadAdjustments()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setAdjSaving(false)
    }
  }

  const decide = async () => {
    if (!decideTarget) return
    if (decideForm.decision === 'REJECTED' && decideForm.reason.trim().length < 3) {
      showToast('error', 'Reason required', 'Rejection needs a reason (3–500 chars).')
      return
    }
    try {
      await inventoryV3.decideAdjustment(decideTarget.id, {
        decision: decideForm.decision,
        ...(decideForm.reason ? { reason: decideForm.reason } : {}),
      })
      showToast('success', `Adjustment ${decideForm.decision}`, '')
      setDecideTarget(null)
      loadAdjustments()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'parts', label: 'Parts catalog' },
    { key: 'stock', label: 'Stock balances' },
    { key: 'movements', label: 'Movements' },
    { key: 'counts', label: 'Stock counts' },
    { key: 'adjustments', label: 'Adjustments' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Parts, stock, counts and adjustments (FINAL v3)" />
      <div className="flex border-b border-slate-200">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tab === tb.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'parts' && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
            <SearchBar value={partsQ} onChange={(v) => { setPartsQ(v); setPartsPage(1) }} placeholder="Search SKU / name…" />
            <select value={partsStatus} onChange={(e) => { setPartsStatus(e.target.value); setPartsPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
              <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option>
            </select>
            {canWriteParts && <Button size="sm" onClick={() => { setEditingPart(null); setPartForm({ sku: '', nameEn: '', nameAr: '', barcode: '', category: '', unitOfMeasure: 'EA', sellingPrice: '', compatibilityMake: '' }); setPartError(null); setPartModal(true) }}>Add part</Button>}
            <span className="text-xs text-slate-400 ms-auto">{partsMeta.totalItems} parts</span>
          </div>
          {partsState === 'loading' && <div className="p-4"><LoadingState /></div>}
          {partsState === 'error' && <div className="p-4"><ErrorState error={partsError} onRetry={loadParts} /></div>}
          {partsState === 'success' && parts.length === 0 && <div className="p-4"><EmptyState title="No parts" /></div>}
          {partsState === 'success' && parts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Name</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Category</th>
                  {canSeeCost && <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Price</th>}
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Status</th>
                  {canWriteParts && <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Actions</th>}
                </tr></thead>
                <tbody>
                  {parts.map((p) => {
                    const r = p as unknown as { sku?: string; status?: string }
                    const name = (p as unknown as { name?: { en?: string } }).name
                    return (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">{r.sku}</td>
                        <td className="px-4 py-3">{name?.en ?? (p as unknown as { nameEn?: string }).nameEn ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{(p as unknown as { category?: string }).category ?? '—'}</td>
                        {canSeeCost && <td className="px-4 py-3 text-end">{formatMoney((p as unknown as { sellingPrice?: never }).sellingPrice as never)}</td>}
                        <td className="px-4 py-3"><Badge variant={badgeVariantFor(String(r.status ?? 'ACTIVE'))} /></td>
                        {canWriteParts && <td className="px-4 py-3"><button onClick={() => {
                          setEditingPart(p)
                          setPartForm({ sku: r.sku ?? '', nameEn: name?.en ?? '', nameAr: '', barcode: (p as unknown as { barcode?: string }).barcode ?? '', category: (p as unknown as { category?: string }).category ?? '', unitOfMeasure: 'EA', sellingPrice: '', compatibilityMake: '' })
                          setPartError(null); setPartModal(true)
                        }} className="text-xs text-blue-600">Edit</button></td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
            <SearchBar value={balQ} onChange={(v) => { setBalQ(v); setBalPage(1) }} placeholder="Search parts…" />
            <select value={storeFilter} onChange={(e) => { setStoreFilter(e.target.value); setBalPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
              <option value="">All stores</option>{stores.map((s) => <option key={s.id} value={s.id}>{(s as unknown as { name?: string; code?: string }).name ?? (s as unknown as { code?: string }).code}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={belowMin} onChange={(e) => { setBelowMin(e.target.checked); setBalPage(1) }} /> Below minimum</label>
            <span className="text-xs text-slate-400 ms-auto">{balMeta.totalItems} balances</span>
          </div>
          {balState === 'loading' && <div className="p-4"><LoadingState /></div>}
          {balState === 'error' && <div className="p-4"><ErrorState error={balError} onRetry={loadBalances} /></div>}
          {balState === 'success' && balances.length === 0 && <div className="p-4"><EmptyState title="No stock balances" /></div>}
          {balState === 'success' && balances.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">On hand</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Reserved</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Available</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Min/Max</th>
                  {canSeeCost && <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Avg cost</th>}
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Alert</th>
                </tr></thead>
                <tbody>
                  {balances.map((b, i) => {
                    const r = b as unknown as { sku?: string; onHand?: number; reserved?: number; available?: number; minLevel?: number; maxLevel?: number; belowMinimum?: boolean; storeId?: string; partId?: string }
                    return (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">{r.sku}</td>
                        <td className="px-4 py-3 text-end font-semibold">{r.onHand}</td>
                        <td className="px-4 py-3 text-end">{r.reserved}</td>
                        <td className="px-4 py-3 text-end">{r.available}</td>
                        <td className="px-4 py-3 text-end text-xs">{r.minLevel}/{r.maxLevel} {canWriteParts && <button onClick={() => { setLevelsTarget(b); setLevelsForm({ minLevel: String(r.minLevel ?? ''), maxLevel: String(r.maxLevel ?? '') }) }} className="text-blue-600 ms-2">Edit</button>}</td>
                        {canSeeCost && <td className="px-4 py-3 text-end">{formatMoney((b as unknown as { averageCost?: never }).averageCost as never)}</td>}
                        <td className="px-4 py-3">{r.belowMinimum ? <Badge variant="low-stock" /> : <span className="text-xs text-slate-400">OK</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'movements' && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <p className="text-sm font-semibold">Stock ledger (read-only)</p>
            {recon !== null && <span className="text-xs text-slate-500 font-mono">{JSON.stringify(recon).slice(0, 120)}</span>}
          </div>
          {movState === 'loading' && <div className="p-4"><LoadingState /></div>}
          {movState === 'error' && <div className="p-4"><ErrorState error={movError} onRetry={loadMovements} /></div>}
          {movState === 'success' && movements.length === 0 && <div className="p-4"><EmptyState title="No movements" /></div>}
          {movState === 'success' && movements.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Type</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">Δ on hand</th>
                  <th className="px-4 py-3 text-end text-xs uppercase text-slate-500">After</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">Reason</th>
                  <th className="px-4 py-3 text-start text-xs uppercase text-slate-500">When</th>
                </tr></thead>
                <tbody>
                  {movements.map((m) => {
                    const r = m as unknown as { id?: string; type?: string; onHandDelta?: number; onHandAfter?: number; reason?: string; occurredAt?: string }
                    return (
                      <tr key={r.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">{r.type}</td>
                        <td className="px-4 py-3 text-end font-mono">{r.onHandDelta}</td>
                        <td className="px-4 py-3 text-end">{r.onHandAfter}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{r.reason ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{r.occurredAt}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'counts' && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold">Physical counts</p>
            {canCount && <Button size="sm" onClick={() => setCountModal(true)}>Record count</Button>}
            <span className="text-xs text-slate-400 ms-auto">{countsMeta.totalItems} counts</span>
          </div>
          {countsState === 'loading' && <div className="p-4"><LoadingState /></div>}
          {countsState === 'error' && <div className="p-4"><ErrorState error={countsError} onRetry={loadCounts} /></div>}
          {countsState === 'success' && counts.length === 0 && <div className="p-4"><EmptyState title="No counts" /></div>}
          {countsState === 'success' && counts.length > 0 && (
            <div className="divide-y divide-slate-50">
              {counts.map((c) => {
                const r = c as unknown as { id?: string; systemQuantity?: number; countedQuantity?: number; countedAt?: string; note?: string }
                const diff = (r.countedQuantity ?? 0) - (r.systemQuantity ?? 0)
                return (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-mono">sys {r.systemQuantity} → counted {r.countedQuantity} ({diff >= 0 ? '+' : ''}{diff})</p>
                      <p className="text-xs text-slate-400">{r.countedAt} · {r.note ?? ''}</p>
                    </div>
                    {canAdjust && diff !== 0 && (
                      <Button variant="secondary" size="sm" onClick={() => {
                        setAdjForm({ storeId: (c as unknown as { storeId: string }).storeId, partId: (c as unknown as { partId: string }).partId, stockCountId: r.id ?? '', reasonCode: 'COUNT_CORRECTION', note: '' })
                        setAdjModal(true)
                      }}>Create adjustment</Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'adjustments' && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <select value={adjStatus} onChange={(e) => { setAdjStatus(e.target.value); setAdjPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
              <option value="">All</option><option value="PENDING_APPROVAL">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
            </select>
            {canAdjust && <Button size="sm" onClick={() => setAdjModal(true)}>New adjustment</Button>}
            <span className="text-xs text-slate-400 ms-auto">{adjMeta.totalItems} adjustments</span>
          </div>
          {adjState === 'loading' && <div className="p-4"><LoadingState /></div>}
          {adjState === 'error' && <div className="p-4"><ErrorState error={adjError} onRetry={loadAdjustments} /></div>}
          {adjState === 'success' && adjustments.length === 0 && <div className="p-4"><EmptyState title="No adjustments" /></div>}
          {adjState === 'success' && adjustments.length > 0 && (
            <div className="divide-y divide-slate-50">
              {adjustments.map((a) => {
                const r = a as unknown as { id?: string; status?: string; quantityDelta?: number; reasonCode?: string; note?: string }
                return (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Δ {r.quantityDelta} · {r.reasonCode} · <Badge variant={badgeVariantFor(String(r.status ?? ''))} /></p>
                      <p className="text-xs text-slate-400">{r.note ?? ''}</p>
                    </div>
                    {canApprove && r.status === 'PENDING_APPROVAL' && (
                      <Button variant="secondary" size="sm" onClick={() => { setDecideTarget(a); setDecideForm({ decision: 'APPROVED', reason: '' }) }}>Decide</Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={partModal} onClose={() => !partSaving && setPartModal(false)} title={editingPart ? 'Edit part' : 'Add part'} size="md"
        footer={<><Button variant="secondary" disabled={partSaving} onClick={() => setPartModal(false)}>Cancel</Button><Button disabled={partSaving} onClick={savePart}>{partSaving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          {!editingPart && <Input label="SKU (A-Z 0-9 . _ -)" value={partForm.sku} onChange={(e) => setPartForm({ ...partForm, sku: e.target.value.toUpperCase() })} required />}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name (en)" value={partForm.nameEn} onChange={(e) => setPartForm({ ...partForm, nameEn: e.target.value })} required />
            <Input label="Name (ar, optional)" value={partForm.nameAr} onChange={(e) => setPartForm({ ...partForm, nameAr: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Category" value={partForm.category} onChange={(e) => setPartForm({ ...partForm, category: e.target.value })} required />
            <Input label="Selling price (EGP)" type="number" value={partForm.sellingPrice} onChange={(e) => setPartForm({ ...partForm, sellingPrice: e.target.value })} />
          </div>
          <Input label="Barcode (optional)" value={partForm.barcode} onChange={(e) => setPartForm({ ...partForm, barcode: e.target.value })} />
          {partError ? <FieldErrors error={partError} /> : null}
        </div>
      </Modal>

      <Modal open={!!levelsTarget} onClose={() => setLevelsTarget(null)} title="Edit min/max levels" size="sm"
        footer={<><Button variant="secondary" onClick={() => setLevelsTarget(null)}>Cancel</Button><Button onClick={saveLevels}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Min" type="number" value={levelsForm.minLevel} onChange={(e) => setLevelsForm({ ...levelsForm, minLevel: e.target.value })} />
          <Input label="Max (≥ min)" type="number" value={levelsForm.maxLevel} onChange={(e) => setLevelsForm({ ...levelsForm, maxLevel: e.target.value })} />
        </div>
      </Modal>

      <Modal open={countModal} onClose={() => setCountModal(false)} title="Record stock count" size="md"
        footer={<><Button variant="secondary" onClick={() => setCountModal(false)}>Cancel</Button><Button disabled={countSaving} onClick={saveCount}>{countSaving ? 'Saving…' : 'Save count'}</Button></>}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Store" value={countForm.storeId} onChange={(e) => setCountForm({ ...countForm, storeId: e.target.value })} options={[{ value: '', label: 'Select' }, ...stores.map((s) => ({ value: s.id, label: (s as unknown as { name?: string; code?: string }).name ?? (s as unknown as { code?: string }).code ?? s.id }))]} required />
            <Input label="Part ID (UUID)" value={countForm.partId} onChange={(e) => setCountForm({ ...countForm, partId: e.target.value })} required />
          </div>
          <Input label="Counted quantity" type="number" value={countForm.countedQuantity} onChange={(e) => setCountForm({ ...countForm, countedQuantity: e.target.value })} required />
          <Input label="Note" value={countForm.note} onChange={(e) => setCountForm({ ...countForm, note: e.target.value })} />
        </div>
      </Modal>

      <Modal open={adjModal} onClose={() => setAdjModal(false)} title="New stock adjustment (from count)" size="md"
        footer={<><Button variant="secondary" onClick={() => setAdjModal(false)}>Cancel</Button><Button disabled={adjSaving} onClick={saveAdjustment}>{adjSaving ? 'Submitting…' : 'Submit'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Store ID" value={adjForm.storeId} onChange={(e) => setAdjForm({ ...adjForm, storeId: e.target.value })} required />
          <Input label="Part ID" value={adjForm.partId} onChange={(e) => setAdjForm({ ...adjForm, partId: e.target.value })} required />
          <Input label="Stock count ID (must be same store+part, with difference, unused)" value={adjForm.stockCountId} onChange={(e) => setAdjForm({ ...adjForm, stockCountId: e.target.value })} required />
          <Select label="Reason" value={adjForm.reasonCode} onChange={(e) => setAdjForm({ ...adjForm, reasonCode: e.target.value })} options={['DAMAGE', 'LOSS', 'FOUND', 'COUNT_CORRECTION', 'OTHER'].map((r) => ({ value: r, label: r }))} />
          <Input label="Note" value={adjForm.note} onChange={(e) => setAdjForm({ ...adjForm, note: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={!!decideTarget} title={`Decide adjustment`}
        message="Approving changes stock now (one movement). Rejecting closes it with no stock change."
        confirmLabel="Confirm" onConfirm={decide} onCancel={() => setDecideTarget(null)} />
      {decideTarget && (
        <Modal open={!!decideTarget} onClose={() => setDecideTarget(null)} title="Approve / reject adjustment" size="sm"
          footer={<><Button variant="secondary" onClick={() => setDecideTarget(null)}>Cancel</Button><Button onClick={decide}>Submit decision</Button></>}>
          <div className="flex flex-col gap-3">
            <Select label="Decision" value={decideForm.decision} onChange={(e) => setDecideForm({ ...decideForm, decision: e.target.value as 'APPROVED' | 'REJECTED' })} options={[{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }]} />
            <Input label="Reason (required for reject, 3–500)" value={decideForm.reason} onChange={(e) => setDecideForm({ ...decideForm, reason: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  )
}
