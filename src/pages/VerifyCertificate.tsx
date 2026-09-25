import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { LoadingState, ErrorState } from '../components/common/ApiStates'
import { trainingV3 } from '../api/v6/training'
import { useLang } from '../i18n/LanguageContext'

/**
 * Public certificate verification — reachable WITHOUT login.
 * Shows only the verification payload (number, status, holder initial,
 * course, dates). Never any student records.
 */
export default function VerifyCertificate() {
  const { t } = useLang()
  const { token } = useParams<{ token?: string }>()
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!token) {
      setState('idle')
      return
    }
    let cancelled = false
    setState('loading')
    setError(null)
    trainingV3.verifyCertificate(token).then(
      (res) => {
        if (cancelled) return
        setResult(res as unknown as Record<string, unknown>)
        setState('success')
      },
      (err) => {
        if (cancelled) return
        setError(err)
        setState('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [token])

  const status = result?.status as string | undefined

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto">
          <span className="text-white font-bold">W</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-4">{t('cert.verifyTitle')}</h1>
        <p className="text-xs text-slate-400 font-mono mt-1 break-all" dir="ltr">{token ?? '—'}</p>
        <div className="mt-6">
          {state === 'idle' && <p className="text-sm text-slate-500">{t('cert.openWithToken')}</p>}
          {state === 'loading' && <LoadingState label={t('cert.checking')} />}
          {state === 'error' && <ErrorState error={error} onRetry={() => window.location.reload()} title={t('cert.verifyTitle')} />}
          {state === 'success' && result && (
            <>
              <p className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${status === 'ISSUED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {status}
              </p>
              <div className="mt-4 text-start bg-slate-50 rounded-lg p-4 flex flex-col gap-1">
                {Object.entries(result).map(([k, v]) => (
                  <p key={k} className="text-xs font-mono break-all"><span className="text-slate-400">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                ))}
              </div>
            </>
          )}
        </div>
        <Link to="/">
          <Button variant="secondary" size="sm" className="mt-6">{t('cert.backToSignIn')}</Button>
        </Link>
      </div>
    </div>
  )
}
