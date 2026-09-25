import { request } from './client'

/**
 * Typed wrappers around the WST backend REST contract.
 * Paths verified against the backend NestJS controllers (Wst-project-pA6/app).
 * All paths are relative to the API base (default `/api/v1`).
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface CurrentUser {
  id: string
  email: string
  name?: string
  roles?: string[]
}

export const authApi = {
  login: (email: string, password: string, signal?: AbortSignal) =>
    request<TokenPair>('/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
      skipAuthRefresh: true,
      signal,
    }),
  logout: (refreshToken: string, signal?: AbortSignal) =>
    request<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      skipAuthRefresh: true,
      signal,
    }),
  me: (signal?: AbortSignal) =>
    request<CurrentUser>('/auth/me', { signal }),
  changePassword: (
    currentPassword: string,
    newPassword: string,
    signal?: AbortSignal,
  ) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      signal,
    }),
}

// ── Customers ───────────────────────────────────────────────────────────────

export const customersApi = {
  list: (query?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    request<unknown[]>('/customers', { query, signal }),
  get: (customerId: string, signal?: AbortSignal) =>
    request<unknown>(`/customers/${customerId}`, { signal }),
  create: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/customers', { method: 'POST', body: payload, signal }),
  update: (customerId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/customers/${customerId}`, {
      method: 'PATCH',
      body: payload,
      signal,
    }),
}

// ── Vehicles ────────────────────────────────────────────────────────────────

export const vehiclesApi = {
  list: (query?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    request<unknown[]>('/vehicles', { query, signal }),
  get: (vehicleId: string, signal?: AbortSignal) =>
    request<unknown>(`/vehicles/${vehicleId}`, { signal }),
  create: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/vehicles', { method: 'POST', body: payload, signal }),
  update: (vehicleId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/vehicles/${vehicleId}`, {
      method: 'PATCH',
      body: payload,
      signal,
    }),
  serviceHistory: (vehicleId: string, signal?: AbortSignal) =>
    request<unknown[]>(`/vehicles/${vehicleId}/service-history`, { signal }),
}

// ── Job cards & workflow ────────────────────────────────────────────────────

export const jobsApi = {
  list: (query?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    request<unknown[]>('/job-cards', { query, signal }),
  get: (jobId: string, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}`, { signal }),
  create: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/job-cards', { method: 'POST', body: payload, signal }),
  update: (jobId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}`, {
      method: 'PATCH',
      body: payload,
      signal,
    }),
  transition: (jobId: string, to: string, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}/transitions`, {
      method: 'POST',
      body: { to },
      signal,
    }),
  stageHistory: (jobId: string, signal?: AbortSignal) =>
    request<unknown[]>(`/job-cards/${jobId}/stage-history`, { signal }),
  assign: (jobId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}/assignment`, {
      method: 'PUT',
      body: payload,
      signal,
    }),
  invoiceSummary: (jobId: string, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}/invoice-summary`, { signal }),
}

// ── Labor entries ───────────────────────────────────────────────────────────

export const laborApi = {
  list: (jobId: string, signal?: AbortSignal) =>
    request<unknown[]>(`/job-cards/${jobId}/labor-entries`, { signal }),
  create: (jobId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}/labor-entries`, {
      method: 'POST',
      body: payload,
      signal,
    }),
}

// ── Parts / inventory ───────────────────────────────────────────────────────

export const partsApi = {
  list: (query?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    request<unknown[]>('/parts', { query, signal }),
  get: (partId: string, signal?: AbortSignal) =>
    request<unknown>(`/parts/${partId}`, { signal }),
  create: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/parts', { method: 'POST', body: payload, signal }),
  update: (partId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/parts/${partId}`, {
      method: 'PATCH',
      body: payload,
      signal,
    }),
  issue: (jobId: string, payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>(`/job-cards/${jobId}/part-issues`, {
      method: 'POST',
      body: payload,
      signal,
    }),
  issues: (jobId: string, signal?: AbortSignal) =>
    request<unknown[]>(`/job-cards/${jobId}/part-issues`, { signal }),
  stockBalances: (query?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    request<unknown[]>('/stock-balances', { query, signal }),
  stores: (signal?: AbortSignal) => request<unknown[]>('/stores', { signal }),
}

export const baysApi = {
  list: (signal?: AbortSignal) => request<unknown[]>('/bays', { signal }),
}

// ── Purchasing ──────────────────────────────────────────────────────────────

export const purchasingApi = {
  vendors: (signal?: AbortSignal) => request<unknown[]>('/vendors', { signal }),
  createVendor: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/vendors', { method: 'POST', body: payload, signal }),
  orders: (signal?: AbortSignal) =>
    request<unknown[]>('/purchase-orders', { signal }),
  createOrder: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/purchase-orders', {
      method: 'POST',
      body: payload,
      signal,
    }),
  approve: (
    purchaseOrderId: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ) =>
    request<unknown>(`/purchase-orders/${purchaseOrderId}/approvals`, {
      method: 'POST',
      body: payload,
      signal,
    }),
  receive: (
    purchaseOrderId: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ) =>
    request<unknown>(`/purchase-orders/${purchaseOrderId}/goods-receipts`, {
      method: 'POST',
      body: payload,
      signal,
    }),
}

// ── Invoices ────────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (signal?: AbortSignal) => request<unknown[]>('/invoices', { signal }),
  get: (invoiceId: string, signal?: AbortSignal) =>
    request<unknown>(`/invoices/${invoiceId}`, { signal }),
}

// ── Training ────────────────────────────────────────────────────────────────

export const trainingApi = {
  courses: (signal?: AbortSignal) => request<unknown[]>('/courses', { signal }),
  sessions: (signal?: AbortSignal) =>
    request<unknown[]>('/training-sessions', { signal }),
  createSession: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/training-sessions', {
      method: 'POST',
      body: payload,
      signal,
    }),
  transitionSession: (
    sessionId: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ) =>
    request<unknown>(`/training-sessions/${sessionId}/transitions`, {
      method: 'POST',
      body: payload,
      signal,
    }),
  checkConflict: (sessionId: string, signal?: AbortSignal) =>
    request<unknown>(`/training-sessions/${sessionId}/conflict-check`, {
      method: 'POST',
      signal,
    }),
  students: (signal?: AbortSignal) =>
    request<unknown[]>('/students', { signal }),
  mentors: (signal?: AbortSignal) => request<unknown[]>('/mentors', { signal }),
  assessments: (signal?: AbortSignal) =>
    request<unknown[]>('/assessments', { signal }),
  signOffAssessment: (assessmentId: string, signal?: AbortSignal) =>
    request<unknown>(`/assessments/${assessmentId}/sign-off`, {
      method: 'POST',
      signal,
    }),
  competencies: (signal?: AbortSignal) =>
    request<unknown[]>('/competencies', { signal }),
  certificates: (signal?: AbortSignal) =>
    request<unknown[]>('/certificates', { signal }),
  issueCertificate: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/certificates', {
      method: 'POST',
      body: payload,
      signal,
    }),
}

// ── Dashboards / exports / predictions ──────────────────────────────────────

export const dashboardsApi = {
  workshop: (signal?: AbortSignal) =>
    request<unknown>('/dashboards/workshop', { signal }),
  inventoryFinance: (signal?: AbortSignal) =>
    request<unknown>('/dashboards/inventory-finance', { signal }),
  training: (signal?: AbortSignal) =>
    request<unknown>('/dashboards/training', { signal }),
}

export const exportsApi = {
  create: (payload: Record<string, unknown>, signal?: AbortSignal) =>
    request<unknown>('/exports', { method: 'POST', body: payload, signal }),
}

export const predictionsApi = {
  list: (signal?: AbortSignal) =>
    request<unknown[]>('/predictions', { signal }),
}
