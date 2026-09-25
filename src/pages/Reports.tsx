import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'

type ReportTab = 'workshop' | 'inventory' | 'training'

const jobsByStage = [
  { stage: 'Received', count: 12 },
  { stage: 'In Progress', count: 24 },
  { stage: 'QC', count: 7 },
  { stage: 'Ready', count: 9 },
  { stage: 'Delivered', count: 156 },
]

const turnaroundData = [
  { month: 'Apr', hours: 18.2 },
  { month: 'May', hours: 16.5 },
  { month: 'Jun', hours: 19.1 },
  { month: 'Jul', hours: 14.8 },
  { month: 'Aug', hours: 13.2 },
  { month: 'Sep', hours: 12.4 },
]

const laborHours = [
  { week: 'W35', mechanical: 82, electrical: 45, body: 30 },
  { week: 'W36', mechanical: 90, electrical: 52, body: 28 },
  { week: 'W37', mechanical: 75, electrical: 48, body: 35 },
  { week: 'W38', mechanical: 95, electrical: 60, body: 32 },
]

const bayUtilization = [
  { bay: 'Bay 1', pct: 88 },
  { bay: 'Bay 2', pct: 72 },
  { bay: 'Bay 3', pct: 91 },
  { bay: 'Bay 4', pct: 65 },
  { bay: 'Bay 5', pct: 58 },
]

const attendanceData = [
  { session: 'S001', rate: 95 },
  { session: 'S002', rate: 87 },
  { session: 'S003', rate: 100 },
  { session: 'S004', rate: 78 },
  { session: 'S005', rate: 92 },
]

const passRateData = [
  { name: 'Pass', value: 68, color: '#16A34A' },
  { name: 'Needs Improvement', value: 20, color: '#D97706' },
  { name: 'Fail', value: 12, color: '#DC2626' },
]

const inventoryTurnover = [
  { month: 'Apr', value: 3.2 },
  { month: 'May', value: 3.8 },
  { month: 'Jun', value: 2.9 },
  { month: 'Jul', value: 4.1 },
  { month: 'Aug', value: 3.5 },
  { month: 'Sep', value: 4.2 },
]

export default function Reports() {
  const { t } = useLang()
  const { showToast } = useToast()
  const [tab, setTab] = useState<ReportTab>('workshop')

  const handleExportPdf = () => {
    // Browsers generate the PDF via the print dialog ("Save as PDF").
    showToast('info', 'Export to PDF', 'Choose "Save as PDF" in the print dialog to download this report.')
    window.setTimeout(() => window.print(), 350)
  }

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'workshop', label: t('reports.tab.workshop') },
    { key: 'inventory', label: t('reports.tab.inventory') },
    { key: 'training', label: t('reports.tab.training') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {t('action.exportPdf')}
          </button>
        }
      />

      <div className="flex border-b border-slate-200">
        {tabs.map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t_.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t_.label}
          </button>
        ))}
      </div>

      {tab === 'workshop' && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('reports.kpi.avgTurnaround'), value: '12.4h', change: '↓ 0.8h vs last month', positive: true },
              { label: t('reports.kpi.reworkRate'), value: '3.2%', change: '↓ 0.5% vs last month', positive: true },
              { label: t('reports.kpi.totalLaborHours'), value: '312h', change: '↑ 24h vs last month', positive: false },
              { label: t('reports.kpi.jobsThisMonth'), value: '208', change: '↑ 18 vs last month', positive: true },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                <p className={`text-xs mt-1 font-medium ${kpi.positive ? 'text-green-600' : 'text-slate-500'}`}>{kpi.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jobs by Stage */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.jobsByStage')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={jobsByStage} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Turnaround Time Trend */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.turnaround')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={turnaroundData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} domain={[10, 22]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  <Line type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Labor Hours by Type */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.laborHours')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={laborHours} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="mechanical" fill="#2563EB" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="electrical" fill="#0284C7" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="body" fill="#64748B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bay Utilization */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.bayUtil')}</h3>
              <div className="flex flex-col gap-3 mt-2">
                {bayUtilization.map((b) => (
                  <div key={b.bay}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-700">{b.bay}</span>
                      <span className={`text-sm font-semibold ${b.pct >= 85 ? 'text-red-600' : b.pct >= 70 ? 'text-amber-600' : 'text-green-600'}`}>{b.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.pct >= 85 ? 'bg-red-500' : b.pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('reports.inv.kpi.accuracy'), value: '96.8%', positive: true },
              { label: t('reports.inv.kpi.stockouts'), value: '2', positive: false },
              { label: t('reports.inv.kpi.turnover'), value: '3.6x', positive: true },
              { label: t('reports.inv.kpi.leadTime'), value: '4.2 days', positive: true },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.inventoryTurnover')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={inventoryTurnover} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} domain={[2, 5]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.stockStatus')}</h3>
              <div className="flex items-center justify-between">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={[
                      { name: t('reports.inv.legend.healthy'), value: 5, color: '#16A34A' },
                      { name: t('reports.inv.legend.lowStock'), value: 2, color: '#D97706' },
                      { name: t('reports.inv.legend.outOfStock'), value: 1, color: '#DC2626' },
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                      {[{ color: '#16A34A' }, { color: '#D97706' }, { color: '#DC2626' }].map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {[
                    { label: t('reports.inv.legend.healthy'), color: '#16A34A', pct: '62%' },
                    { label: t('reports.inv.legend.lowStock'), color: '#D97706', pct: '25%' },
                    { label: t('reports.inv.legend.outOfStock'), color: '#DC2626', pct: '13%' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                      <span className="text-xs text-slate-600">{l.label}</span>
                      <span className="text-xs font-semibold text-slate-800 ms-auto">{l.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'training' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('reports.train.kpi.attendance'), value: '90.4%', positive: true },
              { label: t('reports.train.kpi.passRate'), value: '68%', positive: true },
              { label: t('reports.train.kpi.certs'), value: '24', positive: true },
              { label: t('reports.train.kpi.coverage'), value: '78%', positive: true },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.sessionAttendance')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} domain={[60, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  <Bar dataKey="rate" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">{t('reports.chart.assessmentResults')}</h3>
              <div className="flex items-center justify-between">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={passRateData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                      {passRateData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {passRateData.map((l) => (
                    <div key={l.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                      <span className="text-xs text-slate-600">{l.name}</span>
                      <span className="text-xs font-semibold text-slate-800 ms-auto">{l.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
