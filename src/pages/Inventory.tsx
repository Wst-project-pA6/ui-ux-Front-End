import React, { useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { inventoryApi } from '../api/resources'
import { ApiError } from '../api/http'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

type StockStatus = 'healthy' | 'low-stock' | 'out-of-stock'

const INITIAL_PARTS = [
  { sku: 'BRK-PAD-001', name: 'Brake Pad Set (Front)', category: 'Brakes', compatibility: 'Toyota, Honda', store: 'Main Store', onHand: 3, reserved: 1, min: 10, max: 50, avgCost: 180, status: 'low-stock' as StockStatus },
  { sku: 'OIL-F-001', name: 'Oil Filter', category: 'Engine', compatibility: 'Universal', store: 'Main Store', onHand: 45, reserved: 5, min: 20, max: 100, avgCost: 35, status: 'healthy' as StockStatus },
  { sku: 'OIL-E-5W30', name: 'Engine Oil 5W-30 (4L)', category: 'Lubricants', compatibility: 'Universal', store: 'Main Store', onHand: 0, reserved: 0, min: 15, max: 60, avgCost: 65, status: 'out-of-stock' as StockStatus },
  { sku: 'AIR-F-002', name: 'Air Filter', category: 'Engine', compatibility: 'BMW, Mercedes', store: 'Bay Store A', onHand: 8, reserved: 2, min: 5, max: 25, avgCost: 55, status: 'healthy' as StockStatus },
  { sku: 'SPK-PLG-003', name: 'Spark Plugs (Set of 4)', category: 'Ignition', compatibility: 'Toyota, Nissan', store: 'Main Store', onHand: 4, reserved: 2, min: 8, max: 30, avgCost: 120, status: 'low-stock' as StockStatus },
  { sku: 'BAT-12V-005', name: 'Battery 12V 65Ah', category: 'Electrical', compatibility: 'Universal', store: 'Main Store', onHand: 12, reserved: 1, min: 5, max: 20, avgCost: 450, status: 'healthy' as StockStatus },
  { sku: 'BELT-SRP-007', name: 'Serpentine Belt', category: 'Engine', compatibility: 'Ford, Chevrolet', store: 'Bay Store A', onHand: 0, reserved: 0, min: 3, max: 12, avgCost: 95, status: 'out-of-stock' as StockStatus },
  { sku: 'COOL-ANT-009', name: 'Coolant 50/50 (5L)', category: 'Cooling', compatibility: 'Universal', store: 'Main Store', onHand: 22, reserved: 3, min: 10, max: 40, avgCost: 45, status: 'healthy' as StockStatus },
]

export default function Inventory() {
  const { t } = useLang()
  const { mode } = useAuth()
  const [search, setSearch] = useState('')
  const [parts, setParts] = useState(INITIAL_PARTS)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleAddPart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const sku = String(fd.get('sku') ?? '').trim().toUpperCase()
    const name = String(fd.get('name') ?? '').trim()
    const category = String(fd.get('category') ?? '').trim() || 'General'
    const compatibility = String(fd.get('compatibility') ?? '').trim() || 'Universal'
    const min = Number(fd.get('min') ?? 0)
    const max = Number(fd.get('max') ?? 0)
    const avgCost = String(fd.get('avgCost') ?? '0').trim() || '0'
    const store = String(fd.get('store') ?? '') === 'bay-a' ? 'Bay Store A' : 'Main Store'
    setSaving(true)
    setSaveError('')
    try {
      // Contract: POST /parts (SKU pattern ^[A-Z0-9][A-Z0-9._-]{1,63}$).
      await inventoryApi.createPart({
        sku, name: { en: name }, category, unitOfMeasure: 'PCS',
        sellingPrice: { amount: avgCost, currency: 'SAR' },
      })
      setAddOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        const onHand = 0
        setParts((prev) => [...prev, {
          sku, name, category, compatibility, store, onHand, reserved: 0, min, max,
          avgCost: Number(avgCost) || 0,
          status: (onHand === 0 ? 'out-of-stock' : onHand < min ? 'low-stock' : 'healthy') as StockStatus,
        }])
        setAddOpen(false)
      } else {
        setSaveError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Add part failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const categories = ['All', ...Array.from(new Set(parts.map((p) => p.category)))]

  const filtered = parts.filter(
    (p) =>
      (categoryFilter === 'All' || p.category === categoryFilter) &&
      (statusFilter === 'All' || p.status === statusFilter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  )

  const lowStockCount = parts.filter((p) => p.status === 'low-stock').length
  const outOfStockCount = parts.filter((p) => p.status === 'out-of-stock').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        actions={
          <>
            <Button variant="secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              {t('action.export')}
            </Button>
            <DemoBadge visible={mode === 'demo'} />
            <Button onClick={() => { setSaveError(''); setAddOpen(true) }}>{t('inventory.addBtn')}</Button>
          </>
        }
      />

      {/* Stock Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 font-medium">{t('inventory.kpi.totalSkus')}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{parts.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-amber-700 font-medium">{t('inventory.kpi.lowStock')}</p>
          <p className="text-3xl font-bold text-amber-800 mt-1">{lowStockCount}</p>
          <p className="text-xs text-amber-600 mt-1">{t('inventory.kpi.lowStockSub')}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-red-700 font-medium">{t('inventory.kpi.outOfStock')}</p>
          <p className="text-3xl font-bold text-red-800 mt-1">{outOfStockCount}</p>
          <p className="text-xs text-red-600 mt-1">{t('inventory.kpi.outOfStockSub')}</p>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg width="16" height="16" className="text-blue-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <div>
          <p className="text-sm font-semibold text-blue-800">{t('inventory.advisory.title')}</p>
          <p className="text-xs text-blue-700 mt-0.5">{t('inventory.advisory.desc')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder={t('inventory.search')} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? t('inventory.filter.allCategories') : c}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">{t('inventory.filter.allStatus')}</option>
            <option value="healthy">{t('badge.healthy')}</option>
            <option value="low-stock">{t('badge.low-stock')}</option>
            <option value="out-of-stock">{t('badge.out-of-stock')}</option>
          </select>
          <span className="text-xs text-slate-400 ms-auto">{filtered.length} {t('inventory.results')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.sku')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.partName')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.category')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.store')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.onHand')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.reserved')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.min')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.avgCost')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('inventory.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((part) => (
                <tr key={part.sku} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-500" dir="ltr">{part.sku}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-800">{part.name}</p>
                    <p className="text-xs text-slate-400">{part.compatibility}</p>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{part.category}</td>
                  <td className="px-6 py-3 text-slate-600">{part.store}</td>
                  <td className={`px-6 py-3 text-end font-semibold ${
                    part.onHand === 0 ? 'text-red-600' : part.onHand < part.min ? 'text-amber-600' : 'text-slate-800'
                  }`}>{part.onHand}</td>
                  <td className="px-6 py-3 text-end text-slate-500">{part.reserved}</td>
                  <td className="px-6 py-3 text-end text-slate-400">{part.min}</td>
                  <td className="px-6 py-3 text-end text-slate-600" dir="ltr">SAR {part.avgCost}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={part.status} />
                      {part.status !== 'healthy' && (
                        <button className="text-xs text-blue-600 hover:underline font-medium">{t('inventory.reorder')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Part Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('inventory.modal.addTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button>
            <Button loading={saving} onClick={() => (document.getElementById('part-add-form') as HTMLFormElement | null)?.requestSubmit()}>{t('inventory.modal.addBtn')}</Button>
          </>
        }
      >
        <form id="part-add-form" onSubmit={handleAddPart} className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input name="sku" label={t('inventory.form.sku')} placeholder="BRK-PAD-001" required />
            <Input name="name" label={t('inventory.form.name')} placeholder="Brake Pad Set" required />
          </div>
          <Select name="category" label={t('inventory.form.category')} options={[
            { value: '', label: t('inventory.form.selectCategory') },
            { value: 'Brakes', label: 'Brakes' },
            { value: 'Engine', label: 'Engine' },
            { value: 'Electrical', label: 'Electrical' },
            { value: 'Lubricants', label: 'Lubricants' },
          ]} required />
          <Input name="compatibility" label={t('inventory.form.compatibility')} placeholder={t('inventory.form.compatibilityPlaceholder')} />
          <div className="grid grid-cols-3 gap-4">
            <Input name="min" label={t('inventory.form.minStock')} type="number" placeholder="10" />
            <Input name="max" label={t('inventory.form.maxStock')} type="number" placeholder="50" />
            <Input name="avgCost" label={t('inventory.form.avgCost')} type="number" placeholder="180" />
          </div>
          <Select name="store" label={t('inventory.form.store')} options={[
            { value: '', label: t('inventory.form.selectStore') },
            { value: 'main', label: 'Main Store' },
            { value: 'bay-a', label: 'Bay Store A' },
          ]} />
        </form>
      </Modal>
    </div>
  )
}
