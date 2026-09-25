import type { components } from '../schema'
import { ApiError } from '../errors'

export type Schemas = components['schemas']

export interface PageMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface Paginated<T> {
  items: T[]
  page: PageMeta
}

export type Money = Schemas['MoneyDto']

/** Format money without float arithmetic — amount is a string with 4 decimals. */
export function formatMoney(m?: Money | null, fallback = '—'): string {
  if (!m) return fallback
  const [int, dec = ''] = m.amount.split('.')
  const grouped = Number(int).toLocaleString('en-US')
  const frac = (dec + '0000').slice(0, 4).replace(/0+$/, '') || '0'
  return `${grouped}.${frac} ${m.currency}`
}

/** Friendly message for backend errors — shows message + requestId for diagnostics. */
export function backendErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.details?.map((d) => d.message).filter(Boolean).join('; ')
    return details ? `${err.message}: ${details}` : err.message
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred.'
}

/** Short diagnostic line for logs / support (no secrets). */
export function errorDiagnostics(err: unknown): string {
  if (err instanceof ApiError) {
    return `status=${err.status} code=${err.code} requestId=${err.requestId ?? '—'}`
  }
  return String(err)
}

export function isVersionConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409 && err.code === 'VERSION_CONFLICT'
}

/** Permission strings used by the v3 contract (from GET /auth/me → permissions). */
export const PERMS = {
  customersRead: 'customers.read',
  customersWrite: 'customers.write',
  customersErasure: 'customers.contact-erasure',
  vehiclesRead: 'vehicles.read',
  vehiclesWrite: 'vehicles.write',
  serviceTypesRead: 'service-types.read',
  serviceTypesManage: 'service-types.manage',
  baysRead: 'bays.read',
  baysManage: 'bays.manage',
  techProfilesRead: 'technician-profiles.read',
  techProfilesManage: 'technician-profiles.manage',
  operatingHoursRead: 'operating-hours.read',
  operatingHoursManage: 'operating-hours.manage',
  jobsRead: 'jobs.read',
  jobsReadAssigned: 'jobs.read.assigned',
  jobsReadQuality: 'jobs.read.quality-scope',
  jobsCreate: 'jobs.create',
  jobsUpdate: 'jobs.update',
  jobsAssign: 'jobs.assign',
  jobsStart: 'jobs.transition.start',
  jobsSubmitQc: 'jobs.transition.submit-qc',
  jobsDeliver: 'jobs.transition.deliver',
  approvalsRead: 'approvals.read',
  approvalsRecord: 'approvals.record',
  approvalsRequest: 'approvals.request',
  laborRead: 'labor.read',
  laborWrite: 'labor.write',
  qualityPerform: 'quality.perform',
  attachmentsUpload: 'attachments.upload',
  attachmentsUploadJob: 'attachments.upload.job-card',
  reservationsRead: 'inventory.reservations.read',
  inventoryIssue: 'inventory.issue',
  inventoryReverse: 'inventory.reverse',
  partsRead: 'parts.read',
  partsWrite: 'parts.write',
  inventoryRead: 'inventory.read',
  inventoryStockRead: 'inventory.stock.read',
  inventoryCount: 'inventory.count',
  inventoryAdjust: 'inventory.adjust',
  inventoryAdjustApprove: 'inventory.adjust.approve',
  inventoryCostRead: 'inventory.cost.read',
  auditRead: 'audit.read',
  scheduleOverride: 'schedule.override-conflict',
  // v4 — purchasing / invoices / config / user administration
  vendorsRead: 'vendors.read',
  vendorsWrite: 'vendors.write',
  purchasingRead: 'purchasing.read',
  purchasingCreate: 'purchasing.create',
  purchasingApprove: 'purchasing.approve',
  purchasingReceive: 'purchasing.receive',
  purchasingPolicyManage: 'purchasing.policy.manage',
  invoicesRead: 'invoices.read',
  invoicesManage: 'invoices.manage',
  paymentsRecord: 'payments.record',
  configRead: 'config.read',
  configManage: 'config.manage',
  usersRead: 'users.read',
  usersManage: 'users.manage',
  rolesAssign: 'roles.assign',
  scopesManage: 'scopes.manage',
} as const
