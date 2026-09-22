import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { useLang } from '../i18n/LanguageContext'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'

interface Invoice {
  id: string
  jobCard: string
  customer: string
  vehicle: string
  date: string
  dueDate: string
  amount: number
  vat: number
  total: number
  status: InvoiceStatus
  paymentRef?: string
}

const invoices: Invoice[] = [
  { id: 'INV-2024-0098', jobCard: 'JC-2024-0905', customer: 'Rayan Omar', vehicle: 'BMW 520i 2023', date: '18 Sep 2024', dueDate: '25 Sep 2024', amount: 2400, vat: 360, total: 2760, status: 'pending' },
  { id: 'INV-2024-0097', jobCard: 'JC-2024-0901', customer: 'Mohammed Al-Rashid', vehicle: 'Toyota Camry 2022', date: '15 Sep 2024', dueDate: '22 Sep 2024', amount: 850, vat: 127.5, total: 977.5, status: 'paid', paymentRef: 'BANK-TXN-884421' },
  { id: 'INV-2024-0096', jobCard: 'JC-2024-0897', customer: 'Noura Al-Saud', vehicle: 'Hyundai Tucson 2022', date: '12 Sep 2024', dueDate: '19 Sep 2024', amount: 1200, vat: 180, total: 1380, status: 'overdue' },
  { id: 'INV-2024-0095', jobCard: 'JC-2024-0891', customer: 'Sarah Al-Anazi', vehicle: 'Honda Accord 2021', date: '10 Sep 2024', dueDate: '17 Sep 2024', amount: 650, vat: 97.5, total: 747.5, status: 'paid', paymentRef: 'BANK-TXN-881093' },
  { id: 'INV-2024-0094', jobCard: 'JC-2024-0888', customer: 'Omar Al-Harthi', vehicle: 'Ford F-150 2020', date: '8 Sep 2024', dueDate: '15 Sep 2024', amount: 3100, vat: 465, total: 3565, status: 'paid', paymentRef: 'BANK-TXN-879201' },
  { id: 'INV-2024-0093', jobCard: 'JC-2024-0884', customer: 'Fatima Hassan', vehicle: 'Toyota RAV4 2021', date: '5 Sep 2024', dueDate: '12 Sep 2024', amount: 980, vat: 147, total: 1127, status: 'overdue' },
  { id: 'INV-2024-0092', jobCard: 'JC-2024-0879', customer: 'Khalid Al-Qahtani', vehicle: 'Lexus ES 2022', date: '2 Sep 2024', dueDate: '9 Sep 2024', amount: 4200, vat: 630, total: 4830, status: 'paid', paymentRef: 'BANK-TXN-875556' },
  { id: 'INV-2024-0091', jobCard: 'JC-2024-0871', customer: 'Lina Al-Ghamdi', vehicle: 'Kia Sportage 2023', date: '28 Aug 2024', dueDate: '4 Sep 2024', amount: 720, vat: 108, total: 828, status: 'draft' },
]

const statusStyles: Record<InvoiceStatus, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-500',
}

const fmt = (n: number) =>
  n.toLocaleString('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 })

export default function InvoicesReports() {
  const { t } = useLang()
  const { mode } = useAuth()
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [exportError, setExportError] = useState('')

  // The backend implements invoice records but not an export/download pipeline.
  // CSV is therefore generated strictly from the rows currently visible here;
  // PDF remains unavailable rather than calling an unsupported endpoint.
  const handleExport = (format: 'CSV' | 'PDF') => {
    setExportError('')
    if (format === 'PDF') {
      setExportError('PDF invoice export is not available from the current backend.')
      return
    }
    const header = 'Invoice,JobCard,Customer,Date,DueDate,Amount,VAT,Total,Status,Ref'
    const rows = filtered.map((inv) =>
      [inv.id, inv.jobCard, inv.customer, inv.date, inv.dueDate, inv.amount, inv.vat, inv.total, inv.status, inv.paymentRef ?? ''].join(','),
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusLabels: Record<InvoiceStatus, string> = {
    paid: t('invoices.status.paid'),
    pending: t('invoices.status.pending'),
    overdue: t('invoices.status.overdue'),
    draft: t('invoices.status.draft'),
  }

  const filtered = invoices.filter((inv) => {
    const matchStatus = filter === 'all' || inv.status === filter
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      inv.id.toLowerCase().includes(q) ||
      inv.customer.toLowerCase().includes(q) ||
      inv.jobCard.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalPending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.total, 0)
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0)

  const tableHeaders: [string, string][] = [
    [t('invoices.col.invoice'), 'invoice'],
    [t('invoices.col.jobCard'), 'jobCard'],
    [t('invoices.col.customer'), 'customer'],
    [t('invoices.col.date'), 'date'],
    [t('invoices.col.dueDate'), 'dueDate'],
    [t('invoices.col.amount'), 'amount'],
    [t('invoices.col.vat'), 'vat'],
    [t('invoices.col.total'), 'total'],
    [t('invoices.col.status'), 'status'],
    [t('invoices.col.ref'), 'ref'],
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.invoices')}
        subtitle={t('invoices.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <DemoBadge visible={mode === 'demo'} />
            <button
              onClick={() => handleExport('CSV')}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('invoices.exportCsv')}
            </button>
          </div>
        }
      />
      {exportError && (
        <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{exportError}</div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('invoices.kpi.collected')}</p>
          <p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.filter((i) => i.status === 'paid').length} {t('invoices.invoicesSuffix')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('invoices.kpi.outstanding')}</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalPending)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.filter((i) => i.status === 'pending').length} {t('invoices.invoicesSuffix')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('invoices.status.overdue')}</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalOverdue)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.filter((i) => i.status === 'overdue').length} {t('invoices.invoicesSuffix')}</p>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {t('invoices.readOnlyNotice')}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center md:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 ps-9 pe-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('invoices.searchPlaceholder')}
            />
          </div>

          {/* Status filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${filter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {s === 'all' ? t('invoices.filter.all') : statusLabels[s]}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 md:ms-auto">{filtered.length} {t('invoices.recordsSuffix')}</span>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-slate-50">
          {filtered.map((inv) => (
            <div key={inv.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="font-mono text-xs font-semibold text-blue-600" dir="ltr">{inv.id}</span>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{inv.customer}</p>
                  <p className="text-xs text-slate-400">{inv.vehicle}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[inv.status]}`}>
                    {statusLabels[inv.status]}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{fmt(inv.total)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs text-slate-400" dir="ltr">{inv.jobCard}</span>
                <span className="text-xs text-slate-400">{inv.date}</span>
              </div>
              {inv.paymentRef && (
                <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">{t('invoices.refPrefix')} {inv.paymentRef}</p>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                {tableHeaders.map(([label, key]) => (
                  <th key={key} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 whitespace-nowrap" dir="ltr">{inv.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap" dir="ltr">{inv.jobCard}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 whitespace-nowrap">{inv.customer}</p>
                    <p className="text-xs text-slate-400">{inv.vehicle}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.date}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-medium ${inv.status === 'overdue' ? 'text-red-600' : 'text-slate-600'}`}>{inv.dueDate}</td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap" dir="ltr">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap" dir="ltr">{fmt(inv.vat)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap" dir="ltr">{fmt(inv.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap" dir="ltr">{inv.paymentRef ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={7} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t('invoices.totalLabel')} ({filtered.length} {t('invoices.shownSuffix')})
                </td>
                <td className="px-4 py-3 font-bold text-slate-900" dir="ltr">
                  {fmt(filtered.reduce((s, i) => s + i.total, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">{t('customers.showing')} 1–{filtered.length} {t('customers.of')} {invoices.length} {t('invoices.invoicesSuffix')}</p>
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('invoices.exportPdfStatement')}
          </button>
        </div>
      </div>
    </div>
  )
}
