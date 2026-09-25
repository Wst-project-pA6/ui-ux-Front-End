import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KPICard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { useLang } from '../i18n/LanguageContext'
import { useRole } from '../context/RoleContext'

function useExportToast() {
  const [visible, setVisible] = useState(false)
  const trigger = () => { setVisible(true); setTimeout(() => setVisible(false), 2500) }
  return { visible, trigger }
}

const pipelineStages = [
  { variant: 'received' as const, count: 12, color: 'bg-blue-500' },
  { variant: 'in-progress' as const, count: 24, color: 'bg-amber-500' },
  { variant: 'quality-check' as const, count: 7, color: 'bg-purple-500' },
  { variant: 'ready' as const, count: 9, color: 'bg-green-500' },
  { variant: 'delivered' as const, count: 156, color: 'bg-slate-400' },
]

const recentJobs = [
  { id: 'JC-2024-0912', customer: 'Mohammed Al-Rashid', vehicle: 'Toyota Camry 2022', tech: 'Khalid H.', status: 'in-progress' as const, priority: 'High', due: 'Today' },
  { id: 'JC-2024-0911', customer: 'Sarah Al-Anazi', vehicle: 'Honda Accord 2021', tech: 'Fahad A.', status: 'quality-check' as const, priority: 'Normal', due: 'Today' },
  { id: 'JC-2024-0910', customer: 'Rayan Omar', vehicle: 'BMW 520i 2023', tech: 'Ali M.', status: 'ready' as const, priority: 'Normal', due: 'Yesterday' },
  { id: 'JC-2024-0909', customer: 'Noura Al-Saud', vehicle: 'Hyundai Tucson 2022', tech: 'Khalid H.', status: 'received' as const, priority: 'Low', due: 'Tomorrow' },
  { id: 'JC-2024-0908', customer: 'Omar Al-Harthi', vehicle: 'Ford F-150 2020', tech: 'Fahad A.', status: 'in-progress' as const, priority: 'High', due: 'Today' },
]

const upcomingSessions = [
  { course: 'Engine Overhaul Basics', date: 'Today, 9:00 AM', mentor: 'Eng. Sami Al-Rashidi', students: 8, bay: 'Bay 2', status: 'ready' as const },
  { course: 'Brake System Inspection', date: 'Today, 2:00 PM', mentor: 'Eng. Fatima Hassan', students: 6, bay: 'Bay 4', status: 'in-progress' as const },
  { course: 'Electrical Diagnostics', date: 'Tomorrow, 10:00 AM', mentor: 'Eng. Waleed Khatib', students: 10, bay: 'Bay 1', status: 'received' as const },
]

const techUtilization = [
  { name: 'Khalid H.', jobs: 5, utilization: 92, specialty: 'Mechanical' },
  { name: 'Fahad A.', jobs: 4, utilization: 78, specialty: 'Electrical' },
  { name: 'Ali M.', jobs: 3, utilization: 65, specialty: 'Body' },
  { name: 'Saad R.', jobs: 3, utilization: 60, specialty: 'Mechanical' },
  { name: 'Nasser K.', jobs: 2, utilization: 40, specialty: 'Electrical' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useLang()
  const { canAccess } = useRole()
  const exportToast = useExportToast()

  const handleExport = () => {
    const header = 'ID,Customer,Vehicle,Technician,Status,Priority,Due'
    const rows = recentJobs.map((j) => `${j.id},${j.customer},${j.vehicle},${j.tech},${j.status},${j.priority},${j.due}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard-jobs.csv'
    a.click()
    URL.revokeObjectURL(url)
    exportToast.trigger()
  }

  const alerts = [
    { type: 'error' as const, title: t('dashboard.alerts.lowStock.title'), desc: t('dashboard.alerts.lowStock.desc'), action: t('dashboard.alerts.lowStock.action'), route: '/inventory' },
    { type: 'warning' as const, title: t('dashboard.alerts.pending.title'), desc: t('dashboard.alerts.pending.desc'), action: t('dashboard.alerts.pending.action'), route: '/job-cards?status=received' },
    { type: 'warning' as const, title: t('dashboard.alerts.conflict.title'), desc: t('dashboard.alerts.conflict.desc'), action: t('dashboard.alerts.conflict.action'), route: '/training' },
    { type: 'info' as const, title: t('dashboard.alerts.approval.title'), desc: t('dashboard.alerts.approval.desc'), action: t('dashboard.alerts.approval.action'), route: '/purchasing' },
  ]

  const dueLabel = (due: string) => {
    if (due === 'Today') return t('dashboard.recentJobs.today')
    if (due === 'Yesterday') return t('dashboard.recentJobs.yesterday')
    if (due === 'Tomorrow') return t('dashboard.recentJobs.tomorrow')
    return due
  }

  return (
    <div className="space-y-6">
      {/* Export toast */}
      {exportToast.visible && (
        <div className="fixed top-4 end-4 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          dashboard-jobs.csv downloaded
        </div>
      )}

      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('action.export')}
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title={t('dashboard.kpi.activeJobs')}
          value="52"
          change={t('dashboard.kpi.activeJobsChange')}
          changeType="neutral"
          subtitle={t('dashboard.kpi.activeJobsSub')}
          iconBg="bg-blue-50"
          icon={
            <svg width="18" height="18" className="text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <KPICard
          title={t('dashboard.kpi.readyDelivery')}
          value="9"
          change={t('dashboard.kpi.readyDeliveryChange')}
          changeType="positive"
          iconBg="bg-green-50"
          icon={
            <svg width="18" height="18" className="text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <KPICard
          title={t('dashboard.kpi.lowStock')}
          value="7"
          change={t('dashboard.kpi.lowStockChange')}
          changeType="negative"
          iconBg="bg-red-50"
          icon={
            <svg width="18" height="18" className="text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <KPICard
          title={t('dashboard.kpi.trainingSessions')}
          value="3"
          change={t('dashboard.kpi.trainingSessionsChange')}
          changeType="neutral"
          iconBg="bg-purple-50"
          icon={
            <svg width="18" height="18" className="text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          }
        />
      </div>

      {/* Job Pipeline + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">{t('dashboard.pipeline.title')}</h2>
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2">
            {pipelineStages.map((stage) => (
              <button
                key={stage.variant}
                type="button"
                className="flex-1 min-w-[100px] md:min-w-[120px] bg-slate-50 rounded-xl p-3 md:p-4 flex flex-col gap-2 cursor-pointer hover:bg-slate-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                onClick={() => navigate(`/job-cards?status=${stage.variant}`)}
              >
                <div className={`w-6 md:w-8 h-1.5 rounded-full ${stage.color}`} />
                <p className="text-xl md:text-2xl font-bold text-slate-900">{stage.count}</p>
                <Badge variant={stage.variant} />
              </button>
            ))}
          </div>

          {/* Total bar */}
          <div className="mt-4">
            <div className="flex rounded-full overflow-hidden h-2">
              {pipelineStages.map((stage, i) => {
                const total = pipelineStages.reduce((s, x) => s + x.count, 0)
                return (
                  <div
                    key={i}
                    style={{ width: `${(stage.count / total) * 100}%` }}
                    className={`${stage.color} transition-all`}
                  />
                )
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {t('dashboard.pipeline.total')}: {pipelineStages.reduce((s, x) => s + x.count, 0)} {t('dashboard.pipeline.jobs')}
            </p>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">{t('dashboard.alerts.title')}</h2>
          <div className="flex flex-col gap-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex flex-col gap-1 ${
                  alert.type === 'error'
                    ? 'bg-red-50 border-red-100'
                    : alert.type === 'warning'
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-blue-50 border-blue-100'
                }`}
              >
                <p className={`text-sm font-semibold ${
                  alert.type === 'error' ? 'text-red-800' : alert.type === 'warning' ? 'text-amber-800' : 'text-blue-800'
                }`}>{alert.title}</p>
                <p className={`text-xs ${
                  alert.type === 'error' ? 'text-red-600' : alert.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                }`}>{alert.desc}</p>
                {canAccess(alert.route.split('?')[0]) && (
                  <button
                    onClick={() => navigate(alert.route)}
                    className={`text-xs font-semibold self-start mt-1 ${
                      alert.type === 'error' ? 'text-red-700' : alert.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                    } hover:underline focus:outline-none focus:ring-1 focus:ring-current rounded`}
                  >
                    {alert.action} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Jobs + Technician Utilization */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">{t('dashboard.recentJobs.title')}</h2>
            <button
              onClick={() => navigate('/job-cards')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('action.viewAll')}
            </button>
          </div>
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-slate-50">
            {recentJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => navigate(`/job-cards/${job.id}`)}
                className="w-full text-left px-4 py-3 active:bg-slate-50 hover:bg-slate-50 transition-colors focus:outline-none focus:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-blue-600 font-mono text-xs font-semibold" dir="ltr">{job.id}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      job.priority === 'High' ? 'bg-red-50 text-red-700' :
                      job.priority === 'Low' ? 'bg-green-50 text-green-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{job.priority}</span>
                    <Badge variant={job.status} />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-800 leading-snug">{job.customer}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">{job.vehicle}</p>
                  <span className={`text-xs font-medium ${
                    job.due === 'Today' ? 'text-amber-600' : job.due === 'Yesterday' ? 'text-red-600' : 'text-slate-500'
                  }`}>{dueLabel(job.due)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{job.tech}</p>
              </button>
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.recentJobs.col.job')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.recentJobs.col.customerVehicle')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.recentJobs.col.technician')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.recentJobs.col.status')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.recentJobs.col.due')}</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/job-cards/${job.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/job-cards/${job.id}`) } }}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer focus:outline-none focus:bg-slate-100"
                  >
                    <td className="px-6 py-3 text-blue-600 font-mono text-xs font-medium" dir="ltr">{job.id}</td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800">{job.customer}</p>
                      <p className="text-xs text-slate-400">{job.vehicle}</p>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{job.tech}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        job.priority === 'High' ? 'bg-red-50 text-red-700' :
                        job.priority === 'Low' ? 'bg-green-50 text-green-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{job.priority}</span>
                    </td>
                    <td className="px-6 py-3"><Badge variant={job.status} /></td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium ${
                        job.due === 'Today' ? 'text-amber-600' : job.due === 'Yesterday' ? 'text-red-600' : 'text-slate-500'
                      }`}>{dueLabel(job.due)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Technician Utilization */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">{t('dashboard.techUtil.title')}</h2>
          </div>
          <div className="flex flex-col gap-4">
            {techUtilization.map((tech) => (
              <div key={tech.name}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{tech.name}</p>
                    <p className="text-xs text-slate-400">{tech.specialty} · {tech.jobs} {t('dashboard.techUtil.activeJobs')}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ${tech.utilization >= 80 ? 'text-red-600' : tech.utilization >= 60 ? 'text-amber-600' : 'text-green-600'}`}
                    title={tech.utilization >= 80 ? 'Near capacity — risk of overload' : tech.utilization >= 60 ? 'Moderate load' : 'Available capacity'}
                  >
                    {tech.utilization}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${tech.utilization >= 80 ? 'bg-red-500' : tech.utilization >= 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${tech.utilization}%` }}
                  />
                </div>
                {tech.utilization >= 80 && (
                  <p className="text-xs text-red-500 mt-0.5">Near capacity — risk of overload</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Available</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Near capacity</span>
          </div>
        </div>
      </div>

      {/* Upcoming Training Sessions */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{t('dashboard.trainingSessions.title')}</h2>
          {canAccess('/training') && (
            <button
              onClick={() => navigate('/training')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('action.viewCalendar')}
            </button>
          )}
        </div>
        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-slate-50">
          {upcomingSessions.map((session, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-slate-800 leading-snug">{session.course}</p>
                <Badge variant={session.status} />
              </div>
              <p className="text-xs text-slate-500">{session.date} · {session.bay}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400">{session.mentor}</p>
                <span className="text-xs text-slate-600 font-medium">{session.students} {t('dashboard.trainingSessions.students')}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.trainingSessions.col.course')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.trainingSessions.col.schedule')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.trainingSessions.col.mentor')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.trainingSessions.col.students')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.trainingSessions.col.bay')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.trainingSessions.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.map((session, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{session.course}</td>
                  <td className="px-6 py-3 text-slate-600">{session.date}</td>
                  <td className="px-6 py-3 text-slate-600">{session.mentor}</td>
                  <td className="px-6 py-3">
                    <span className="text-slate-900 font-semibold">{session.students}</span>
                    <span className="text-slate-400 text-xs"> {t('dashboard.trainingSessions.students')}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{session.bay}</td>
                  <td className="px-6 py-3"><Badge variant={session.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
