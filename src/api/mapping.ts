// UI <-> contract value mappings + money helpers.
// Fixes a class of contract violations found in the UI:
// - stages/priorities were lowercase UI strings; the API uses SCREAMING enums
// - money was `number`/SAR text; the API uses { amount: decimal-string, currency }
// - 7 UI roles vs 10 contract RoleCodes; permissions come from /auth/me.

import type { JobPriority, JobStage, Money, RoleCode, ServiceType } from './types'
import type { Role } from '../context/RoleContext'

export const STAGE_TO_UI: Record<JobStage, string> = {
  RECEIVED: 'received',
  IN_PROGRESS: 'in-progress',
  QUALITY_CHECK: 'quality-check',
  READY: 'ready',
  DELIVERED: 'delivered',
}

export const UI_TO_STAGE: Record<string, JobStage> = {
  received: 'RECEIVED',
  'in-progress': 'IN_PROGRESS',
  'quality-check': 'QUALITY_CHECK',
  ready: 'READY',
  delivered: 'DELIVERED',
}

export const PRIORITY_TO_UI: Record<JobPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const UI_TO_PRIORITY: Record<string, JobPriority> = {
  Low: 'LOW',
  Normal: 'NORMAL',
  High: 'HIGH',
  Urgent: 'URGENT',
  low: 'LOW',
  normal: 'NORMAL',
  high: 'HIGH',
  urgent: 'URGENT',
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  MAINTENANCE: 'Service',
  REPAIR: 'Mechanical',
  DIAGNOSTIC: 'Diagnostic',
  INSPECTION: 'Inspection',
  OTHER: 'Other',
}

/** Human-readable names for the 10 contract role codes (Final v1 §10.5). */
export const ROLE_CODE_LABELS: Record<RoleCode, string> = {
  SYSTEM_ADMIN: 'System Administrator',
  WORKSHOP_MANAGER: 'Workshop Manager',
  SERVICE_ADVISOR: 'Service Advisor',
  TECHNICIAN: 'Technician',
  QUALITY_CHECKER: 'Quality Checker',
  STOREKEEPER_PROCUREMENT: 'Storekeeper / Procurement',
  MENTOR: 'Mentor',
  TRAINING_SUPERVISOR: 'Training Supervisor',
  STUDENT: 'Student',
  FINANCE_VIEWER_AUDITOR: 'Finance Viewer / Auditor',
}

export const ALL_ROLE_CODES = Object.keys(ROLE_CODE_LABELS) as RoleCode[]

/** Contract RoleCode -> UI role (SYSTEM_ADMIN has its own admin home). */
export function roleCodeToUiRole(codes: RoleCode[]): Role {
  if (codes.includes('SYSTEM_ADMIN')) return 'admin'
  if (codes.includes('WORKSHOP_MANAGER')) return 'manager'
  if (codes.includes('SERVICE_ADVISOR')) return 'advisor'
  if (codes.includes('TECHNICIAN') || codes.includes('QUALITY_CHECKER')) return 'technician'
  if (codes.includes('STOREKEEPER_PROCUREMENT')) return 'storekeeper'
  if (codes.includes('TRAINING_SUPERVISOR') || codes.includes('MENTOR')) return 'supervisor'
  if (codes.includes('STUDENT')) return 'student'
  if (codes.includes('FINANCE_VIEWER_AUDITOR')) return 'finance'
  return 'manager'
}

/** Format contract Money without ever using floats for the amount. */
export function formatMoney(m: Money, locale: string = 'en-SA'): string {
  const [int, frac = ''] = m.amount.split('.')
  const grouped = Number(int).toLocaleString(locale)
  const decimals = frac ? `.${frac}` : ''
  return `${grouped}${decimals} ${m.currency}`
}

/** Build contract Money from a user-entered decimal string. */
export function toMoney(amount: string, currency: string): Money {
  const normalized = amount.trim()
  if (!/^-?\d{1,12}(\.\d{1,4})?$/.test(normalized)) {
    throw new Error('Invalid money amount — must be a decimal string (max 4 fraction digits)')
  }
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency code — ISO-4217 required')
  return { amount: normalized, currency }
}

/** Human message for the most common contract error codes. */
export function errorMessage(code: string, fallback: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS': return 'Invalid email or password'
    case 'TOKEN_EXPIRED': return 'Session expired — please sign in again'
    case 'VERSION_CONFLICT': return 'This record changed elsewhere. Refresh and try again.'
    case 'SCHEDULE_CONFLICT': return 'Schedule conflict — the bay or technician is already booked.'
    case 'INVALID_STATE_TRANSITION': return 'This action is not allowed in the current stage.'
    case 'JOB_STAGE_NOT_ALLOWED': return 'This change is not allowed in the current job stage.'
    case 'CUSTOMER_APPROVAL_REQUIRED': return 'Customer approval is required before work can start.'
    case 'INSUFFICIENT_STOCK': return 'Insufficient stock for this operation.'
    case 'DUPLICATE_RESOURCE': return 'A record with these unique details already exists.'
    case 'RESOURCE_IN_USE': return 'This record is in use and cannot be changed this way.'
    case 'RATE_LIMITED': return 'Too many attempts — please wait and try again.'
    case 'FORBIDDEN': return 'You do not have permission for this action.'
    case 'NOT_FOUND': return 'Record not found (or outside your scope).'
    default: return fallback
  }
}
