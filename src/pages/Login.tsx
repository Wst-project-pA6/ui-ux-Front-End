import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { homeForPermissions } from '../auth/access'
import { ApiError } from '../api/errors'

export default function Login() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const { showToast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)
    try {
      const result = await login(email.trim(), password)
      if (result.mustChangePassword) {
        showToast('info', 'Password change required', 'Set a new password to continue.')
        navigate('/change-password', { replace: true })
        return
      }
      // Identity (roles/permissions/home) comes from GET /auth/me inside login().
      navigate(homeForPermissions(result.permissions), { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setLoginError('Invalid email or password.')
        } else if (err.status === 429) {
          setLoginError(
            `Too many attempts. Try again${err.retryAfterSeconds ? ` in ${err.retryAfterSeconds}s` : ' later'}.`,
          )
        } else if (err.isNetworkError || err.status === 0) {
          setLoginError('Cannot reach the server. Please try again.')
        } else if (err.code === 'PASSWORD_CHANGE_REQUIRED') {
          navigate('/change-password', { replace: true })
          return
        } else {
          setLoginError(err.requestId ? `${err.message} (requestId ${err.requestId})` : err.message)
        }
      } else {
        setLoginError(err instanceof Error ? err.message : 'Sign-in failed.')
      }
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
            <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-md">
              {t('login.tagline')}
            </p>
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

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <Input
              label={t('login.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="username"
              prefixIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            />

            <Input
              label={t('login.passwordLabel')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              prefixIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            {loginError && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {loginError}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
              {t('login.signIn')}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-1 border-t border-slate-200 pt-6">
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

      {/* Forgot password — the backend exposes no self-service reset endpoint,
          so the UI honestly directs users to their administrator. */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={t('login.forgotPassword')}
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setForgotOpen(false)}>
            {t('action.close')}
          </Button>
        }
      >
        <p className="text-sm text-slate-600">
          Password resets are handled by your system administrator. Please contact
          your Workshop Manager or IT helpdesk to reset your credentials.
        </p>
      </Modal>
    </div>
  )
}
