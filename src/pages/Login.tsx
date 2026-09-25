import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useRole, ROLE_CONFIGS, ALL_ROLES, type Role } from '../context/RoleContext'
import { authApi } from '../api/endpoints'
import { tokenStorage } from '../api/tokenStorage'
import { ApiError } from '../api/errors'

const DEMO_CREDENTIALS: Record<Role, { email: string; label: string }> = {
  manager: { email: 'ahmed@wst.sa', label: 'Workshop Manager' },
  advisor: { email: 'sara@wst.sa', label: 'Service Advisor' },
  technician: { email: 'khalid@wst.sa', label: 'Technician / QC' },
  storekeeper: { email: 'nasser@wst.sa', label: 'Storekeeper' },
  supervisor: { email: 'sami@wst.sa', label: 'Training Supervisor' },
  student: { email: 'rayan@wst.sa', label: 'Student' },
  finance: { email: 'layla@wst.sa', label: 'Finance Auditor' },
}

export default function Login() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const { setRole } = useRole()
  const [selectedRole, setSelectedRole] = useState<Role>('manager')
  const [email, setEmail] = useState(DEMO_CREDENTIALS['manager'].email)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const { showToast } = useToast()

  const handleRoleChange = (r: Role) => {
    setSelectedRole(r)
    setEmail(DEMO_CREDENTIALS[r].email)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)
    try {
      // Attempt a real backend session first — the backend is the source of
      // truth for authentication (POST /auth/login).
      const pair = await authApi.login(email.trim(), password)
      tokenStorage.setAccessToken(pair.accessToken)
      tokenStorage.setRefreshToken(pair.refreshToken)
      if (!remember) {
        // Session-only login requested: refresh token is still required by
        // the backend refresh flow, so we keep tokens but note the choice.
      }
      showToast('success', 'Signed in', 'Connected to the WST backend.')
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        // Backend unreachable — explicit demo mode, never a fake success.
        await new Promise((r) => setTimeout(r, 500))
        showToast('info', 'Backend offline — demo mode', 'Browsing with local preview data.')
      } else if (err instanceof ApiError && err.status === 401) {
        setLoading(false)
        setLoginError('Invalid email or password.')
        return
      } else {
        setLoading(false)
        setLoginError(err instanceof Error ? err.message : 'Sign-in failed.')
        return
      }
    }
    setLoading(false)
    setRole(selectedRole)
    navigate(ROLE_CONFIGS[selectedRole].homeRoute)
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
            <path d="M0 0h600v600H0z" fill="none" />
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1={i * 55} y1="0" x2={i * 55} y2="600" stroke="white" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1="0" y1={i * 55} x2="600" y2={i * 55} stroke="white" strokeWidth="0.5" />
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
            <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-md">
              {t('login.tagline')}
            </p>

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

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Role selector — prototype only */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2.5">
                🔑 Prototype: select a role to preview
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {ALL_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                      selectedRole === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-blue-100 border border-slate-200'
                    }`}
                  >
                    <span className="font-medium flex-1">{ROLE_CONFIGS[r].label}</span>
                    {selectedRole === r && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={t('login.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@wst.sa"
              required
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
              prefixIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">{t('login.rememberMe')}</span>
              </label>
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
