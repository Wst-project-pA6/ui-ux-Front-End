import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { useRole, ROLE_CONFIGS, ALL_ROLES, type Role } from '../context/RoleContext'
import {
  isEmailTaken,
  createUser,
  checkStrength,
  strengthScore,
  isStrongEnough,
  type PasswordStrength,
} from '../utils/demoAuth'
import { register } from '../api/auth'
import { ApiError } from '../api/http'
import { errorMessage } from '../api/mapping'

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

function StrengthMeter({ strength, score }: { strength: PasswordStrength; score: number }) {
  const { t } = useLang()

  const levelLabel =
    score <= 2 ? t('auth.password.strength.weak')
    : score <= 4 ? t('auth.password.strength.fair')
    : t('auth.password.strength.strong')

  const levelColor =
    score <= 2 ? 'bg-red-400' : score <= 4 ? 'bg-amber-400' : 'bg-emerald-500'

  const textColor =
    score <= 2 ? 'text-red-600' : score <= 4 ? 'text-amber-600' : 'text-emerald-600'

  const rules: { key: keyof PasswordStrength; label: string }[] = [
    { key: 'hasLength', label: t('auth.password.rules.length') },
    { key: 'hasUpper', label: t('auth.password.rules.uppercase') },
    { key: 'hasLower', label: t('auth.password.rules.lowercase') },
    { key: 'hasDigit', label: t('auth.password.rules.digit') },
    { key: 'hasSpecial', label: t('auth.password.rules.special') },
  ]

  return (
    <div className="flex flex-col gap-2">
      {/* bar + label */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`flex-1 rounded-full transition-colors duration-200 ${n <= score ? levelColor : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{levelLabel}</span>
      </div>
      {/* checklist */}
      <ul className="flex flex-col gap-0.5">
        {rules.map((r) => (
          <li key={r.key} className={`flex items-center gap-1.5 text-xs ${strength[r.key] ? 'text-emerald-600' : 'text-slate-400'}`}>
            {strength[r.key] ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SignUp() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const { setRole, setUserName } = useRole()

  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('technician')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [nameErr, setNameErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [confirmErr, setConfirmErr] = useState('')

  const strength = checkStrength(password)
  const score = strengthScore(strength)

  // Clear passwords and pending navigation timer on unmount
  useEffect(() => () => {
    setPassword('')
    setConfirmPw('')
    if (navTimerRef.current !== null) clearTimeout(navTimerRef.current)
  }, [])

  const validateName = (v: string) => (!v.trim() ? t('auth.error.nameRequired') : '')
  const validateEmail = (v: string) => {
    if (!v) return t('auth.error.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t('auth.error.invalidEmail')
    if (isEmailTaken(v)) return t('auth.error.emailTaken')
    return ''
  }
  const validatePassword = (v: string) => {
    if (!v) return t('auth.error.passwordRequired')
    // Backend enforces Length(12, 128) on register/change-password — an
    // 8-11 char password would fail live with 422, so require 12 here.
    if (v.length < 12 || !isStrongEnough(v)) return t('auth.error.weakPassword')
    return ''
  }
  const validateConfirm = (v: string) => {
    if (!v) return t('auth.error.passwordRequired')
    if (v !== password) return t('auth.error.passwordMismatch')
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nErr = validateName(name)
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    const cErr = validateConfirm(confirmPw)
    setNameErr(nErr)
    setEmailErr(eErr)
    setPwErr(pErr)
    setConfirmErr(cErr)
    if (nErr || eErr || pErr || cErr) return

    setLoading(true)
    try {
      // Backend truth: POST /auth/register {email, displayName,
      // preferredLocale, password(min 12)} -> 201. Never returns tokens and
      // never signs in: the account stays pending until an admin grants a
      // role, so we send the user to sign-in (same as backend's own frontend).
      await register({
        email: email.trim(),
        displayName: name.trim(),
        preferredLocale: lang,
        password,
      })
      setPassword('')
      setConfirmPw('')
      setSuccess(true)
      navTimerRef.current = setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo fallback: local account, clearly labeled.
        const trimmedName = name.trim()
        createUser({ name: trimmedName, email, role: selectedRole, password })
        setUserName(trimmedName)
        setRole(selectedRole)
        setSuccess(true)
        navTimerRef.current = setTimeout(() => navigate(ROLE_CONFIGS[selectedRole].homeRoute), 1200)
      } else if (err instanceof ApiError && err.code === 'DUPLICATE_RESOURCE') {
        setEmailErr(t('auth.error.emailTaken'))
      } else if (err instanceof ApiError) {
        // Map backend codes to human text — never surface raw 5xx bodies
        // (e.g. INTERNAL_ERROR "An unexpected error occurred") as-is.
        setPwErr(errorMessage(err.code, err.message))
      } else {
        setPwErr(err instanceof Error ? err.message : t('auth.error.weakPassword'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding (same as Login) */}
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
              {t('signup.brandHeadline')}
              <br />
              <span className="text-blue-400">{t('signup.brandHeadlineAnd')}</span>
            </h1>
            <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-md">
              {t('signup.brandTagline')}
            </p>
          </div>
          <p className="text-slate-600 text-xs">{t('login.copyright')}</p>
        </div>
      </div>

      {/* Right — Sign Up form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-slate-900 font-bold">{t('login.mobileTitle')}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{t('signup.heading')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('signup.subheading')}</p>
          </div>

          {/* Backend: POST /auth/register creates a pending-access account (no roles until an admin approves). */}
          <div role="note" className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs leading-relaxed">
            New accounts start with pending access — an admin grants your role before you can sign in.
          </div>

          {success && (
            <div role="status" className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t('signup.success')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {/* Full Name */}
            <Input
              label={t('signup.fullName')}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr('') }}
              onBlur={() => setNameErr(validateName(name))}
              placeholder={t('signup.fullNamePlaceholder')}
              autoComplete="name"
              required
              error={nameErr}
            />

            {/* Role picker */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">
                {t('signup.roleLabel')}
                <span className="text-red-500 ms-0.5" aria-hidden="true">*</span>
              </span>
              <div className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col gap-1.5">
                {ALL_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                      selectedRole === r
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span className="flex-1 font-medium">{ROLE_CONFIGS[r].label}</span>
                    {selectedRole === r && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <Input
              label={t('signup.email')}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr('') }}
              onBlur={() => setEmailErr(validateEmail(email))}
              placeholder="you@example.com"
              autoComplete="email"
              required
              error={emailErr}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Input
                label={t('signup.password')}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (pwErr) setPwErr('') }}
                onBlur={() => setPwErr(validatePassword(password))}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                error={pwErr}
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
              {password && <StrengthMeter strength={strength} score={score} />}
            </div>

            {/* Confirm Password */}
            <Input
              label={t('signup.confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onBlur={() => setConfirmErr(validateConfirm(confirmPw))}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              error={confirmErr}
              suffixIcon={
                <button
                  type="button"
                  className="pointer-events-auto text-slate-400 hover:text-slate-600"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? t('auth.password.hide') : t('auth.password.show')}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              }
            />

            <Button type="submit" loading={loading} disabled={success} className="w-full justify-center py-2.5">
              {t('signup.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t('auth.haveAccount')}{' '}
            <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('auth.signIn')}
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
