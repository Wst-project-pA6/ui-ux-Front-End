import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { predictionsV3, type Prediction } from '../api/v6/insights'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const PAGE_SIZE = 20

/**
 * AI suggestions — every item is advisory-only ("Suggestion — you decide").
 * Nothing happens automatically; accept / override / dismiss are explicit.
 */
export default function AIInsights() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canDecide = hasPermission(PERMS.predictionsReorderDecide) || hasPermission(PERMS.predictionsRiskDecide)
  const isAdmin = hasPermission(PERMS.configManage)

  const [items, setItems] = useState<Prediction[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [detail, setDetail] = useState<Prediction | null>(null)
  const [decideOpen, setDecideOpen] = useState(false)
  const [decision, setDecision] = useState<'ACCEPTED' | 'OVERRIDDEN' | 'DISMISSED'>('ACCEPTED')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideQuantity, setOverrideQuantity] = useState('')
  const [note, setNote] = useState('')
  const [decideError, setDecideError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const [runOpen, setRunOpen] = useState(false)
  const [runForm, setRunForm] = useState({ type: 'REORDER_SUGGESTION', storeId: '', courseId: '' })

  const [settings, setSettings] = useState<{ version?: number; reorderLookbackWeeks?: number; mlServiceEnabled?: boolean; baselineVersion?: string } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ reorderLookbackWeeks: '', mlServiceEnabled: true })

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await predictionsV3.list({
        page, pageSize: PAGE_SIZE,
        type: type || undefined,
        status: status || undefined,
      })
      setItems(res.items)
      setMeta({
        page: res.page.page ?? page,
        pageSize: res.page.pageSize ?? PAGE_SIZE,
        totalItems: res.page.totalItems ?? res.items.length,
        totalPages: res.page.totalPages ?? 1,
      })
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, type, status])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (isAdmin) {
      predictionsV3.settings().then(
        (s) => setSettings(s as unknown as { version?: number; reorderLookbackWeeks?: number; mlServiceEnabled?: boolean; baselineVersion?: string }),
        () => {},
      )
    }
  }, [isAdmin])

  const openDetail = async (id: string) => {
    try {
      const res = await predictionsV3.get(id)
      setDetail(res)
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const decide = async () => {
    if (!detail || busy) return
    if (decision === 'OVERRIDDEN' && overrideReason.trim().length < 3) {
      setDecideError(new ApiError({ message: 'Overriding needs a reason (3+ characters).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setBusy(true)
    setDecideError(null)
    try {
      const updated = await predictionsV3.decide(detail.id, {
        decision,
        ...(decision === 'OVERRIDDEN' ? { overrideReason: overrideReason.trim() } : {}),
        ...(overrideQuantity ? { overrideQuantity: Number(overrideQuantity) } : {}),
        ...(note ? { note } : {}),
      })
      setDetail(updated)
      setDecideOpen(false)
      showToast('success', `Prediction ${decision}`, '')
      load()
    } catch (err) {
      setDecideError(err)
    } finally {
      setBusy(false)
    }
  }

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await predictionsV3.run({
        type: runForm.type,
        ...(runForm.storeId ? { storeId: runForm.storeId } : {}),
        ...(runForm.courseId ? { courseId: runForm.courseId } : {}),
      } as never)
      showToast('success', 'Prediction run finished', `Generated ${(res as unknown as { generatedCount?: number }).generatedCount ?? 0} items.`)
      setRunOpen(false)
      load()
    } catch (err) {
      showToast('error', 'Run failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async () => {
    if (!settings || settings.version == null || busy) return
    const weeks = Number(settingsForm.reorderLookbackWeeks)
    if (!Number.isInteger(weeks) || weeks < 1) {
      showToast('error', 'Invalid value', 'Lookback weeks must be a whole number ≥ 1.')
      return
    }
    setBusy(true)
    try {
      const updated = await predictionsV3.updateSettings({
        version: settings.version,
        reorderLookbackWeeks: weeks,
        mlServiceEnabled: settingsForm.mlServiceEnabled,
      })
      setSettings(updated as unknown as { version?: number; reorderLookbackWeeks?: number; mlServiceEnabled?: boolean; baselineVersion?: string })
      setSettingsOpen(false)
      showToast('success', 'Prediction settings updated', '')
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ai.titleFinal')}
        subtitle={t('ai.subtitleFinal')}
        actions={
          canDecide ? <Button onClick={() => setRunOpen(true)}>{t('ai.run')}</Button> : undefined
        }
      />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">{t('ai.allTypes')}</option>
            <option value="REORDER_SUGGESTION">{t('ai.reorder')}</option>
            <option value="TRAINING_RISK">{t('ai.risk')}</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">{t('ai.allStatuses')}</option>
            <option value="ACTIVE">Active</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="OVERRIDDEN">Overridden</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="SUPERSEDED">Superseded</option>
          </select>
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} predictions</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('ai.noPredictions')} hint={t('ai.noPredictionsHint')} /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="divide-y divide-slate-50">
              {items.map((p) => {
                const r = p as unknown as { type?: string; status?: string; generatedAt?: string }
                return (
                  <div key={p.id} onClick={() => openDetail(p.id)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">{t('ai.suggestionBadge')}</span>
                      <Badge variant={badgeVariantFor(r.type ?? '')} />
                      <Badge variant={badgeVariantFor(r.status ?? '')} />
                      <span className="text-xs text-slate-400 ms-auto">{r.generatedAt}</span>
                    </div>
                  </div>
                )
              })}
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

      {isAdmin && settings && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t('ai.settingsTitle')}</p>
            <Button variant="secondary" size="sm" onClick={() => {
              setSettingsForm({ reorderLookbackWeeks: String(settings.reorderLookbackWeeks ?? ''), mlServiceEnabled: settings.mlServiceEnabled ?? true })
              setSettingsOpen(true)
            }}>Edit</Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Lookback {settings.reorderLookbackWeeks} weeks · ML {settings.mlServiceEnabled ? 'enabled' : 'disabled'} · {settings.baselineVersion}</p>
        </div>
      )}

      {detail && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <p className="font-mono text-sm">Prediction {detail.id.slice(0, 8)}…</p>
            <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {Object.entries(detail as unknown as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400 font-mono">{k}</p>
                <p className="text-xs font-mono break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
              </div>
            ))}
          </div>
          {canDecide && (
            <Button size="sm" onClick={() => { setDecision('ACCEPTED'); setOverrideReason(''); setOverrideQuantity(''); setNote(''); setDecideError(null); setDecideOpen(true) }} className="mt-3">
              {t('ai.decide')}
            </Button>
          )}
        </div>
      )}

      <Modal open={decideOpen} onClose={() => setDecideOpen(false)} title={t('ai.decide')} size="md"
        footer={<><Button variant="secondary" onClick={() => setDecideOpen(false)}>Cancel</Button><Button disabled={busy} onClick={decide}>{busy ? 'Saving…' : 'Submit decision'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label={t('ai.decision')} value={decision} onChange={(e) => setDecision(e.target.value as 'ACCEPTED' | 'OVERRIDDEN' | 'DISMISSED')}
            options={[{ value: 'ACCEPTED', label: 'Accept' }, { value: 'OVERRIDDEN', label: 'Override' }, { value: 'DISMISSED', label: 'Dismiss' }]} />
          {decision === 'OVERRIDDEN' && (
            <>
              <Textarea label={t('ai.overrideReason')} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={3} required />
              <Input label={t('ai.overrideQty')} type="number" value={overrideQuantity} onChange={(e) => setOverrideQuantity(e.target.value)} />
            </>
          )}
          <Input label={t('f.note')} value={note} onChange={(e) => setNote(e.target.value)} />
          {decideError ? <FieldErrors error={decideError} /> : null}
        </div>
      </Modal>

      <Modal open={runOpen} onClose={() => setRunOpen(false)} title={t('ai.run')} size="md"
        footer={<><Button variant="secondary" onClick={() => setRunOpen(false)}>Cancel</Button><Button disabled={busy} onClick={run}>{busy ? t('ai.running') : t('ai.run')}</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label={t('ai.type')} value={runForm.type} onChange={(e) => setRunForm({ ...runForm, type: e.target.value })}
            options={[{ value: 'REORDER_SUGGESTION', label: 'Reorder suggestion' }, { value: 'TRAINING_RISK', label: 'Training risk' }]} />
          <Input label={t('ai.storeOnly')} value={runForm.storeId} onChange={(e) => setRunForm({ ...runForm, storeId: e.target.value })} />
          <Input label={t('ai.courseOnly')} value={runForm.courseId} onChange={(e) => setRunForm({ ...runForm, courseId: e.target.value })} />
        </div>
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('ai.settingsTitle')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button><Button disabled={busy} onClick={saveSettings}>{busy ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('ai.lookback')} type="number" value={settingsForm.reorderLookbackWeeks} onChange={(e) => setSettingsForm({ ...settingsForm, reorderLookbackWeeks: e.target.value })} required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settingsForm.mlServiceEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, mlServiceEnabled: e.target.checked })} />
            ML service enabled
          </label>
        </div>
      </Modal>
    </div>
  )
}
