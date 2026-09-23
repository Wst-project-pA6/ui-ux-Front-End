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
  // Present on 409 SCHEDULE_CONFLICT (job assignment, session publish).
  conflicts?: Array<{
    conflictKey: string
    kind: string
    overridable: boolean
    overridden: boolean
    message: string
  }>
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
// Backend dashboards/* return aggregated MetricDto lists (DecimalString
// values, never floats). Query filters: from, to, organizationScopeId,
// storeId, bayId, technicianId, courseId, termId — anything else -> 400.
export type MetricUnit = 'COUNT' | 'PERCENT' | 'HOURS' | 'DAYS' | 'MONEY' | 'RATIO'

export interface DashboardBreakdown {
  key: string
  label: string
  value: string
  recordCount?: number
}

export interface DashboardMetric {
  key: string
  label: string
  unit: MetricUnit
  value: string
  currencyCode?: string
  recordCount: number
  breakdown?: DashboardBreakdown[]
}

export type DashboardName = 'WORKSHOP' | 'INVENTORY_FINANCE' | 'TRAINING' | 'AI_DATA'

export interface DashboardResponse {
  dashboard: DashboardName
  generatedAt: Timestamp
  dataAsOf: Timestamp
  filterFingerprint: string
  appliedFilters: Record<string, string | undefined>
  metrics: DashboardMetric[]
}

export interface ReportFilters {
  from?: string
  to?: string
  organizationScopeId?: string
  storeId?: string
  bayId?: string
  technicianId?: string
  courseId?: string
  termId?: string
  [filter: string]: string | undefined
}

// ── Exports (async: 202 -> poll -> download authorization) ─────────────
export type ExportType =
  | 'JOBS' | 'LABOR_ENTRIES' | 'PART_ISSUES' | 'STOCK_BALANCES'
  | 'STOCK_MOVEMENTS' | 'PURCHASE_ORDERS' | 'INVOICES' | 'CUSTOMER_STATEMENT'
  | 'ATTENDANCE' | 'ASSESSMENTS' | 'CERTIFICATES' | 'REORDER_SUGGESTIONS'
  | 'TRAINING_RISK' | 'DASHBOARD_WORKSHOP' | 'DASHBOARD_INVENTORY_FINANCE'
  | 'DASHBOARD_TRAINING' | 'DASHBOARD_AI_DATA' | 'AUDIT_EVENTS'

export type ExportFormat = 'CSV' | 'PDF'

export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED'

export interface ExportJob {
  id: string
  exportType: ExportType
  format: ExportFormat
  status: ExportStatus
  filters: Record<string, string | undefined>
  filterFingerprint: string
  sensitive: boolean
  customerId?: string
  rowCount?: number
  completedAt?: string
  expiresAt?: string
  failureMessage?: string
  createdAt: string
  updatedAt: string
}

// ── Training: assessments / certificates / predictions ──────────────────
export type AssessmentResult = 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT'
export type SignOffStatus = 'PENDING' | 'SIGNED_OFF' | 'RETURNED'
export type SignOffDecision = 'SIGNED_OFF' | 'RETURNED'

export interface Assessment extends RecordMeta {
  sessionId: Uuid
  studentId: Uuid
  taskId: Uuid
  courseId: Uuid
  result: AssessmentResult
  timeOnTaskMinutes: number
  mentorNote?: string
  evidenceAttachmentIds: Uuid[]
  assessedBy: Uuid
  assessedAt: Timestamp
  signOffStatus: SignOffStatus
  signedOffBy?: Uuid
  signedOffAt?: Timestamp
  signOffNote?: string
  countsTowardCompletion: boolean
  version: number
}

export type CertificateStatus = 'ISSUED' | 'REVOKED'

export interface Certificate extends RecordMeta {
  certificateNumber: string
  studentId: Uuid
  courseId: Uuid
  issuedAt: Timestamp
  issuedBy: Uuid
  status: CertificateStatus
  revokedAt?: Timestamp
  revokedBy?: Uuid
  revocationReason?: string
  verificationToken?: string // present only on the issue response, never persisted
}

export type PredictionType = 'REORDER_SUGGESTION' | 'TRAINING_RISK'
export type PredictionStatus = 'ACTIVE' | 'ACCEPTED' | 'OVERRIDDEN' | 'DISMISSED' | 'SUPERSEDED'
export type PredictionDecision = 'ACCEPTED' | 'OVERRIDDEN' | 'DISMISSED'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Prediction {
  id: Uuid
  type: PredictionType
  status: PredictionStatus
  advisoryOnly: true
  generatedAt: Timestamp
  source: { kind: 'RULE_BASELINE' | 'ML_MODEL'; name: string; version: string }
  explanation: { summary: string; factors: Array<{ code: string; message: string; value?: string }> }
  reorder?: {
    input: { storeId: string; partId: string; partSku: string; onHand: number; reserved: number; available: number; minLevel: number; maxLevel: number; openPurchaseOrderQuantity: number; averageWeeklyConsumption: string; lookbackWeeks: number }
    result: { suggestedQuantity: number; estimatedWeeksOfCover?: string }
  }
  trainingRisk?: {
    input: { studentId: string; courseId: string; attendancePercent: string; missingAttendanceSessions: number; unsignedAssessmentCount: number; unmetCompetencyCount: number }
    result: { riskLevel: RiskLevel; flags: string[] }
  }
  decision?: { decision: PredictionDecision; decidedBy: string; decidedAt: string; overrideReason?: string; overrideQuantity?: number; note?: string }
  evaluation: { outcome: 'PENDING' | 'CONFIRMED' | 'NOT_CONFIRMED' | 'NOT_APPLICABLE'; evaluatedAt?: string; note?: string }
}

// ── Training sessions: conflicts & transitions ──────────────────────────
export interface TrainingConflict {
  conflictKey: string
  kind: string
  overridable: boolean
  overridden: boolean
  message: string
}

export interface ConflictCheckResponse {
  hasConflicts: boolean
  canPublish: boolean
  conflicts: TrainingConflict[]
}

export type TrainingSessionTransition = 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'

// ── Student progress (derived read models) ──────────────────────────────
export interface CompetencyCoverage {
  competencyId: Uuid
  code: string
  name: LocalizedName
  requiredTasks: number
  signedPassedRequiredTasks: number
  pendingUnsignedTasks: number
  coveragePercent: string
}

export interface CoverageResponse {
  studentId: Uuid
  courseId: Uuid
  overallPercent: string
  competencies: CompetencyCoverage[]
  generatedAt: Timestamp
}

export interface EligibilityResponse {
  studentId: Uuid
  courseId: Uuid
  eligible: boolean
  attendancePercent: string
  minimumAttendancePercent: number
  unmetConditions: Array<{ code: string; message: string }>
  evaluatedAt: Timestamp
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
