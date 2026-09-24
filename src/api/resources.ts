// Resource clients — one function per contract operationId used by the UI.
// Naming: <operationId>(params). Only documented query filters are sent;
// unknown filters/sorts return 400, so callers must not invent new ones.
import { api, newIdempotencyKey } from './http'
import type {
  Customer, CustomerCreateRequest, CustomerUpdateRequest,
  Vehicle, VehicleCreateRequest, VehicleUpdateRequest,
  JobCard, JobCardCreateRequest, JobCardUpdateRequest, JobTransitionRequest,
  Part, StockBalance, PurchaseOrder,
  Invoice, TrainingSession, DashboardResponse, HealthStatus,
  Assessment,
  SystemUser, UserCreateRequest, UserUpdateRequest, RoleInfo, OrgScope,
  ListQuery, Page,
} from './types'

// ── Customers ─────────────────────────────────────────────────────────
export const customersApi = {
  list: (q?: ListQuery) => api.get<Page<Customer>>('/customers', q),
  create: (body: CustomerCreateRequest) => api.post<Customer>('/customers', body),
  get: (customerId: string) => api.get<Customer>(`/customers/${customerId}`),
  // ARCHIVED with open jobs -> 409 RESOURCE_IN_USE (handled by caller).
  update: (customerId: string, body: CustomerUpdateRequest) =>
    api.patch<Customer>(`/customers/${customerId}`, body),
}

// ── Vehicles ──────────────────────────────────────────────────────────
export const vehiclesApi = {
  list: (q?: ListQuery) => api.get<Page<Vehicle>>('/vehicles', q),
  create: (body: VehicleCreateRequest) => api.post<Vehicle>('/vehicles', body),
  get: (vehicleId: string) => api.get<Vehicle>(`/vehicles/${vehicleId}`),
  // mileage may only increase (422); archiving with open jobs -> 409.
  update: (vehicleId: string, body: VehicleUpdateRequest) =>
    api.patch<Vehicle>(`/vehicles/${vehicleId}`, body),
  serviceHistory: (vehicleId: string, q?: ListQuery) =>
    api.get(`/vehicles/${vehicleId}/service-history`, q),
}

// ── Workshop jobs ─────────────────────────────────────────────────────
// Stage changes NEVER go through PATCH — only POST .../transitions.
// Updates require `version`; stale version -> 409 VERSION_CONFLICT.
export const jobsApi = {
  list: (q?: ListQuery) => api.get<Page<JobCard>>('/job-cards', q),
  create: (body: JobCardCreateRequest) => api.post<JobCard>('/job-cards', body),
  get: (jobId: string) => api.get<JobCard>(`/job-cards/${jobId}`),
  update: (jobId: string, body: JobCardUpdateRequest) =>
    api.patch<JobCard>(`/job-cards/${jobId}`, body),
  assign: (jobId: string, body: { bayId?: string; technicianId?: string; scheduledStartAt?: string; scheduledEndAt?: string }) =>
    api.put<JobCard>(`/job-cards/${jobId}/assignment`, body),
  transition: (jobId: string, body: JobTransitionRequest) =>
    api.post<JobCard>(`/job-cards/${jobId}/transitions`, body),
  listTechnicians: (q?: ListQuery) => api.get('/technicians', q),
}

// ── Inventory ─────────────────────────────────────────────────────────
export const inventoryApi = {
  parts: (q?: ListQuery) => api.get<Page<Part>>('/parts', q),
  // Contract PartCreateRequest: sku, name{en,ar?}, category, unitOfMeasure, sellingPrice{Money}.
  createPart: (body: { sku: string; name: { en: string }; category: string; unitOfMeasure: string; sellingPrice: { amount: string; currency: string } }) =>
    api.post<Part>('/parts', body),
  balances: (q?: ListQuery) => api.get<Page<StockBalance>>('/stock-balances', q),
  // Stock-changing POST — send Idempotency-Key (replay-safe).
  issuePart: (jobId: string, body: { partId: string; storeId: string; quantity: number }, key = newIdempotencyKey()) =>
    api.post(`/job-cards/${jobId}/part-issues`, body, { idempotencyKey: key }),
}

// ── Labor ─────────────────────────────────────────────────────────────
export const laborApi = {
  create: (jobId: string, body: { description: string; hours: number; rate: { amount: string; currency: string }; note?: string }) =>
    api.post(`/job-cards/${jobId}/labor-entries`, body),
}

// ── Procurement ───────────────────────────────────────────────────────
export const procurementApi = {
  orders: (q?: ListQuery) => api.get<Page<PurchaseOrder>>('/purchase-orders', q),
  // Contract PurchaseOrderCreateRequest: vendorId, storeId, lines[] (+optional dates/notes).
  createOrder: (body: { vendorId: string; storeId: string; lines: Array<{ partId?: string; partName: string; quantity: number; unitPrice: { amount: string; currency: string } }>; expectedDeliveryDate?: string; notes?: string }) =>
    api.post<PurchaseOrder>('/purchase-orders', body),
  vendors: (q?: ListQuery) => api.get('/vendors', q),
}

// ── Invoices ──────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (q?: ListQuery) => api.get<Page<Invoice>>('/invoices', q),
  get: (invoiceId: string) => api.get<Invoice>(`/invoices/${invoiceId}`),
  // Full payments only (contract: partial payments are Stretch/out of scope).
  recordPayment: (
    invoiceId: string,
    body: { method: string; reference: string; amount: { amount: string; currency: string } },
    key = newIdempotencyKey(),
  ) => api.post(`/invoices/${invoiceId}/payments`, body, { idempotencyKey: key }),
}

// ── Training ──────────────────────────────────────────────────────────
export const trainingApi = {
  sessions: (q?: ListQuery) => api.get<Page<TrainingSession>>('/training-sessions', q),
  // Contract TrainingSessionCreateRequest: title, courseId, groupId, bayId,
  // mentorId, startsAt, endsAt. Bay/mentor conflicts -> 409 SCHEDULE_CONFLICT.
  createSession: (body: { title: string; courseId: string; groupId: string; bayId: string; mentorId: string; startsAt: string; endsAt: string }) =>
    api.post<TrainingSession>('/training-sessions', body),
  // Stage changes only via transitions (never PATCH of status).
  // PUBLISHED with bay/mentor overlap -> 409 SCHEDULE_CONFLICT.
  transitionSession: (sessionId: string, body: { toStatus: 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' }) =>
    api.post<TrainingSession>(`/training-sessions/${sessionId}/transitions`, body),
  // Updates require `version`; stale -> 409 VERSION_CONFLICT.
  updateSession: (sessionId: string, body: { version: number; bayId?: string; mentorId?: string; startsAt?: string; endsAt?: string }) =>
    api.patch<TrainingSession>(`/training-sessions/${sessionId}`, body),
  students: (q?: ListQuery) => api.get('/students', q),
  courses: (q?: ListQuery) => api.get('/courses', q),
}

// ── Assessments & certificates ────────────────────────────────────────
export const assessmentsApi = {
  // GET /assessments is permission-scoped server-side: a student actor is
  // automatically restricted to their own studentId (students.self), while
  // training.read sees the full list. Same endpoint, different data.
  list: (q?: ListQuery) => api.get<Page<Assessment>>('/assessments', q),
  // Supervisor sign-off: unsigned results stay pending and cannot count
  // toward certification (WST-FR-11). Locked/revoked -> 409/422.
  signOff: (assessmentId: string, body: { decision: 'SIGNED' | 'REJECTED'; note?: string }) =>
    api.post(`/assessments/${assessmentId}/sign-off`, body),
}

export const certificatesApi = {
  // Only after all required signed results (WST-FR-12); otherwise 422
  // CERTIFICATE_NOT_ELIGIBLE. Idempotent — safe to retry.
  issue: (body: { studentId: string; courseId: string }, key = newIdempotencyKey()) =>
    api.post('/certificates', body, { idempotencyKey: key }),
}

// ── Users / Roles / Organization scopes (Final v1, SYSTEM_ADMIN only) ─
export const usersApi = {
  // q, role, status (ACTIVE|DISABLED), organizationScopeId, sort; page envelope.
  list: (q?: ListQuery) => api.get<Page<SystemUser>>('/users', q),
  create: (body: UserCreateRequest) => api.post<SystemUser>('/users', body),
  get: (userId: string) => api.get<SystemUser>(`/users/${userId}`),
  // Send only changed fields. status DISABLED logs the user out everywhere.
  // temporaryPassword = admin reset (user must change at next sign-in).
  update: (userId: string, body: UserUpdateRequest) =>
    api.patch<SystemUser>(`/users/${userId}`, body),
  // Replaces the whole role list.
  setRoles: (userId: string, roles: string[]) =>
    api.put<SystemUser>(`/users/${userId}/roles`, { roles }),
  // Replaces the whole scope list.
  setScopes: (userId: string, organizationScopeIds: string[]) =>
    api.put<SystemUser>(`/users/${userId}/organization-scopes`, { organizationScopeIds }),
}

export const rolesApi = {
  list: () => api.get<{ items: RoleInfo[] }>('/roles'),
}

export const scopesApi = {
  list: () => api.get<{ items: OrgScope[] }>('/organization-scopes'),
}

// ── Dashboards (role-scoped; 403 without the dashboard permission) ─────
export const dashboardsApi = {
  workshop: (q?: ListQuery) => api.get<DashboardResponse>('/dashboards/workshop', q),
  inventoryFinance: (q?: ListQuery) => api.get<DashboardResponse>('/dashboards/inventory-finance', q),
  training: (q?: ListQuery) => api.get<DashboardResponse>('/dashboards/training', q),
  aiData: (q?: ListQuery) => api.get<DashboardResponse>('/dashboards/ai-data', q),
}

// ── Exports (async: 202 -> poll -> download authorization) ─────────────
export const exportsApi = {
  create: (body: { exportType: string; format: 'CSV' | 'PDF'; filters?: Record<string, unknown> }) =>
    api.post<{ id: string; status: string }>('/exports', body),
  get: (exportJobId: string) => api.get<{ id: string; status: string }>(`/exports/${exportJobId}`),
  authorizeDownload: (exportJobId: string) =>
    api.post<{ url: string; expiresAt: string }>(`/exports/${exportJobId}/download-authorizations`),
}

// ── System health (public) ────────────────────────────────────────────
export const healthApi = {
  live: () => api.get<HealthStatus>('/health', undefined, { public: true }),
  ready: () => api.get('/health/ready', undefined, { public: true }),
}
