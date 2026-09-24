import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useLang } from '../../i18n/LanguageContext'
import { changePassword } from '../../api/auth'
import { ApiError } from '../../api/http'

interface ChangePasswordFormProps {
  /** Forced mode (new/reset accounts): no cancel option. */
  forced?: boolean
  onSuccess: () => void
  onCancel?: () => void
}

/**
 * Shared change-password form (Final v1 §7). Used both by the forced
 * change-password screen and voluntarily from Settings → Security.
 * Frontend validation: 12–128 chars, confirm matches, differs from current.
 * Only { currentPassword, newPassword } is sent — never confirmPassword.
 */
export function ChangePasswordForm({ forced = false, onSuccess, onCancel }: ChangePasswordFormProps) {
  const { t } = useLang()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!current) {
      setError(t('auth.error.passwordRequired'))
      return
    }
    if (next.length < 12 || next.length > 128) {
      setError(t('changePassword.error.length'))
      return
    }
    if (next !== confirm) {
      setError(t('auth.error.passwordMismatch'))
      return
    }
    if (next === current) {
      setError(t('changePassword.error.reuse'))
      return
    }
    setLoading(true)
    try {
      // 204: server ends all sessions of this user.
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError(t('changePassword.error.wrongCurrent'))
          return
        }
        if (err.status === 429) {
          setError(t('auth.error.rateLimited').replace('{seconds}', String(err.retryAfter ?? '?')))
          return
        }
        setError(err.message)
        return
      }
      setError(t('changePassword.error.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      <Input
        label={t('changePassword.current')}
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
        required
      />
      <Input
        label={t('changePassword.new')}
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        required
        hint={t('changePassword.rules')}
      />
      <Input
        label={t('changePassword.confirm')}
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
      />
      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading}>
          {t('changePassword.submit')}
        </Button>
        {!forced && onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {t('action.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
