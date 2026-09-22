// Contract-first TypeScript types (subset covering what the UI consumes).
// Source of truth: WST_OpenAPI_Contract_FROZEN.yaml
// Conventions enforced here:
// - Money = { amount: string (decimal, never float), currency: ISO-4217 }
// - Optional = omitted, never null. readOnly fields never sent in requests.
// - Collections = { items, page }. Only GET /roles is unpaged.

export type Uuid = string
export type Timestamp = string // RFC 3339 UTC
export type DateOnly = string // YYYY-MM-DD
export type MoneyAmount = string // decimal string, e.g. "1250.5000"
export type DecimalString = string
export type Locale = 'en' | 'ar'

export interface Money {
  amount: MoneyAmount
  currency: string // ISO-4217
}

export interface LocalizedName {
  en: string
  ar?: string
}

export interface PageInfo {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface Page<T> {
  items: T[]
  page: PageInfo
}

export interface RecordMeta {
  id: Uuid
  createdAt: Timestamp
  updatedAt: Timestamp
  // The backend omits audit actors when the underlying value is null.
  createdBy?: Uuid
  updatedBy?: Uuid
}

// ── Errors (contract `Error` schema) ──────────────────────────────────
export type ErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED'
  | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'RATE_LIMITED'
  | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'INVALID_STATE_TRANSITION'
  | 'VERSION_CONFLICT' | 'DUPLICATE_RESOURCE' | 'IDEMPOTENCY_CONFLICT'
  | 'RESOURCE_IN_USE' | 'CUSTOMER_APPROVAL_REQUIRED' | 'JOB_STAGE_NOT_ALLOWED'
  | 'JOB_ASSIGNMENT_REQUIRED' | 'CHECKLIST_INCOMPLETE' | 'QUALITY_CHECK_REQUIRED'
  | 'INVOICE_REQUIRED' | 'INSUFFICIENT_STOCK' | 'REVERSAL_EXCEEDS_ISSUED'
  | 'RESERVATION_INVALID' | 'SCHEDULE_CONFLICT' | 'CONFLICT_NOT_OVERRIDABLE'
  | 'SEPARATION_OF_DUTIES_VIOLATION' | 'DUPLICATE_APPROVAL' | 'RECEIPT_EXCEEDS_ORDERED'
  | 'PAYMENT_AMOUNT_MISMATCH' | 'ASSESSMENT_LOCKED' | 'CERTIFICATE_NOT_ELIGIBLE'
  | 'ATTACHMENT_INVALID' | 'ATTACHMENT_NOT_LINKABLE' | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE' | 'EXPORT_NOT_READY' | 'EXPORT_EXPIRED'

export interface ErrorDetail {
  field?: string
  code: string
  message: string
  params?: Record<string, unknown>
}

export interface ApiErrorBody {
  code: ErrorCode
  message: string
  requestId: string
  details?: ErrorDetail[]
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  mustChangePassword: boolean
}

export type RoleCode =
  | 'SYSTEM_ADMIN' | 'WORKSHOP_MANAGER' | 'SERVICE_ADVISOR' | 'TECHNICIAN'
  | 'QUALITY_CHECKER' | 'STOREKEEPER_PROCUREMENT' | 'MENTOR'
  | 'TRAINING_SUPERVISOR' | 'STUDENT' | 'FINANCE_VIEWER_AUDITOR'

export interface CurrentUser {
  id: Uuid
  email: string
  displayName: string
  preferredLocale: Locale
  roles: RoleCode[]
  permissions: string[]
  organizationScopeIds: Uuid[]
  mustChangePassword: boolean
  studentId?: Uuid
}

// ── Customers / Vehicles ──────────────────────────────────────────────
export type CustomerType = 'INDIVIDUAL' | 'BUSINESS'
export type CustomerStatus = 'ACTIVE' | 'ARCHIVED'

export interface Customer extends RecordMeta {
  organizationScopeId: Uuid
  displayName: string
  type: CustomerType
  phone: string // E.164
  email?: string
  status: CustomerStatus
  contactPreferences?: {
    preferredChannel?: 'PHONE' | 'SMS' | 'EMAIL'
    preferredLocale?: Locale
  }
}

export interface CustomerCreateRequest {
  organizationScopeId: Uuid
  displayName: string
  type: CustomerType
  phone: string
  email?: string
  contactPreferences?: Customer['contactPreferences']
}

export interface CustomerUpdateRequest {
  displayName?: string
  phone?: string
  email?: string
  status?: CustomerStatus
  contactPreferences?: Customer['contactPreferences']
}

export type VehicleStatus = 'ACTIVE' | 'ARCHIVED'

export interface Vehicle extends RecordMeta {
  customerId: Uuid
  plate: string
  vin: string
  make: string
  model: string
  year: number
  mileage: number
  mileageUnit: 'KM' | 'MI'
  status: VehicleStatus
}

export interface VehicleCreateRequest {
  customerId: Uuid
  plate: string
  vin: string
  make: string
  model: string
  year: number
  mileage: number
  mileageUnit: 'KM' | 'MI'
}

export interface VehicleUpdateRequest {
  plate?: string
  mileage?: number // must only increase (422 otherwise)
  status?: VehicleStatus
}

// ── Workshop jobs (contract enums — UI labels map onto these) ─────────
export type JobStage = 'RECEIVED' | 'IN_PROGRESS' | 'QUALITY_CHECK' | 'READY' | 'DELIVERED'
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type ServiceType = 'MAINTENANCE' | 'REPAIR' | 'DIAGNOSTIC' | 'INSPECTION' | 'OTHER'

export interface JobCard extends RecordMeta {
  jobNumber: string // server-generated, immutable
  customerId: Uuid
  vehicleId: Uuid
  organizationScopeId: Uuid
  complaint: string
  serviceType: ServiceType
  priority: JobPriority
  mileageAtIntake: number
  stage: JobStage
  stageChangedAt: Timestamp
  expectedCompletionAt: Timestamp
  version: number // optimistic concurrency — required on update
  customerDisplayName?: string
  vehiclePlate?: string
  bayId?: Uuid
  technicianId?: Uuid
  scheduledStartAt?: Timestamp
  deliveredAt?: Timestamp
  approvalSummary: {
    billableWorkAllowed: boolean
    approvedScopes: string[]
    pendingApprovalCount: number
  }
}

export interface JobCardCreateRequest {
  vehicleId: Uuid
  complaint: string
  serviceType: ServiceType
  priority: JobPriority
  mileageAtIntake: number
  expectedCompletionAt: Timestamp
  workItems?: Array<{ description: string; isAdditionalWork?: boolean }>
  attachmentIds?: Uuid[]
}

export interface JobCardUpdateRequest {
  version: number
  complaint?: string
  priority?: JobPriority
  serviceType?: ServiceType
  expectedCompletionAt?: Timestamp
}

export interface JobTransitionRequest {
  toStage: JobStage
  expectedFromStage: JobStage
}

// ── Inventory / Procurement (trimmed) ─────────────────────────────────
export interface Part extends RecordMeta {
  sku: string
  barcode?: string
  name: LocalizedName
  category: string
  unitOfMeasure: string
  sellingPrice: Money
  status: 'ACTIVE' | 'ARCHIVED'
  version: number
  compatibility?: Array<{ make: string; model?: string; yearFrom?: number; yearTo?: number }>
}

export interface StockBalance {
  storeId: Uuid
  partId: Uuid
  sku: string
  partName?: LocalizedName
  onHand: number
  reserved: number
  available: number
  minLevel: number
  maxLevel: number
  belowMinimum: boolean
  updatedAt: Timestamp
}

export type PurchaseOrderStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrder extends RecordMeta {
  poNumber: string
  vendorId: Uuid
  storeId: Uuid
  status: PurchaseOrderStatus
  total: Money
  lines: Array<{
    id: Uuid
    lineNumber: number
    partId: Uuid
    sku: string
    quantityOrdered: number
    quantityAccepted: number
    quantityRejected: number
    unitCost: Money
    lineTotal: Money
  }>
  requiredApprovals: 1 | 2 | null
  approvalsRecorded: number
  version: number
  expectedDeliveryDate?: DateOnly
  notes?: string
}

// ── Invoices (trimmed) ────────────────────────────────────────────────
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID'

export interface Invoice extends RecordMeta {
  jobId: Uuid
  customerId: Uuid
  status: InvoiceStatus
  currencyCode: string
  invoiceNumber?: string
  jobNumber: string
  lines: Array<{
    id: Uuid
    lineType: 'LABOR' | 'PART' | 'SUBLET'
    description: string
    quantity: string
    unitPrice: Money
    lineTotal: Money
    sourceType: 'LABOR_ENTRY' | 'PART_ISSUE' | 'SUBLET_ENTRY'
    sourceId: Uuid
  }>
  totals: {
    laborSubtotal: Money
    partsSubtotal: Money
    subletSubtotal: Money
    subtotal: Money
    discountTotal: Money
    taxableAmount: Money
    taxRatePercent: string
    taxAmount: Money
    total: Money
  }
  payments: Array<{
    id: Uuid
    invoiceId: Uuid
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
    reference: string
    amount: Money
    paidAt: Timestamp
  }>
  notes?: string
  issuedAt?: Timestamp
  paidAt?: Timestamp
  voidReason?: string
  version: number
}

// ── Training (trimmed) ────────────────────────────────────────────────
export type TrainingSessionStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'

export interface TrainingSession extends RecordMeta {
  title: string
  courseId: Uuid
  groupId: Uuid
  bayId: Uuid
  mentorId: Uuid
  startsAt: Timestamp
  endsAt: Timestamp
  status: TrainingSessionStatus
  cancellationReason?: string
  activeConflictOverrideCount: number
  version: number
}

// ── Dashboards / Health ───────────────────────────────────────────────
export interface DashboardResponse {
  generatedAt: Timestamp
  metrics: Record<string, number | string>
  breakdowns?: Record<string, Array<Record<string, number | string>>>
}

export interface HealthStatus {
  status: 'UP'
  version: string
  time: Timestamp
}

// ── List query (contract collection conventions) ──────────────────────
export interface ListQuery {
  page?: number
  pageSize?: number
  sort?: string // e.g. "-createdAt"; unknown fields -> 400
  q?: string
  [filter: string]: string | number | boolean | undefined
}
