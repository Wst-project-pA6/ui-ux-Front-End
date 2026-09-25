import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { trainingV3, type Assessment } from '../api/v6/training'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

const PAGE_SIZE = 20

/**
 * Assessments — mentors record/correct (training.assess); the supervisor
 * signs off or returns (training.signoff). A mentor can never sign off
 * their own assessment: sign-off requires the supervisor role server-side.
 */
export default function Assessments() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { me, hasPermission } = useAuth()
  const canAssess = hasPermission(PERMS.trainingAssess)
  const canSignoff = hasPermission(PERMS.trainingSignoff)

  const [items, setItems] = useState<Assessment[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [signOffStatus, setSignOffStatus] = useState('')
  const [result, setResult] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ sessionId: '', studentId: '', taskId: '', result: 'PASS', timeOnTaskMinutes: '', mentorNote: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const [correcting, setCorrecting] = useState<Assessment | null>(null)
  const [correctForm, setCorrectForm] = useState({ result: 'PASS', timeOnTaskMinutes: '', mentorNote: '', changeReason: '' })

  const [signing, setSigning] = useState<Assessment | null>(null)
  const [decision, setDecision] = useState<'SIGNED_OFF' | 'RETURNED'>('SIGNED_OFF')
  const [signNote, setSignNote] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.assessments({
        page, pageSize: PAGE_SIZE,
        signOffStatus: signOffStatus || undefined,
        result: result || undefined,
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
  }, [page, signOffStatus, result])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (saving) return
    if (!form.sessionId.trim() || !form.studentId.trim() || !form.taskId.trim() || !form.timeOnTaskMinutes) {
      setSaveError(new ApiError({ message: 'Session, student, task and time on task are required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await trainingV3.createAssessment({
        sessionId: form.sessionId.trim(),
        studentId: form.studentId.trim(),
        taskId: form.taskId.trim(),
        result: form.result as 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT',
        timeOnTaskMinutes: Number(form.timeOnTaskMinutes),
        ...(form.mentorNote ? { mentorNote: form.mentorNote } : {}),
      })
      showToast('success', 'Assessment recorded', '')
      setCreateOpen(false)
      setForm({ sessionId: '', studentId: '', taskId: '', result: 'PASS', timeOnTaskMinutes: '', mentorNote: '' })
      load()
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  const correct = async () => {
    if (!correcting || saving) return
    if (!correctForm.changeReason.trim()) {
      showToast('error', 'Reason required', 'Corrections need a change reason.')
      return
    }
    setSaving(true)
    try {
      await trainingV3.updateAssessment(correcting.id, {
        version: (correcting as unknown as { version?: number }).version ?? 0,
        result: correctForm.result as 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT',
        ...(correctForm.timeOnTaskMinutes ? { timeOnTaskMinutes: Number(correctForm.timeOnTaskMinutes) } : {}),
        ...(correctForm.mentorNote ? { mentorNote: correctForm.mentorNote } : {}),
        changeReason: correctForm.changeReason.trim(),
      })
      showToast('success', 'Assessment corrected', '')
      setCorrecting(null)
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const sign = async () => {
    if (!signing) return
    // Client-side SOD hint: a supervisor who assessed cannot sign off.
    // The backend enforces this regardless.
    const assessedBy = (signing as unknown as { assessedBy?: string }).assessedBy
    if (decision === 'SIGNED_OFF' && me?.id && assessedBy === me.id) {
      showToast('error', 'Not allowed', 'You cannot sign off your own assessment.')
      return
    }
    try {
      await trainingV3.signOff(signing.id, decision, signNote.trim() || undefined)
      showToast('success', decision === 'SIGNED_OFF' ? 'Signed off' : 'Returned for correction', '')
      setSigning(null)
      setSignNote('')
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('assess.title')}
        subtitle={`${meta.totalItems}`}
        actions={canAssess ? <Button onClick={() => { setSaveError(null); setCreateOpen(true) }}>{t('assess.record')}</Button> : undefined}
      />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <select value={signOffStatus} onChange={(e) => { setSignOffStatus(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">{t('assess.allSignoff')}</option>
            <option value="PENDING">Pending</option>
            <option value="SIGNED_OFF">Signed off</option>
            <option value="RETURNED">Returned</option>
          </select>
          <select value={result} onChange={(e) => { setResult(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">{t('assess.allResults')}</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
            <option value="NEEDS_IMPROVEMENT">Needs improvement</option>
          </select>
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} total</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('assess.noItems')} /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="divide-y divide-slate-50">
              {items.map((a) => {
                const r = a as unknown as { result?: string; signOffStatus?: string; timeOnTaskMinutes?: number; mentorNote?: string }
                return (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariantFor(r.result ?? '')} />
                      <Badge variant={badgeVariantFor(r.signOffStatus ?? '')} />
                      <span className="text-xs text-slate-400 ms-auto">{r.timeOnTaskMinutes} min</span>
                      {canAssess && (
                        <Button variant="secondary" size="sm" onClick={() => {
                          setCorrecting(a)
                          setCorrectForm({ result: r.result ?? 'PASS', timeOnTaskMinutes: String(r.timeOnTaskMinutes ?? ''), mentorNote: r.mentorNote ?? '', changeReason: '' })
                        }}>{t('assess.correct')}</Button>
                      )}
                      {canSignoff && r.signOffStatus === 'PENDING' && (
                        <Button variant="secondary" size="sm" onClick={() => { setSigning(a); setDecision('SIGNED_OFF'); setSignNote('') }}>{t('assess.signoff')}</Button>
                      )}
                    </div>
                    {r.mentorNote && <p className="text-xs text-slate-500 mt-1">{r.mentorNote}</p>}
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

      <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title={t('assess.recordTitle')} size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={saving} onClick={create}>{saving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('assess.sessionId')} value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} required />
          <Input label={t('assess.studentId')} value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
          <Input label={t('assess.taskId')} value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('assess.result')} value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}
              options={['PASS', 'FAIL', 'NEEDS_IMPROVEMENT'].map((v) => ({ value: v, label: v }))} />
            <Input label={t('assess.timeOnTask')} type="number" value={form.timeOnTaskMinutes} onChange={(e) => setForm({ ...form, timeOnTaskMinutes: e.target.value })} required />
          </div>
          <Textarea label={t('assess.mentorNote')} value={form.mentorNote} onChange={(e) => setForm({ ...form, mentorNote: e.target.value })} rows={2} />
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      <Modal open={correcting !== null} onClose={() => setCorrecting(null)} title={t('assess.correctTitle')} size="md"
        footer={<><Button variant="secondary" onClick={() => setCorrecting(null)}>Cancel</Button><Button disabled={saving} onClick={correct}>{saving ? 'Saving…' : 'Save correction'}</Button></>}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('assess.result')} value={correctForm.result} onChange={(e) => setCorrectForm({ ...correctForm, result: e.target.value })}
              options={['PASS', 'FAIL', 'NEEDS_IMPROVEMENT'].map((v) => ({ value: v, label: v }))} />
            <Input label="Time on task (min)" type="number" value={correctForm.timeOnTaskMinutes} onChange={(e) => setCorrectForm({ ...correctForm, timeOnTaskMinutes: e.target.value })} />
          </div>
          <Textarea label="Mentor note" value={correctForm.mentorNote} onChange={(e) => setCorrectForm({ ...correctForm, mentorNote: e.target.value })} rows={2} />
          <Input label={t('assess.changeReason')} value={correctForm.changeReason} onChange={(e) => setCorrectForm({ ...correctForm, changeReason: e.target.value })} required />
        </div>
      </Modal>

      <Modal open={signing !== null} onClose={() => setSigning(null)} title={t('assess.signoffTitle')} size="md"
        footer={<><Button variant="secondary" onClick={() => setSigning(null)}>Cancel</Button><Button onClick={sign}>Submit</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label={t('assess.decision')} value={decision} onChange={(e) => setDecision(e.target.value as 'SIGNED_OFF' | 'RETURNED')}
            options={[{ value: 'SIGNED_OFF', label: 'Sign off' }, { value: 'RETURNED', label: 'Return for correction' }]} />
          <Textarea label={t('assess.note')} value={signNote} onChange={(e) => setSignNote(e.target.value)} rows={2} />
          <p className="text-xs text-slate-400">You cannot sign off an assessment you recorded yourself.</p>
        </div>
      </Modal>
    </div>
  )
}
