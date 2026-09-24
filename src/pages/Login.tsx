import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { ROLE_CONFIGS } from '../context/RoleContext'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/http'

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang, setLang, t } = useLang()
  const { signIn, sessionMessage } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [pwErr, setPwErr] = useState('')

  // Clear password on unmount
  useEffect(() => () => { setPassword('') }, [])

  const validateEmail = (v: string) => {
    if (!v) return t('auth.error.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t('auth.error.invalidEmail')
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const eErr = validateEmail(email)
    const pErr = !password ? t('auth.error.passwordRequired') : ''
    setEmailErr(eErr)
    setPwErr(pErr)
    if (eErr || pErr) return

    setLoading(true)
    setError('')
    try {
      // Contract: POST /auth/login (public, rate-limited). 401
      // INVALID_CREDENTIALS for both unknown user and wrong password.
      const { mustChangePassword, role } = await signIn(email.trim(), password)
      setPassword('')
      if (mustChangePassword) {
        // Backend-gated accounts (new/reset) must change password first.
        navigate('/change-password', { replace: true })
        return
      }
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? ROLE_CONFIGS[role].homeRoute, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError(t('auth.error.wrongCredentials'))
          return
        }
        if (err.status === 429) {
          const secs = err.retryAfter ?? '?'
          setError(t('auth.error.rateLimited').replace('{seconds}', String(secs)))
          return
        }
        if (err.status === 400) {
          setError(err.message)
          return
        }
      }
      setError(err instanceof Error ? err.message : t('auth.error.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col w-[52%] bg-slate-900 relative overflow-hidden p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/10" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-blue-600/5" />
          <div className="absolute -bottom-20 start-1/4 w-64 h-64 rounded-full bg-blue-600/8" />
          <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 600 600" fill="none">
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 55} y1="0" x2={i * 55} y2="600" stroke="white" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 55} x2="600" y2={i * 55} stroke="white" strokeWidth="0.5" />
            ))}
          </svg>
        </div>

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <div>
              <span className="text-white font-bold text-xl">WST</span>
              <p className="text-slate-400 text-xs">{t('login.subtitle')}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-5xl font-bold text-white leading-tight">
              {t('login.headline')}
              <br />
              <span className="text-blue-400">{t('login.headlineAnd')}</span>
            </h1>
            <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-md">{t('login.tagline')}</p>

            <div className="mt-10 flex flex-col gap-4">
              {[
                { icon: '🔧', labelKey: 'login.feat1Label' as const, descKey: 'login.feat1Desc' as const },
                { icon: '📦', labelKey: 'login.feat2Label' as const, descKey: 'login.feat2Desc' as const },
                { icon: '🎓', labelKey: 'login.feat3Label' as const, descKey: 'login.feat3Desc' as const },
              ].map((f) => (
                <div key={f.labelKey} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t(f.labelKey)}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{t(f.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-600 text-xs">{t('login.copyright')}</p>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-slate-900 font-bold">{t('login.mobileTitle')}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{t('login.heading')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('login.subheading')}</p>
          </div>

          {sessionMessage && (
            <div role="status" className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
              {sessionMessage === 'auth.sessionEnded' || sessionMessage === 'auth.passwordChangedLogin'
                ? t(sessionMessage as never)
                : sessionMessage}
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              label={t('login.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr('') }}
              onBlur={() => setEmailErr(validateEmail(email))}
              placeholder="you@wst.sa"
              autoComplete="email"
              required
              error={emailErr}
              prefixIcon={<MailIcon />}
            />

            <Input
              label={t('login.passwordLabel')}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (pwErr) setPwErr('') }}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              error={pwErr}
              prefixIcon={<LockIcon />}
              suffixIcon={
                <button
                  type="button"
                  className="pointer-events-auto text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? t('auth.password.hide') : t('auth.password.show')}
                >
                  <EyeIcon open={showPw} />
                </button>
              }
            />

            <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
              {t('login.signIn')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t('login.needAccount')}
          </p>

          <div className="mt-6 flex items-center justify-center gap-1 border-t border-slate-200 pt-6">
            <span className="text-xs text-slate-400 me-2">{t('login.languageLabel')}</span>
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  lang === l ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>

          {/* Demo hint */}
          <p className="mt-4 text-center text-xs text-slate-400">
            {t('auth.demoHint')}
          </p>
        </div>
      </div>
    </div>
  )
}
