// Resource clients generated from the currently implemented NestJS controllers.
// Base path is /api/v1.  Do not add speculative routes here: the backend uses
// whitelist validation and rejects unknown paths, properties, filters, and sorts.
import { api, newIdempotencyKey } from './http'
import type {
  Customer,
  CustomerCreateRequest,
  CustomerUpdateRequest,
  HealthStatus,
  Invoice,
  JobCard,
  JobCardCreateRequest,
  JobCardUpdateRequest,
  JobTransitionRequest,
  ListQuery,
  Page,
  Part,
  PurchaseOrder,
  StockBalance,
  TrainingSession,
  Vehicle,
  VehicleCreateRequest,
  VehicleUpdateRequest,
} from './types'

export interface ManagedUser {
  id: string
  email: string
  displayName: string
  preferredLocale: 'en' | 'ar'
  status: 'ACTIVE' | 'DISABLED'
  roles: string[]
  organizationScopeIds: string[]
  mustChangePassword: boolean
  studentId?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface Store {
  id: string
  organizationScopeId: string
  code: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface Bay {
  id: string
  organizationScopeId: string
  code: string
  name: string
  capacity: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface Course {
  id: string
  organizationScopeId: string
  code: string
  name: { en: string; ar?: string }
  termId: string
  description?: string
  tasks: Array<{ taskId: string; required: boolean }>
  minimumAttendancePercent: number
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
}

export interface Mentor {
  id: string
  displayName: string
}

export interface TrainingGroup {
  id: string
  name: string
  courseId: string
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  updatedAt: string
}

export interface WorkItem {
  id: string
  jobId: string
  description: string
  status: 'PENDING' | 'DONE' | 'CANCELLED'
  isAdditionalWork: boolean
  approvalId?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface LaborEntry {
  id: string
  jobId: string
  workItemId?: string
  workDate: string
  durationMinutes: number
  description?: string
  status: 'ACTIVE' | 'VOIDED'
  createdAt: string
  updatedAt: string
}

export interface Vendor {
  id: string
  code: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

// ── Customers ─────────────────────────────────────────────────────────
export const customersApi = {
  list: (q?: ListQuery) => api.get<Page<Customer>>('/customers', q),
  create: (body: CustomerCreateRequest) => api.post<Customer>('/customers', body),
  get: (customerId: string) => api.get<Customer>(`/customers/${customerId}`),
  update: (customerId: string, body: CustomerUpdateRequest) =>
    api.patch<Customer>(`/customers/${customerId}`, body),
  statement: (customerId: string, q?: Pick<ListQuery, 'from' | 'to'>) =>
    api.get(`/customers/${customerId}/statement`, q),
}

// ── Vehicles ──────────────────────────────────────────────────────────
export const vehiclesApi = {
  list: (q?: ListQuery) => api.get<Page<Vehicle>>('/vehicles', q),
  create: (body: VehicleCreateRequest) => api.post<Vehicle>('/vehicles', body),
  get: (vehicleId: string) => api.get<Vehicle>(`/vehicles/${vehicleId}`),
  // The backend accepts only plate, mileage, and status on a vehicle update.
  update: (vehicleId: string, body: VehicleUpdateRequest) =>
    api.patch<Vehicle>(`/vehicles/${vehicleId}`, body),
  serviceHistory: (vehicleId: string, q?: ListQuery) =>
    api.get(`/vehicles/${vehicleId}/service-history`, q),
  reminders: (vehicleId: string, q?: ListQuery) =>
    api.get(`/vehicles/${vehicleId}/reminders`, q),
  createReminder: (vehicleId: string, body: {
    title: string
    dueDate?: string
    dueMileage?: number
    notes?: string
  }) => api.post(`/vehicles/${vehicleId}/reminders`, body),
  updateReminder: (reminderId: string, body: {
    title?: string
    dueDate?: string
    dueMileage?: number
    notes?: string
    status?: 'DONE' | 'CANCELLED'
  }) => api.patch(`/service-reminders/${reminderId}`, body),
}

// ── Workshop jobs ─────────────────────────────────────────────────────
export const jobsApi = {
  list: (q?: ListQuery) => api.get<Page<JobCard>>('/job-cards', q),
  create: (body: JobCardCreateRequest) => api.post<JobCard>('/job-cards', body),
  get: (jobId: string) => api.get<JobCard>(`/job-cards/${jobId}`),
  update: (jobId: string, body: JobCardUpdateRequest) =>
    api.patch<JobCard>(`/job-cards/${jobId}`, body),
  assign: (jobId: string, body: {
    version: number
    bayId: string
    technicianId: string
    scheduledStartAt: string
    expectedCompletionAt: string
  }) => api.put<JobCard>(`/job-cards/${jobId}/assignment`, body),
  // Job stage changes are only supported by this endpoint.
  transition: (jobId: string, body: JobTransitionRequest) =>
    api.post<JobCard>(`/job-cards/${jobId}/transitions`, body),
  listTechnicians: (q?: ListQuery) => api.get<Page<Mentor>>('/technicians', q),
  workItems: (jobId: string, q?: ListQuery) =>
    api.get<Page<WorkItem>>(`/job-cards/${jobId}/work-items`, q),
  createWorkItem: (jobId: string, body: { description: string; isAdditionalWork?: boolean }) =>
    api.post<WorkItem>(`/job-cards/${jobId}/work-items`, body),
  updateWorkItem: (jobId: string, workItemId: string, body: {
    description?: string
    status?: 'PENDING' | 'DONE' | 'CANCELLED'
  }) => api.patch<WorkItem>(`/job-cards/${jobId}/work-items/${workItemId}`, body),
  stageHistory: (jobId: string, q?: ListQuery) =>
    api.get(`/job-cards/${jobId}/stage-history`, q),
}

export const approvalsApi = {
  list: (jobId: string, q?: ListQuery) => api.get(`/job-cards/${jobId}/approvals`, q),
  create: (jobId: string, body: { scope: string; requestedAmount?: { amount: string; currency: string }; notes?: string }) =>
    api.post(`/job-cards/${jobId}/approvals`, body),
  decide: (jobId: string, approvalId: string, body: { decision: 'APPROVED' | 'REJECTED'; reason?: string }) =>
    api.post(`/job-cards/${jobId}/approvals/${approvalId}/decision`, body),
}

// ── Inventory ─────────────────────────────────────────────────────────
export const inventoryApi = {
  parts: (q?: ListQuery) => api.get<Page<Part>>('/parts', q),
  getPart: (partId: string) => api.get<Part>(`/parts/${partId}`),
  createPart: (body: {
    sku: string
    barcode?: string
    name: { en: string; ar?: string }
    category: string
    unitOfMeasure: string
    sellingPrice: { amount: string; currency: string }
    compatibility?: Array<{ make: string; model?: string; yearFrom?: number; yearTo?: number }>
  }) => api.post<Part>('/parts', body),
  updatePart: (partId: string, body: {
    version: number
    barcode?: string
    name?: { en: string; ar?: string }
    category?: string
    sellingPrice?: { amount: string; currency: string }
    compatibility?: Array<{ make: string; model?: string; yearFrom?: number; yearTo?: number }>
    status?: 'ACTIVE' | 'ARCHIVED'
  }) => api.patch<Part>(`/parts/${partId}`, body),
  stores: (q?: ListQuery) => api.get<Page<Store>>('/stores', q),
  balances: (q?: ListQuery) => api.get<Page<StockBalance>>('/stock-balances', q),
  replaceLevels: (storeId: string, partId: string, body: { minLevel: number; maxLevel: number }) =>
    api.put(`/stock-balances/${storeId}/${partId}/levels`, body),
  movements: (q?: ListQuery) => api.get('/stock-movements', q),
  issuePart: (jobId: string, body: { partId: string; storeId: string; quantity: number; workItemId?: string; reservationId?: string }, key = newIdempotencyKey()) =>
    api.post(`/job-cards/${jobId}/part-issues`, body, { idempotencyKey: key }),
  partIssues: (jobId: string, q?: ListQuery) => api.get(`/job-cards/${jobId}/part-issues`, q),
  reversePartIssue: (jobId: string, partIssueId: string, body: { quantity: number; reason: string }, key = newIdempotencyKey()) =>
    api.post(`/job-cards/${jobId}/part-issues/${partIssueId}/reversals`, body, { idempotencyKey: key }),
  reservePart: (jobId: string, body: { partId: string; storeId: string; quantity: number; workItemId?: string }, key = newIdempotencyKey()) =>
    api.post(`/job-cards/${jobId}/part-reservations`, body, { idempotencyKey: key }),
  reservations: (jobId: string, q?: ListQuery) => api.get(`/job-cards/${jobId}/part-reservations`, q),
  releaseReservation: (jobId: string, reservationId: string) =>
    api.post(`/job-cards/${jobId}/part-reservations/${reservationId}/release`),
  stockAdjustments: (q?: ListQuery) => api.get('/stock-adjustments', q),
  createStockAdjustment: (body: unknown, key = newIdempotencyKey()) =>
    api.post('/stock-adjustments', body, { idempotencyKey: key }),
  decideStockAdjustment: (adjustmentId: string, body: { decision: 'APPROVED' | 'REJECTED'; reason?: string }) =>
    api.post(`/stock-adjustments/${adjustmentId}/decision`, body),
}

// ── Labor and quality ─────────────────────────────────────────────────
export const laborApi = {
  list: (jobId: string, q?: ListQuery) => api.get<Page<LaborEntry>>(`/job-cards/${jobId}/labor-entries`, q),
  create: (jobId: string, body: { workDate: string; durationMinutes: number; description?: string; workItemId?: string }) =>
    api.post<LaborEntry>(`/job-cards/${jobId}/labor-entries`, body),
  update: (jobId: string, laborEntryId: string, body: {
    workDate?: string
    durationMinutes?: number
    description?: string
    changeReason: string
  }) => api.patch<LaborEntry>(`/job-cards/${jobId}/labor-entries/${laborEntryId}`, body),
  void: (jobId: string, laborEntryId: string, reason: string) =>
    api.post<LaborEntry>(`/job-cards/${jobId}/labor-entries/${laborEntryId}/void`, { reason }),
}

export const qualityApi = {
  list: (jobId: string, q?: ListQuery) => api.get(`/job-cards/${jobId}/quality-checks`, q),
  create: (jobId: string, body: {
    result: 'PASSED' | 'FAILED'
    notes?: string
    evidenceAttachmentIds?: string[]
  }) => api.post(`/job-cards/${jobId}/quality-checks`, body),
}

// ── Procurement ───────────────────────────────────────────────────────
export const procurementApi = {
  orders: (q?: ListQuery) => api.get<Page<PurchaseOrder>>('/purchase-orders', q),
  getOrder: (purchaseOrderId: string) => api.get<PurchaseOrder>(`/purchase-orders/${purchaseOrderId}`),
  createOrder: (body: {
    vendorId: string
    storeId: string
    lines: Array<{ partId: string; quantityOrdered: number; unitCost: { amount: string; currency: string } }>
    expectedDeliveryDate?: string
    notes?: string
  }) => api.post<PurchaseOrder>('/purchase-orders', body),
  updateOrder: (purchaseOrderId: string, body: {
    version: number
    vendorId?: string
    lines?: Array<{ partId: string; quantityOrdered: number; unitCost: { amount: string; currency: string } }>
    expectedDeliveryDate?: string
    notes?: string
  }) => api.patch<PurchaseOrder>(`/purchase-orders/${purchaseOrderId}`, body),
  transitionOrder: (purchaseOrderId: string, body: { toStatus: 'PENDING_APPROVAL' | 'CANCELLED'; reason?: string }) =>
    api.post<PurchaseOrder>(`/purchase-orders/${purchaseOrderId}/transitions`, body),
  approvals: (purchaseOrderId: string, q?: ListQuery) =>
    api.get(`/purchase-orders/${purchaseOrderId}/approvals`, q),
  // REJECTED decisions require a reason in the backend DTO.
  decideOrder: (purchaseOrderId: string, body: { decision: 'APPROVED' | 'REJECTED'; reason?: string }) =>
    api.post(`/purchase-orders/${purchaseOrderId}/approvals`, body),
  goodsReceipts: (purchaseOrderId: string, q?: ListQuery) =>
    api.get(`/purchase-orders/${purchaseOrderId}/goods-receipts`, q),
  createGoodsReceipt: (purchaseOrderId: string, body: unknown, key = newIdempotencyKey()) =>
    api.post(`/purchase-orders/${purchaseOrderId}/goods-receipts`, body, { idempotencyKey: key }),
  vendors: (q?: ListQuery) => api.get<Page<Vendor>>('/vendors', q),
  createVendor: (body: { code: string; name: string; contactName?: string; phone?: string; email?: string }) =>
    api.post<Vendor>('/vendors', body),
  updateVendor: (vendorId: string, body: { name?: string; contactName?: string; phone?: string; email?: string; status?: 'ACTIVE' | 'INACTIVE' }) =>
    api.patch<Vendor>(`/vendors/${vendorId}`, body),
}

// ── Access management ─────────────────────────────────────────────────
export const usersApi = {
  list: (q?: ListQuery) => api.get<Page<ManagedUser>>('/users', q),
  get: (userId: string) => api.get<ManagedUser>(`/users/${userId}`),
  create: (body: { email: string; displayName: string; preferredLocale: 'en' | 'ar'; temporaryPassword: string }) =>
    api.post<ManagedUser>('/users', body),
  update: (userId: string, body: {
    displayName?: string
    preferredLocale?: 'en' | 'ar'
    status?: 'ACTIVE' | 'DISABLED'
    temporaryPassword?: string
  }) => api.patch<ManagedUser>(`/users/${userId}`, body),
  replaceRoles: (userId: string, roles: string[]) =>
    api.put<ManagedUser>(`/users/${userId}/roles`, { roles }),
  replaceScopes: (userId: string, organizationScopeIds: string[]) =>
    api.put<ManagedUser>(`/users/${userId}/organization-scopes`, { organizationScopeIds }),
  roles: () => api.get<{ items: Array<{ code: string; description: string; permissions: string[] }> }>('/roles'),
  organizationScopes: (q?: ListQuery) => api.get('/organization-scopes', q),
}

// ── Invoices ──────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (q?: ListQuery) => api.get<Page<Invoice>>('/invoices', q),
  get: (invoiceId: string) => api.get<Invoice>(`/invoices/${invoiceId}`),
  update: (invoiceId: string, body: { version: number; discount?: unknown; notes?: string }) =>
    api.patch<Invoice>(`/invoices/${invoiceId}`, body),
  transition: (invoiceId: string, body: { toStatus: 'ISSUED' | 'VOID'; reason?: string }) =>
    api.post<Invoice>(`/invoices/${invoiceId}/transitions`, body),
  recordPayment: (invoiceId: string, body: {
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
    reference: string
    amount: { amount: string; currency: string }
    paidAt: string
  }, key = newIdempotencyKey()) => api.post(`/invoices/${invoiceId}/payments`, body, { idempotencyKey: key }),
  summaryForJob: (jobId: string) => api.get(`/job-cards/${jobId}/invoice-summary`),
  regenerateForJob: (jobId: string) => api.post<Invoice>(`/job-cards/${jobId}/invoices`),
}

// ── Shared bays and training ──────────────────────────────────────────
export const baysApi = {
  list: (q?: ListQuery) => api.get<Page<Bay>>('/bays', q),
  create: (body: { organizationScopeId: string; code: string; name: string; capacity: number }) =>
    api.post<Bay>('/bays', body),
  update: (bayId: string, body: { name?: string; capacity?: number; status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' }) =>
    api.patch<Bay>(`/bays/${bayId}`, body),
  calendar: (bayId: string, q: { from: string; to: string }) => api.get(`/bays/${bayId}/calendar`, q),
}

export const trainingApi = {
  courses: (q?: ListQuery) => api.get<Page<Course>>('/courses', q),
  createCourse: (body: unknown) => api.post<Course>('/courses', body),
  updateCourse: (courseId: string, body: unknown) => api.patch<Course>(`/courses/${courseId}`, body),
  sessions: (q?: ListQuery) => api.get<Page<TrainingSession>>('/training-sessions', q),
  getSession: (sessionId: string) => api.get<TrainingSession>(`/training-sessions/${sessionId}`),
  createSession: (body: {
    title: string
    courseId: string
    groupId: string
    bayId: string
    mentorId: string
    startsAt: string
    endsAt: string
  }) => api.post<TrainingSession>('/training-sessions', body),
  // The implemented backend updates session details via PATCH. It does not
  // expose a training-session status-transition endpoint.
  updateSession: (sessionId: string, body: {
    version: number
    title?: string
    groupId?: string
    bayId?: string
    mentorId?: string
    startsAt?: string
    endsAt?: string
  }) => api.patch<TrainingSession>(`/training-sessions/${sessionId}`, body),
  students: (q?: ListQuery) => api.get('/students', q),
  mentors: (q?: ListQuery) => api.get<Page<Mentor>>('/mentors', q),
  groups: (q?: ListQuery) => api.get<Page<TrainingGroup>>('/training-groups', q),
  terms: (q?: ListQuery) => api.get('/training-terms', q),
  enrollments: (groupId: string, q?: ListQuery) => api.get(`/training-groups/${groupId}/enrollments`, q),
  createEnrollment: (groupId: string, studentId: string) =>
    api.post(`/training-groups/${groupId}/enrollments`, { studentId }),
  withdrawEnrollment: (enrollmentId: string, reason: string) =>
    api.patch(`/enrollments/${enrollmentId}`, { status: 'WITHDRAWN', reason }),
}

// ── Public system health ──────────────────────────────────────────────
export const healthApi = {
  live: () => api.get<HealthStatus>('/health', undefined, { public: true }),
  ready: () => api.get('/health/ready', undefined, { public: true }),
}
