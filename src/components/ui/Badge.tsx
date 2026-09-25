import React from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { TranslationKey } from '../../i18n/translations'

export type BadgeVariant =
  | 'received'
  | 'in-progress'
  | 'quality-check'
  | 'ready'
  | 'delivered'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'low-stock'
  | 'out-of-stock'
  | 'healthy'
  | 'pass'
  | 'fail'
  | 'needs-improvement'
  | 'active'
  | 'inactive'
  | 'default'

/**
 * Maps backend status strings (UPPER_SNAKE, any case) to a Badge variant.
 * Unknown values fall back to 'default' — never crashes the UI.
 */
export function badgeVariantFor(raw?: string | null): BadgeVariant {
  const s = String(raw ?? '').toUpperCase().replace(/-/g, '_')
  switch (s) {
    case 'ACTIVE':
    case 'HEALTHY':
      return 'active'
    case 'ARCHIVED':
    case 'INACTIVE':
      return 'inactive'
    case 'RECEIVED':
      return 'received'
    case 'IN_PROGRESS':
      return 'in-progress'
    case 'QUALITY_CHECK':
      return 'quality-check'
    case 'READY':
      return 'ready'
    case 'DELIVERED':
      return 'delivered'
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return 'pending'
    case 'APPROVED':
    case 'PASSED':
      return 'approved'
    case 'REJECTED':
    case 'FAILED':
      return 'rejected'
    case 'LOW_STOCK':
    case 'BELOW_MINIMUM':
      return 'low-stock'
    case 'OUT_OF_STOCK':
    case 'STOCKED_OUT':
      return 'out-of-stock'
    default:
      return 'default'
  }
}

const variantStyles: Record<BadgeVariant, string> = {
  received: 'bg-blue-50 text-blue-700 border border-blue-200',
  'in-progress': 'bg-amber-50 text-amber-700 border border-amber-200',
  'quality-check': 'bg-purple-50 text-purple-700 border border-purple-200',
  ready: 'bg-green-50 text-green-700 border border-green-200',
  delivered: 'bg-slate-100 text-slate-600 border border-slate-200',
  pending: 'bg-orange-50 text-orange-700 border border-orange-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  'low-stock': 'bg-amber-50 text-amber-700 border border-amber-200',
  'out-of-stock': 'bg-red-50 text-red-700 border border-red-200',
  healthy: 'bg-green-50 text-green-700 border border-green-200',
  pass: 'bg-green-50 text-green-700 border border-green-200',
  fail: 'bg-red-50 text-red-700 border border-red-200',
  'needs-improvement': 'bg-amber-50 text-amber-700 border border-amber-200',
  active: 'bg-green-50 text-green-700 border border-green-200',
  inactive: 'bg-slate-100 text-slate-600 border border-slate-200',
  default: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const variantDots: Record<BadgeVariant, string> = {
  received: 'bg-blue-500',
  'in-progress': 'bg-amber-500',
  'quality-check': 'bg-purple-500',
  ready: 'bg-green-500',
  delivered: 'bg-slate-400',
  pending: 'bg-orange-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  'low-stock': 'bg-amber-500',
  'out-of-stock': 'bg-red-500',
  healthy: 'bg-green-500',
  pass: 'bg-green-500',
  fail: 'bg-red-500',
  'needs-improvement': 'bg-amber-500',
  active: 'bg-green-500',
  inactive: 'bg-slate-400',
  default: 'bg-slate-400',
}

const variantTranslationKeys: Record<BadgeVariant, TranslationKey> = {
  received: 'badge.received',
  'in-progress': 'badge.in-progress',
  'quality-check': 'badge.quality-check',
  ready: 'badge.ready',
  delivered: 'badge.delivered',
  pending: 'badge.pending',
  approved: 'badge.approved',
  rejected: 'badge.rejected',
  'low-stock': 'badge.low-stock',
  'out-of-stock': 'badge.out-of-stock',
  healthy: 'badge.healthy',
  pass: 'badge.pass',
  fail: 'badge.fail',
  'needs-improvement': 'badge.needs-improvement',
  active: 'badge.active',
  inactive: 'badge.inactive',
  default: 'badge.default',
}

interface BadgeProps {
  variant?: BadgeVariant
  label?: string
  showDot?: boolean
  className?: string
}

export function Badge({ variant = 'default', label, showDot = true, className = '' }: BadgeProps) {
  const { t } = useLang()
  const translatedLabel = label ?? t(variantTranslationKeys[variant])
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${variantDots[variant]}`} />}
      {translatedLabel}
    </span>
  )
}
