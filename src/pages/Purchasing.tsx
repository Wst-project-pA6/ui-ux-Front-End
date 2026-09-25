import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'

type PurchasingTab = 'vendors' | 'purchase-orders' | 'approvals' | 'goods-receipts'

interface Vendor {
  id: string
  name: string
  contact: string
  phone: string
  city: string
  categories: string
  status: 'active'
}

interface PurchaseOrder {
  id: string
  vendor: string
  items: number
  total: number
  status: 'pending' | 'approved' | 'delivered' | 'rejected'
  approvals: number
  requiredApprovals: number
  date: string
  highValue: boolean
}

interface GoodsReceipt {
  id: string
  po: string
  vendor: string
  expected: number
  accepted: number
  rejected: number
  date: string
  status: 'pending' | 'approved'
}

interface LineItem {
  part: string
  qty: string
  unitCost: string
}

const HIGH_VALUE_THRESHOLD = 5000

const seedVendors: Vendor[] = [
  { id: 'VND-001', name: 'Al-Mujab Auto Parts', contact: 'Saleh Al-Mujab', phone: '+966 11 234 5678', city: 'Riyadh', categories: 'Brakes, Engine', status: 'active' },
  { id: 'VND-002', name: 'Gulf Parts Trading', contact: 'Hassan Al-Ghamdi', phone: '+966 12 345 6789', city: 'Jeddah', categories: 'Electrical, Filters', status: 'active' },
  { id: 'VND-003', name: 'Eastern Auto Supplies', contact: 'Nader Al-Qahtani', phone: '+966 13 456 7890', city: 'Dammam', categories: 'Lubricants, Cooling', status: 'active' },
]

const seedPOs: PurchaseOrder[] = [
  { id: 'PO-2024-142', vendor: 'Al-Mujab Auto Parts', items: 3, total: 4500, status: 'pending', approvals: 1, requiredApprovals: 2, date: '2024-09-15', highValue: true },
  { id: 'PO-2024-141', vendor: 'Gulf Parts Trading', items: 5, total: 1200, status: 'approved', approvals: 1, requiredApprovals: 1, date: '2024-09-14', highValue: false },
  { id: 'PO-2024-140', vendor: 'Eastern Auto Supplies', items: 2, total: 850, status: 'delivered', approvals: 1, requiredApprovals: 1, date: '2024-09-10', highValue: false },
  { id: 'PO-2024-139', vendor: 'Al-Mujab Auto Parts', items: 8, total: 12000, status: 'pending', approvals: 0, requiredApprovals: 2, date: '2024-09-08', highValue: true },
]

const seedReceipts: GoodsReceipt[] = [
  { id: 'GR-2024-098', po: 'PO-2024-141', vendor: 'Gulf Parts Trading', expected: 5, accepted: 5, rejected: 0, date: '2024-09-16', status: 'approved' },
  { id: 'GR-2024-097', po: 'PO-2024-140', vendor: 'Eastern Auto Supplies', expected: 2, accepted: 2, rejected: 0, date: '2024-09-12', status: 'approved' },
  { id: 'GR-2024-096', po: 'PO-2024-138', vendor: 'Gulf Parts Trading', expected: 4, accepted: 3, rejected: 1, date: '2024-09-05', status: 'pending' },
]

export default function Purchasing() {
  const { t } = useLang()
  const { showToast } = useToast()
  const [tab, setTab] = useState<PurchasingTab>('purchase-orders')
  const [vendors] = useState<Vendor[]>(seedVendors)
  const [orders, setOrders] = useState<PurchaseOrder[]>(seedPOs)
  const [receipts] = useState<GoodsReceipt[]>(seedReceipts)
  const [addPOOpen, setAddPOOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ po: PurchaseOrder; decision: 'approve' | 'reject' } | null>(null)

  // New PO form
  const [poVendor, setPoVendor] = useState('')
  const [poDate, setPoDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ part: '', qty: '', unitCost: '' }])
  const [poError, setPoError] = useState('')

  const tabs: { key: PurchasingTab; label: string }[] = [
    { key: 'vendors', label: t('purchasing.tab.vendors') },
    { key: 'purchase-orders', label: t('purchasing.tab.purchaseOrders') },
    { key: 'approvals', label: t('purchasing.tab.approvals') },
    { key: 'goods-receipts', label: t('purchasing.tab.goodsReceipts') },
  ]

  const pendingPOs = orders.filter((po) => po.status === 'pending')

  const decidePO = () => {
    if (!confirmAction) return
    const { po, decision } = confirmAction
    if (decision === 'approve') {
      const approvals = po.approvals + 1
      const status: PurchaseOrder['status'] = approvals >= po.requiredApprovals ? 'approved' : 'pending'
      setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, approvals, status } : o)))
      showToast(
        'success',
        status === 'approved' ? 'PO approved' : 'Approval recorded',
        status === 'approved'
          ? `${po.id} is now approved.`
          : `${po.id}: ${approvals}/${po.requiredApprovals} approvals.`,
      )
    } else {
      setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, status: 'rejected' } : o)))
      showToast('success', 'PO rejected', po.id)
    }
    setConfirmAction(null)
  }

  const updateLine = (index: number, key: keyof LineItem, value: string) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
    setPoError('')
  }

  const removeLine = (index: number) => {
    if (lineItems.length === 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const lineTotal = lineItems.reduce((sum, item) => {
    const qty = Number(item.qty)
    const unit = Number(item.unitCost)
    return sum + (qty > 0 && unit >= 0 ? qty * unit : 0)
  }, 0)

  const submitPO = () => {
    if (!poVendor) {
      setPoError('Select a vendor.')
      return
    }
    const validLines = lineItems.filter((l) => l.part.trim() && Number(l.qty) > 0 && Number(l.unitCost) >= 0)
    if (validLines.length === 0) {
      setPoError('Add at least one line item with a part name, quantity and unit cost.')
      return
    }
    if (lineItems.some((l) => (l.part.trim() || l.qty || l.unitCost) && !validLines.includes(l))) {
      setPoError('Remove or complete incomplete line items.')
      return
    }
    const total = validLines.reduce((s, l) => s + Number(l.qty) * Number(l.unitCost), 0)
    const highValue = total > HIGH_VALUE_THRESHOLD
    const maxNum = Math.max(...orders.map((o) => Number(o.id.slice(-3))))
    const id = `PO-2024-${maxNum + 1}`
    const vendorName = vendors.find((v) => v.id === poVendor)?.name ?? poVendor
    setOrders((prev) => [
      {
        id,
        vendor: vendorName,
        items: validLines.length,
        total,
        status: 'pending',
        approvals: 0,
        requiredApprovals: highValue ? 2 : 1,
        date: poDate || new Date().toISOString().slice(0, 10),
        highValue,
      },
      ...prev,
    ])
    showToast(
      'success',
      'Purchase order submitted',
      highValue ? `${id} requires two approvals before sending to the vendor.` : `${id} submitted for approval.`,
    )
    setPoVendor('')
    setPoDate('')
    setLineItems([{ part: '', qty: '', unitCost: '' }])
    setPoError('')
    setAddPOOpen(false)
    setTab('approvals')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('purchasing.title')}
        subtitle={t('purchasing.subtitle')}
        actions={
          <Button onClick={() => { setPoError(''); setAddPOOpen(true) }}>{t('purchasing.newPOBtn')}</Button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t_.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t_.label}
            {t_.key === 'approvals' && pendingPOs.length > 0 && (
              <span className="ms-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pendingPOs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'vendors' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
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
                  <tr key={v.id} onClick={() => setSelectedVendor(v)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
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
        </div>
      )}

      {tab === 'purchase-orders' && (
        orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No purchase orders yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first purchase order to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
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
                  {orders.map((po) => (
                    <tr key={po.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
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
          </div>
        )
      )}

      {tab === 'approvals' && (
        pendingPOs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No pending approvals</p>
            <p className="text-xs text-slate-400 mt-1">All purchase orders have been decided.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingPOs.map((po) => (
              <div key={po.id} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
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
                    <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ po, decision: 'reject' })}>{t('purchasing.approvals.reject')}</Button>
                    <Button size="sm" onClick={() => setConfirmAction({ po, decision: 'approve' })}>{t('purchasing.approvals.approve')}</Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-100 flex-wrap">
                  <span className="text-xs text-slate-500">{t('purchasing.approvals.approvals')} <span dir="ltr">{po.approvals}/{po.requiredApprovals}</span></span>
                  <div className="flex gap-2">
                    {po.approvals > 0 && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                        ✓ Ahmed M. (Workshop Manager)
                      </span>
                    )}
                    {po.approvals < po.requiredApprovals && (
                      <span className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                        ○ {t('purchasing.approvals.financeApprovalPending')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'goods-receipts' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
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
                {receipts.map((gr) => (
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
        </div>
      )}

      {/* Approval decision confirmation */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.decision === 'approve' ? t('purchasing.approvals.approve') : t('purchasing.approvals.reject')}
        message={
          confirmAction?.decision === 'approve'
            ? `Record your approval for ${confirmAction?.po.id}? ${confirmAction && confirmAction.po.requiredApprovals > 1 ? 'A second approval is still required before this order can be sent.' : 'This will approve the order.'}`
            : `Reject ${confirmAction?.po.id}? The order will be closed as rejected.`
        }
        confirmLabel={confirmAction?.decision === 'approve' ? t('purchasing.approvals.approve') : t('purchasing.approvals.reject')}
        destructive={confirmAction?.decision === 'reject'}
        onConfirm={decidePO}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Vendor detail modal */}
      {selectedVendor && (
        <Modal
          open={!!selectedVendor}
          onClose={() => setSelectedVendor(null)}
          title={selectedVendor.name}
          size="md"
          footer={
            <Button variant="secondary" onClick={() => setSelectedVendor(null)}>{t('action.close')}</Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Vendor ID', value: selectedVendor.id },
                { label: t('purchasing.vendors.col.status'), value: selectedVendor.status },
                { label: t('purchasing.vendors.col.contact'), value: selectedVendor.contact },
                { label: t('purchasing.vendors.col.phone'), value: selectedVendor.phone },
                { label: t('purchasing.vendors.col.city'), value: selectedVendor.city },
                { label: t('purchasing.vendors.col.categories'), value: selectedVendor.categories },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Purchase orders</h3>
              {orders.filter((o) => o.vendor === selectedVendor.name).length === 0 ? (
                <p className="text-xs text-slate-400">No purchase orders with this vendor yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {orders.filter((o) => o.vendor === selectedVendor.name).map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                      <span className="font-mono text-xs text-blue-600" dir="ltr">{o.id}</span>
                      <span className="text-xs text-slate-500" dir="ltr">SAR {o.total.toLocaleString()}</span>
                      <Badge variant={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
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
            <Button onClick={submitPO}>{t('purchasing.modal.submitBtn')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('purchasing.form.vendor')}
              value={poVendor}
              onChange={(e) => { setPoVendor(e.target.value); setPoError('') }}
              options={[
                { value: '', label: t('purchasing.form.selectVendor') },
                ...vendors.map((v) => ({ value: v.id, label: v.name })),
              ]}
              required
            />
            <Input label={t('purchasing.form.deliveryDate')} type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
          </div>
          <div className="border border-slate-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{t('purchasing.form.lineItems')}</h3>
              <button
                onClick={() => setLineItems((prev) => [...prev, { part: '', qty: '', unitCost: '' }])}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                {t('purchasing.form.addItem')}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <Input value={item.part} onChange={(e) => updateLine(i, 'part', e.target.value)} placeholder={t('purchasing.form.partPlaceholder')} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" value={item.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} placeholder={t('purchasing.form.qtyPlaceholder')} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" value={item.unitCost} onChange={(e) => updateLine(i, 'unitCost', e.target.value)} placeholder={t('purchasing.form.unitCostPlaceholder')} />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={() => removeLine(i)}
                      disabled={lineItems.length === 1}
                      aria-label="Remove line item"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
              <p className="text-sm text-slate-600">
                Total: <strong className="text-slate-900" dir="ltr">SAR {lineTotal.toLocaleString()}</strong>
                {lineTotal > HIGH_VALUE_THRESHOLD && (
                  <span className="ms-2 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded">{t('purchasing.po.highValue')}</span>
                )}
              </p>
            </div>
          </div>
          {poError && <p className="text-xs text-red-600">{poError}</p>}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            {t('purchasing.form.highValueWarning')}
          </div>
        </div>
      </Modal>
    </div>
  )
}
