import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { request } from '../api/client'
import { ApiError } from '../api/errors'
import { FieldErrors } from '../components/common/ApiStates'

/**
 * Change password — required when login returns mustChangePassword or any
 * call answers 403 PASSWORD_CHANGE_REQUIRED. On success (204) the session
 * is cleared and the user signs in again with the new password.
 */
export default function ChangePassword() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { logout, mustChangePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [formError, setFormError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setError(null)
    if (newPassword.length < 12 || newPassword.length > 128) {
      setFormError('New password must be 12–128 characters.')
      return
    }
    if (newPassword !== confirm) {
      setFormError('Confirmation does not match the new password.')
      return
    }
    if (newPassword === currentPassword) {
      setFormError('New password must differ from the current password.')
      return
    }
    if (saving) return
    setSaving(true)
    try {
      // EXACT body per contract — no extra fields.
      await request<void>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      await logout()
      showToast('success', 'Password changed', 'Sign in again with your new password.')
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.code === 'INVALID_CREDENTIALS') {
          setFormError('Current password is incorrect.')
          return
        }
        if (err.code === 'PASSWORD_REUSE_NOT_ALLOWED') {
          setFormError('This password was used before. Choose a different one.')
          return
        }
        if (err.status === 429) {
          setFormError(
            `Too many attempts. Try again${err.retryAfterSeconds ? ` in ${err.retryAfterSeconds}s` : ' later'}.`,
          )
          return
        }
      }
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <PageHeader
        title="Change password"
        subtitle={
          mustChangePassword
            ? 'Your account requires a password change before continuing.'
            : 'Update your sign-in password.'
        }
      />
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
        <Input
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Input
          label="New password (12–128 characters)"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
        {formError && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
        {error ? <FieldErrors error={error} /> : null}
        <Button type="submit" disabled={saving} className="justify-center">
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </div>
  )
}
