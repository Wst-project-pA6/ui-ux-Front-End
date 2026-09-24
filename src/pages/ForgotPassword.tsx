import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { findUserByEmail, updatePassword, generateTempPassword } from '../utils/demoAuth'

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

export default function ForgotPassword() {
  const { lang, setLang, t } = useLang()

  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [demoPassword, setDemoPassword] = useState<string | null>(null)

  const validateEmail = (v: string) => {
    if (!v) return t('auth.error.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t('auth.error.invalidEmail')
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateEmail(email)
    setEmailErr(err)
    if (err) return

    setLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    setLoading(false)

    // Contract truth: no password-reset endpoint exists. Only authenticated
    // POST /auth/change-password is defined. This demo stand-in stays
    // clearly labeled and never claims to call the API.
    const user = findUserByEmail(email)
    if (user) {
      const tmp = generateTempPassword()
      updatePassword(email, tmp)
      setDemoPassword(tmp)
    } else {
      setDemoPassword(null)
    }

    setSubmitted(true)
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
              {t('forgot.brandHeadline')}
              <br />
              <span className="text-blue-400">{t('forgot.brandHeadlineAnd')}</span>
            </h1>
            <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-md">
              {t('forgot.brandTagline')}
            </p>
          </div>
          <p className="text-slate-600 text-xs">{t('login.copyright')}</p>
        </div>
      </div>

      {/* Right — Forgot password form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-slate-900 font-bold">{t('login.mobileTitle')}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{t('forgot.heading')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('forgot.subheading')}</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <Input
                label={t('signup.email')}
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

              <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
                {t('forgot.submit')}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Generic confirmation — always shown, regardless of whether account exists */}
              <div role="status" className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                {t('forgot.confirmation')}
              </div>

              {/* Demo mode panel — only shown if account was found */}
              {demoPassword && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-amber-800 font-semibold text-sm">{t('forgot.demoPanel.title')}</span>
                  </div>
                  <p className="text-amber-700 text-xs leading-relaxed">{t('forgot.demoPanel.body')}</p>
                  <div className="bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">{t('forgot.demoPanel.passwordLabel')}</span>
                    <code className="flex-1 text-sm font-mono text-slate-900 select-all" dir="ltr">{demoPassword}</code>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center py-2.5"
                onClick={() => { setSubmitted(false); setEmail(''); setDemoPassword(null) }}
              >
                {t('forgot.tryAgain')}
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('forgot.backToSignIn')}
            </Link>
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
        </div>
      </div>
    </div>
  )
}
