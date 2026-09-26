import { useCallback, useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { trainingV3, type Certificate } from '../api/v6/training'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState } from '../components/common/ApiStates'

const PAGE_SIZE = 20

export default function Certificates() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canIssue = hasPermission(PERMS.certificatesIssue)
  const canRevoke = hasPermission(PERMS.certificatesRevoke)

  const [items, setItems] = useState<Certificate[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [token, setToken] = useState('')
  const [verifyResult, setVerifyResult] = useState<unknown>(null)
  const [verifyError, setVerifyError] = useState<unknown>(null)
  const [verifying, setVerifying] = useState(false)

  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ studentId: '', courseId: '' })
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<unknown>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.certificates({
        page, pageSize: PAGE_SIZE,
        status: status || undefined,
        // certificateNumber search is not a contract filter; client search would
        // fake it — debouncedQ narrows only via refetch-free display filter below.
      })
      let list = res.items
      if (debouncedQ) {
        const needle = debouncedQ.toLowerCase()
        list = list.filter((c) =>
          ((c as unknown as { certificateNumber?: string }).certificateNumber ?? '').toLowerCase().includes(needle),
        )
      }
      setItems(list)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, status, debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  const verify = async () => {
    if (!token.trim() || verifying) return
    setVerifying(true)
    setVerifyResult(null)
    setVerifyError(null)
    try {
      const res = await trainingV3.verifyCertificate(token.trim())
      setVerifyResult(res)
    } catch (err) {
      setVerifyError(err)
    } finally {
      setVerifying(false)
    }
  }

  const revoke = async () => {
    if (!revokeId || revokeReason.trim().length < 3) {
      showToast('error', 'Reason required', 'Revocation needs a reason (3+ characters).')
      return
    }
    try {
      await trainingV3.revokeCertificate(revokeId, revokeReason.trim())
      showToast('success', 'Certificate revoked', '')
      setRevokeId(null)
      setRevokeReason('')
      load()
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    }
  }

  const issue = async () => {
    if (issuing) return
    if (!issueForm.studentId.trim() || !issueForm.courseId.trim()) {
      setIssueError(new ApiError({ message: 'Student ID and course ID are required (UUIDs).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setIssuing(true)
    setIssueError(null)
    try {
      const cert = await trainingV3.issueCertificate(issueForm.studentId.trim(), issueForm.courseId.trim())
      showToast('success', 'Certificate issued', (cert as unknown as { certificateNumber?: string }).certificateNumber ?? '')
      setIssueOpen(false)
      setIssueForm({ studentId: '', courseId: '' })
      load()
    } catch (err) {
      setIssueError(err)
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('cert.title')}
        subtitle={`${meta.totalItems} · ${t('training.certs.title')}`}
        actions={canIssue
          ? <Button size="sm" onClick={() => { setIssueError(null); setIssueOpen(true) }}>{t('training.certs.issue')}</Button>
          : <span title="Requires certificates.issue permission (Training Supervisor role)"><Button size="sm" disabled>{t('training.certs.issue')}</Button></span>}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold">{t('cert.publicVerify')}</p>
        <p className="text-xs text-slate-400 mt-0.5">{t('cert.publicVerifyHint')}</p>
        <div className="flex gap-2 mt-3">
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder={t('training.certs.tokenOnce')} dir="ltr"
            className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm font-mono" />
          <Button size="sm" disabled={verifying} onClick={verify}>{verifying ? t('cert.checking') : t('cert.verify')}</Button>
        </div>
        {verifyResult !== null && (
          <div className="mt-3 bg-slate-50 rounded-lg p-3 text-sm">
            {Object.entries(verifyResult as Record<string, unknown>).map(([k, v]) => (
              <p key={k} className="text-xs font-mono break-all">{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
            ))}
          </div>
        )}
        {verifyError ? (
          <div className="mt-3"><ErrorState error={verifyError} onRetry={verify} title="Verification failed" /></div>
        ) : null}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex-1 min-w-[200px]"><SearchBar value={q} onChange={setQ} placeholder={t('f.search')} /></div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">{t('f.allStatuses')}</option>
            <option value="ISSUED">{t('training.certs.issued')}</option>
            <option value="REVOKED">{t('training.certs.revoked')}</option>
          </select>
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} total</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.certs.noCertificates')} /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="divide-y divide-slate-50">
              {items.map((c) => {
                const r = c as unknown as { certificateNumber?: string; status?: string; issuedAt?: string }
                return (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-mono text-sm" dir="ltr">{r.certificateNumber}</p>
                      <p className="text-xs text-slate-400">{r.issuedAt}</p>
                    </div>
                    <Badge variant={badgeVariantFor(r.status ?? '')} />
                    {canRevoke && r.status === 'ISSUED' && (
                      <Button variant="secondary" size="sm" onClick={() => { setRevokeId(c.id); setRevokeReason('') }}>{t('training.certs.revoke')}</Button>
                    )}
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

      <Modal open={revokeId !== null} onClose={() => setRevokeId(null)} title={t('training.certs.revokeTitle')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setRevokeId(null)}>{t('f.cancel')}</Button><Button onClick={revoke}>{t('training.certs.revoke')}</Button></>}>
        <Textarea label={t('f.reasonRequired')} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} required />
      </Modal>

      <Modal open={issueOpen} onClose={() => !issuing && setIssueOpen(false)} title={t('training.certs.issueTitle')} size="md"
        footer={<><Button variant="secondary" disabled={issuing} onClick={() => setIssueOpen(false)}>{t('f.cancel')}</Button><Button disabled={issuing} onClick={issue}>{issuing ? t('f.saving') : t('training.certs.issue')}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('training.certs.studentId')} value={issueForm.studentId} onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })} placeholder="Student UUID" required />
          <Input label={t('training.certs.courseId')} value={issueForm.courseId} onChange={(e) => setIssueForm({ ...issueForm, courseId: e.target.value })} placeholder="Course UUID" required />
          <p className="text-xs text-slate-400">{t('training.certs.issueHint')}</p>
          {issueError ? (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {backendErrorMessage(issueError)}
              {issueError instanceof ApiError && issueError.code === 'CERTIFICATE_NOT_ELIGIBLE' ? ` — ${t('training.certs.notEligible')}` : ''}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
