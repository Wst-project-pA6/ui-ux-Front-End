import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { dashboardsV3, type DashboardData, type DashboardFilters } from '../api/v6/insights'
import { PERMS, formatMoney, backendErrorMessage } from '../api/v3/types'
import { LoadingState, EmptyState, ErrorState } from '../components/common/ApiStates'

type DashKey = 'workshop' | 'inventoryFinance' | 'training' | 'aiData'

function metricDisplay(unit: string | undefined, value: string, currency?: string): string {
  if (unit === 'MONEY') return formatMoney({ amount: value, currency: currency ?? 'EGP' } as never)
  if (unit === 'PERCENT') return `${value}%`
  if (unit === 'HOURS') return `${value} h`
  if (unit === 'DAYS') return `${value} d`
  return value
}

export default function Dashboard() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const available: { key: DashKey; label: string; perm: string }[] = (
    [
      { key: 'workshop', label: t('dash.workshop'), perm: PERMS.dashboardsWorkshop },
      { key: 'inventoryFinance', label: t('dash.inventoryFinance'), perm: PERMS.dashboardsInventoryFinance },
      { key: 'training', label: t('dash.training'), perm: PERMS.dashboardsTraining },
      { key: 'aiData', label: t('dash.aiData'), perm: PERMS.dashboardsAiData },
    ] as { key: DashKey; label: string; perm: string }[]
  ).filter((d) => hasPermission(d.perm))

  const [active, setActive] = useState<DashKey>(available[0]?.key ?? 'workshop')
  const [filters, setFilters] = useState<DashboardFilters>({})
  const [data, setData] = useState<DashboardData | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const fn = {
        workshop: dashboardsV3.workshop,
        inventoryFinance: dashboardsV3.inventoryFinance,
        training: dashboardsV3.training,
        aiData: dashboardsV3.aiData,
      }[active]
      const res = await fn(filters)
      setData(res)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [active, filters])

  useEffect(() => {
    if (available.length > 0) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (available.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('dash.title')} subtitle={t('dash.noAccess')} />
        <EmptyState title={t('dash.noAccess')} hint={t('dash.noAccessHint')} />
      </div>
    )
  }

  const applyFilters = () => load()

  return (
    <div className="space-y-6">
      <PageHeader title={t('dash.title')} subtitle={data ? `${t('dash.title')} · ${data.dataAsOf}` : t('dash.title')} />
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {available.map((d) => (
          <button
            key={d.key}
            onClick={() => setActive(d.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap ${active === d.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input label={t('dash.from')} type="date" value={filters.from ?? ''} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))} />
          <Input label={t('dash.to')} type="date" value={filters.to ?? ''} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))} />
          <Input label={t('f.selectStore')} value={filters.storeId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, storeId: e.target.value || undefined }))} />
          <Input label={t('f.selectCourse')} value={filters.courseId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value || undefined }))} />
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={applyFilters}>{t('dash.applyFilters')}</Button>
        </div>
      </div>

      {state === 'loading' && <LoadingState label={t('dash.loading')} />}
      {state === 'error' && (
        <ErrorState
          error={error}
          onRetry={load}
          title={t('dash.title')}
        />
      )}
      {state === 'success' && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(data.metrics ?? []).map((m) => (
              <div key={m.key} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-500 font-medium">{m.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metricDisplay(m.unit, m.value, m.currencyCode)}</p>
                <p className="text-xs text-slate-400 mt-1">{m.recordCount} records</p>
                {(m.breakdown ?? []).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                    {(m.breakdown ?? []).slice(0, 5).map((b, i) => (
                      <p key={i} className="text-xs text-slate-500">
                        {b.label}: <b>{metricDisplay(m.unit, b.value, m.currencyCode)}</b>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {(data.metrics ?? []).length === 0 && <EmptyState title={t('dash.noMetrics')} hint={t('dash.noMetricsHint')} />}
          <p className="text-xs text-slate-400">
            Generated {data.generatedAt} · fingerprint <span className="font-mono">{data.filterFingerprint}</span>
            <Button
              variant="secondary"
              size="sm"
              className="ms-3"
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText(data.filterFingerprint)
                  showToast('success', 'Fingerprint copied', 'Use it to verify an export matches these filters.')
                } catch {
                  showToast('error', 'Copy failed', backendErrorMessage(new Error('clipboard unavailable')))
                }
              }}
            >
              {t('dash.copyFingerprint')}
            </Button>
          </p>
        </>
      )}
    </div>
  )
}
