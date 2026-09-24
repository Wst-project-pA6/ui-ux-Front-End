import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { procurementApi } from '../api/resources'
import { ApiError } from '../api/http'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

type PurchasingTab = 'vendors' | 'purchase-orders' | 'approvals' | 'goods-receipts'

const vendors = [
  { id: 'VND-001', name: 'Al-Mujab Auto Parts', contact: 'Saleh Al-Mujab', phone: '+966 11 234 5678', city: 'Riyadh', categories: 'Brakes, Engine', status: 'active' as const },
  { id: 'VND-002', name: 'Gulf Parts Trading', contact: 'Hassan Al-Ghamdi', phone: '+966 12 345 6789', city: 'Jeddah', categories: 'Electrical, Filters', status: 'active' as const },
  { id: 'VND-003', name: 'Eastern Auto Supplies', contact: 'Nader Al-Qahtani', phone: '+966 13 456 7890', city: 'Dammam', categories: 'Lubricants, Cooling', status: 'active' as const },
]

const INITIAL_POS = [
  { id: 'PO-2024-142', vendor: 'Al-Mujab Auto Parts', items: 3, total: 4500, status: 'pending' as const, approvals: 1, requiredApprovals: 2, date: '2024-09-15', highValue: true },
  { id: 'PO-2024-141', vendor: 'Gulf Parts Trading', items: 5, total: 1200, status: 'approved' as const, approvals: 1, requiredApprovals: 1, date: '2024-09-14', highValue: false },
  { id: 'PO-2024-140', vendor: 'Eastern Auto Supplies', items: 2, total: 850, status: 'delivered' as const, approvals: 1, requiredApprovals: 1, date: '2024-09-10', highValue: false },
  { id: 'PO-2024-139', vendor: 'Al-Mujab Auto Parts', items: 8, total: 12000, status: 'pending' as const, approvals: 0, requiredApprovals: 2, date: '2024-09-08', highValue: true },
]

const goodsReceipts = [
  { id: 'GR-2024-098', po: 'PO-2024-141', vendor: 'Gulf Parts Trading', expected: 5, accepted: 5, rejected: 0, date: '2024-09-16', status: 'approved' as const },
  { id: 'GR-2024-097', po: 'PO-2024-140', vendor: 'Eastern Auto Supplies', expected: 2, accepted: 2, rejected: 0, date: '2024-09-12', status: 'approved' as const },
  { id: 'GR-2024-096', po: 'PO-2024-138', vendor: 'Gulf Parts Trading', expected: 4, accepted: 3, rejected: 1, date: '2024-09-05', status: 'pending' as const },
]

export default function Purchasing() {
  const { t } = useLang()
  const { mode } = useAuth()
  const [tab, setTab] = useState<PurchasingTab>('purchase-orders')
  const [addPOOpen, setAddPOOpen] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState(INITIAL_POS)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSubmitPO = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const vendorId = String(fd.get('vendor') ?? '')
    const vendorName = vendorId === 'v2' ? 'Gulf Parts Trading' : vendorId === 'v3' ? 'Eastern Auto Supplies' : 'Al-Mujab Auto Parts'
    const lines = [0, 1]
      .map((i) => ({
        partName: String(fd.get(`part${i}`) ?? '').trim(),
        quantity: Number(fd.get(`qty${i}`) ?? 0),
        unitPrice: { amount: String(fd.get(`unit${i}`) ?? '0').trim() || '0', currency: 'SAR' },
      }))
      .filter((l) => l.partName && l.quantity > 0)
    if (!vendorId || lines.length === 0) {
      setSaveError('Vendor and at least one line item are required')
      return
    }
    const total = lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice.amount), 0)
    setSaving(true)
    setSaveError('')
    try {
      // Contract: POST /purchase-orders. Above-threshold orders require two
      // approvals (snapshot at submit); stock moves only on goods receipt.
      await procurementApi.createOrder({ vendorId, storeId: 'main-store', lines })
      setAddPOOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        setPurchaseOrders((prev) => [{
          id: `PO-LOCAL-${Date.now()}`, vendor: vendorName, items: lines.length, total,
          status: 'pending' as const, approvals: 0,
          requiredApprovals: total > 5000 ? 2 : 1,
          date: new Date().toISOString().slice(0, 10), highValue: total > 5000,
        }, ...prev])
        setAddPOOpen(false)
      } else {
        setSaveError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Submit failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: PurchasingTab; label: string }[] = [
    { key: 'vendors', label: t('purchasing.tab.vendors') },
    { key: 'purchase-orders', label: t('purchasing.tab.purchaseOrders') },
    { key: 'approvals', label: t('purchasing.tab.approvals') },
    { key: 'goods-receipts', label: t('purchasing.tab.goodsReceipts') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('purchasing.title')}
        subtitle={t('purchasing.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <DemoBadge visible={mode === 'demo'} />
            <Button onClick={() => { setSaveError(''); setAddPOOpen(true) }}>{t('purchasing.newPOBtn')}</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t_.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t_.label}
          </button>
        ))}
      </div>

      {tab === 'vendors' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.vendors.col.vendor')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.vendors.col.contact')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.vendors.col.phone')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.vendors.col.city')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.vendors.col.categories')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.vendors.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{v.name}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{v.id}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{v.contact}</td>
                  <td className="px-6 py-4 text-slate-600" dir="ltr">{v.phone}</td>
                  <td className="px-6 py-4 text-slate-600">{v.city}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{v.categories}</td>
                  <td className="px-6 py-4"><Badge variant={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'purchase-orders' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.po')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.vendor')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.items')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.total')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.approvals')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.date')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.po.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-600 font-medium" dir="ltr">{po.id}</span>
                      {po.highValue && (
                        <span className="bg-purple-100 text-purple-700 text-xs font-medium px-1.5 py-0.5 rounded">{t('purchasing.po.highValue')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{po.vendor}</td>
                  <td className="px-6 py-4 text-end text-slate-600">{po.items}</td>
                  <td className="px-6 py-4 text-end font-semibold text-slate-800" dir="ltr">SAR {po.total.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: po.requiredApprovals }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              i < po.approvals ? 'border-green-500 bg-green-500' : 'border-slate-200 bg-white'
                            }`}
                          >
                            {i < po.approvals && (
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400" dir="ltr">{po.approvals}/{po.requiredApprovals}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs" dir="ltr">{po.date}</td>
                  <td className="px-6 py-4"><Badge variant={po.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="flex flex-col gap-4">
          {purchaseOrders.filter((po) => po.status === 'pending').map((po) => (
            <div key={po.id} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-blue-600 font-medium" dir="ltr">{po.id}</span>
                    {po.highValue && (
                      <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded">
                        {t('purchasing.approvals.twoRequired')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{po.vendor} · {po.items} items · <span dir="ltr">SAR {po.total.toLocaleString()}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">{t('purchasing.approvals.submitted')} <span dir="ltr">{po.date}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm">{t('purchasing.approvals.reject')}</Button>
                  <Button size="sm">{t('purchasing.approvals.approve')}</Button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">{t('purchasing.approvals.approvals')} <span dir="ltr">{po.approvals}/{po.requiredApprovals}</span></span>
                <div className="flex gap-2">
                  {po.approvals > 0 && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      ✓ Ahmed M. (Workshop Manager)
                    </span>
                  )}
                  {po.requiredApprovals > 1 && (
                    <span className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                      ○ {t('purchasing.approvals.financeApprovalPending')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'goods-receipts' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.receipt')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.poRef')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.vendor')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.expected')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.accepted')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.rejected')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.date')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('purchasing.gr.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {goodsReceipts.map((gr) => (
                <tr key={gr.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-blue-600 font-medium" dir="ltr">{gr.id}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500" dir="ltr">{gr.po}</td>
                  <td className="px-6 py-4 text-slate-700">{gr.vendor}</td>
                  <td className="px-6 py-4 text-end text-slate-600">{gr.expected}</td>
                  <td className="px-6 py-4 text-end text-green-600 font-semibold">{gr.accepted}</td>
                  <td className="px-6 py-4 text-end text-red-600 font-semibold">{gr.rejected}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs" dir="ltr">{gr.date}</td>
                  <td className="px-6 py-4"><Badge variant={gr.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New PO Modal */}
      <Modal
        open={addPOOpen}
        onClose={() => setAddPOOpen(false)}
        title={t('purchasing.modal.newPOTitle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddPOOpen(false)}>{t('action.cancel')}</Button>
            <Button loading={saving} onClick={() => (document.getElementById('po-create-form') as HTMLFormElement | null)?.requestSubmit()}>{t('purchasing.modal.submitBtn')}</Button>
          </>
        }
      >
        <form id="po-create-form" onSubmit={handleSubmitPO} className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
          )}
          <Select name="vendor" label={t('purchasing.form.vendor')} options={[
            { value: '', label: t('purchasing.form.selectVendor') },
            { value: 'v1', label: 'Al-Mujab Auto Parts' },
            { value: 'v2', label: 'Gulf Parts Trading' },
            { value: 'v3', label: 'Eastern Auto Supplies' },
          ]} required />
          <Input name="deliveryDate" label={t('purchasing.form.deliveryDate')} type="date" />
          <div className="border border-slate-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{t('purchasing.form.lineItems')}</h3>
              <button type="button" className="text-xs text-blue-600 font-medium hover:underline">{t('purchasing.form.addItem')}</button>
            </div>
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <Input name={`part${i}`} placeholder={t('purchasing.form.partPlaceholder')} />
                  </div>
                  <Input name={`qty${i}`} type="number" placeholder={t('purchasing.form.qtyPlaceholder')} />
                  <Input name={`unit${i}`} type="number" placeholder={t('purchasing.form.unitCostPlaceholder')} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            {t('purchasing.form.highValueWarning')}
          </div>
        </form>
      </Modal>
    </div>
  )
}
