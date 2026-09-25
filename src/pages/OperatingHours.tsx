import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { operatingHoursV3, type OperatingHours } from '../api/v3/workshop'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DayForm {
  weekday: number
  isClosed: boolean
  opensAt: string // HH:MM
  closesAt: string // HH:MM
}

function toHHMM(v?: string): string {
  if (!v) return ''
  return v.slice(0, 5)
}

function displayTime(v?: string): string {
  if (!v) return '—'
  return v.slice(0, 5)
}

function friendlyHoursError(err: unknown): string {
  if (err instanceof ApiError) {
    const codes = err.details?.map((d) => d.code).filter(Boolean) ?? []
    if (err.code === 'VERSION_CONFLICT') {
      return 'Someone else changed the operating hours — the latest version was reloaded. Review and save again.'
    }
    if (codes.includes('MISSING_WEEKDAY')) return 'All 7 weekdays must be present, each exactly once (MISSING_WEEKDAY).'
    if (codes.includes('DUPLICATE_WEEKDAY')) return 'Each weekday must appear exactly once (DUPLICATE_WEEKDAY).'
    if (codes.includes('WINDOW_REQUIRED')) return 'Open days need both opensAt and closesAt (WINDOW_REQUIRED).'
    if (codes.includes('WINDOW_INVALID')) return 'closesAt must be after opensAt (WINDOW_INVALID).'
  }
  return backendErrorMessage(err)
}

export default function OperatingHours() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()

  const canManage = hasPermission(PERMS.operatingHoursManage)

  const [record, setRecord] = useState<OperatingHours | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [editing, setEditing] = useState(false)
  const [days, setDays] = useState<DayForm[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await operatingHoursV3.get()
      setRecord(res)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = () => {
    if (!record) return
    const byWeekday = new Map((record.days ?? []).map((d) => [d.weekday, d]))
    setDays(
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
        const d = byWeekday.get(weekday)
        return {
          weekday,
          isClosed: d?.isClosed ?? false,
          opensAt: toHHMM(d?.opensAt),
          closesAt: toHHMM(d?.closesAt),
        }
      }),
    )
    setFormErrors({})
    setSaveError(null)
    setEditing(true)
  }

  const setDay = (weekday: number, patch: Partial<DayForm>) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
    setFormErrors((e) => ({ ...e, [weekday]: '' }))
    setSaveError(null)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    const seen = new Set<number>()
    for (const d of days) {
      if (seen.has(d.weekday)) next[d.weekday] = 'Each weekday must appear exactly once (DUPLICATE_WEEKDAY).'
      seen.add(d.weekday)
      if (!d.isClosed) {
        if (!d.opensAt || !d.closesAt) {
          next[d.weekday] = 'Open days need both opening and closing times (WINDOW_REQUIRED).'
        } else if (d.closesAt <= d.opensAt) {
          next[d.weekday] = 'Closing time must be after opening time (WINDOW_INVALID).'
        }
      }
    }
    for (let w = 0; w <= 6; w++) {
      if (!seen.has(w)) next[w] = 'All 7 weekdays must be present (MISSING_WEEKDAY).'
    }
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!record || !validate() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        version: record.version,
        days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
          const d = days.find((x) => x.weekday === weekday)
          if (!d || d.isClosed) return { weekday, isClosed: true as const }
          return { weekday, isClosed: false as const, opensAt: d.opensAt, closesAt: d.closesAt }
        }),
      }
      const updated = await operatingHoursV3.replace(payload)
      setRecord(updated)
      setEditing(false)
      showToast('success', 'Operating hours updated', `Version ${updated.version}`)
    } catch (err) {
      setSaveError(err)
      const friendly = friendlyHoursError(err)
      showToast('error', 'Save failed', err instanceof ApiError && err.requestId ? `${friendly} (requestId ${err.requestId})` : friendly)
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        try {
          const fresh = await operatingHoursV3.get()
          setRecord(fresh)
        } catch {
          /* keep the stale copy */
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const sortedDays = (record?.days ?? []).slice().sort((a, b) => a.weekday - b.weekday)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operating hours"
        subtitle={record ? `Workshop-wide schedule · version ${record.version}` : undefined}
        actions={
          canManage && status === 'success' && !editing ? (
            <Button variant="secondary" onClick={startEdit}>Edit hours</Button>
          ) : undefined
        }
      />

      {status === 'loading' && <LoadingState label="Loading operating hours…" />}
      {status === 'error' && <ErrorState error={error} onRetry={load} title="Failed to load operating hours" />}
      {status === 'success' && !record && (
        <EmptyState title="No operating hours found" hint="The workshop schedule has not been configured yet." />
      )}

      {status === 'success' && record && !editing && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Day</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedDays.map((d) => (
                <tr key={d.weekday} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-3 font-medium text-slate-900">{WEEKDAY_NAMES[d.weekday] ?? `Day ${d.weekday}`}</td>
                  <td className="px-6 py-3 text-slate-600" dir="ltr">
                    {d.isClosed ? '—' : `${displayTime(d.opensAt)} – ${displayTime(d.closesAt)}`}
                  </td>
                  <td className="px-6 py-3">
                    {d.isClosed ? <Badge variant="inactive" label="Closed" /> : <Badge variant="active" label="Open" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'success' && record && editing && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-4 md:px-6 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Edit all 7 days (version {record.version})</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Times are sent as HH:MM. Closed days need no times; open days need both, with closing after opening.
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {days.map((d) => (
              <div key={d.weekday} className="px-4 md:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <div className="sm:w-28 shrink-0">
                  <p className="text-sm font-medium text-slate-800">{WEEKDAY_NAMES[d.weekday]}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
                  <input
                    type="checkbox"
                    checked={d.isClosed}
                    onChange={(e) => setDay(d.weekday, { isClosed: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Closed
                </label>
                {!d.isClosed && (
                  <div className="grid grid-cols-2 gap-3 flex-1 sm:max-w-sm">
                    <Input
                      label="Opens at"
                      type="time"
                      value={d.opensAt}
                      onChange={(e) => setDay(d.weekday, { opensAt: e.target.value })}
                      required
                    />
                    <Input
                      label="Closes at"
                      type="time"
                      value={d.closesAt}
                      onChange={(e) => setDay(d.weekday, { closesAt: e.target.value })}
                      required
                    />
                  </div>
                )}
                {formErrors[d.weekday] && (
                  <p className="text-xs text-red-600 sm:ms-auto">{formErrors[d.weekday]}</p>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 md:px-6 py-4 border-t border-slate-100">
            {saveError ? <FieldErrors error={saveError} /> : null}
            <div className="flex items-center justify-end gap-3 mt-3">
              <Button variant="secondary" disabled={saving} onClick={() => setEditing(false)}>
                {t('action.cancel')}
              </Button>
              <Button disabled={saving} onClick={save}>
                {saving ? 'Saving…' : t('action.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
