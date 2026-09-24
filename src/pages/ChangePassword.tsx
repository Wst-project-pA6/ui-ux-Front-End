import { Navigate, useNavigate } from 'react-router-dom'
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { isAuthenticated } from '../api/auth'

/**
 * Forced change-password screen (Final v1 §7): reached only when the backend
 * reports mustChangePassword (new accounts, admin resets) or gates calls
 * with 403 PASSWORD_CHANGE_REQUIRED. Normal logins never land here.
 * Success ends all sessions -> back to Login with an explanatory message.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { t } = useLang()
  const { signOut, clearForcePasswordChange } = useAuth()

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  const handleSuccess = async () => {
    clearForcePasswordChange()
    await signOut('auth.passwordChangedLogin')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="text-slate-900 font-bold">WST</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{t('changePassword.title')}</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">{t('changePassword.forcedDesc')}</p>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <ChangePasswordForm forced onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
