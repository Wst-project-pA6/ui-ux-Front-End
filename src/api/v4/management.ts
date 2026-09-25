import { request, newIdempotencyKey } from '../client'
import type { Schemas, Paginated } from '../v3/types'

export type Invoice = Schemas['InvoiceResponseDto']
export type InvoiceSummary = Schemas['InvoiceSummaryResponseDto']

export const invoicesV3 = {
  list: (
    query?: {
      page?: number
      pageSize?: number
      from?: string
      to?: string
      status?: string
      jobId?: string
      customerId?: string
      invoiceNumber?: string
      sort?: string
    },
    signal?: AbortSignal,
  ) =>
    request<Paginated<Invoice>>('/invoices', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  get: (id: string, signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}`, { signal }),
  /** Edit DRAFT: discount + notes. version required. null discount removes it. */
  update: (id: string, payload: Schemas['InvoiceUpdateRequestDto'], signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: payload, signal }),
  transition: (id: string, payload: Schemas['InvoiceTransitionRequestDto'], signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}/transitions`, { method: 'POST', body: payload, signal }),
  issue: (id: string, signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}/transitions`, {
      method: 'POST',
      body: { toStatus: 'ISSUED' },
      signal,
    }),
  void: (id: string, reason: string, signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}/transitions`, {
      method: 'POST',
      body: { toStatus: 'VOID', reason },
      signal,
    }),
  addSublet: (id: string, payload: Schemas['SubletCostCreateRequestDto'], signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}/sublet-costs`, { method: 'POST', body: payload, signal }),
  /** DELETE with a reason body (per contract). */
  removeSublet: (id: string, subletId: string, reason: string, signal?: AbortSignal) =>
    request<Invoice>(`/invoices/${id}/sublet-costs/${subletId}`, {
      method: 'DELETE',
      body: { reason },
      signal,
    }),
  pay: (
    id: string,
    payload: Schemas['PaymentCreateRequestDto'],
    idempotencyKey: string = newIdempotencyKey(),
    signal?: AbortSignal,
  ) =>
    request<Invoice>(`/invoices/${id}/payments`, {
      method: 'POST',
      body: payload,
      idempotencyKey,
      signal,
    }),
  /** Live preview of what the draft will contain. Server-computed totals. */
  summary: (jobId: string, signal?: AbortSignal) =>
    request<InvoiceSummary>(`/job-cards/${jobId}/invoice-summary`, { signal }),
  /** Regenerate a new draft where the contract permits it (e.g. after void). */
  regenerate: (jobId: string, signal?: AbortSignal) =>
    request<Invoice>(`/job-cards/${jobId}/invoices`, { method: 'POST', signal }),
}

export const systemConfigV3 = {
  finance: (signal?: AbortSignal) =>
    request<Schemas['FinanceSettingsResponseDto']>('/config/finance-settings', { signal }),
  updateFinance: (payload: Schemas['FinanceSettingsUpdateDto'], signal?: AbortSignal) =>
    request<Schemas['FinanceSettingsResponseDto']>('/config/finance-settings', {
      method: 'PUT',
      body: payload,
      signal,
    }),
  dataQuality: (signal?: AbortSignal) =>
    request<Schemas['DataQualitySettingsResponseDto']>('/config/data-quality-settings', { signal }),
  updateDataQuality: (payload: Schemas['DataQualitySettingsUpdateDto'], signal?: AbortSignal) =>
    request<Schemas['DataQualitySettingsResponseDto']>('/config/data-quality-settings', {
      method: 'PUT',
      body: payload,
      signal,
    }),
}

export const usersV3 = {
  list: (
    query?: {
      page?: number
      pageSize?: number
      sort?: string
      q?: string
      role?: string
      status?: string
      organizationScopeId?: string
    },
    signal?: AbortSignal,
  ) =>
    request<Paginated<Schemas['UserResponseDto']>>('/users', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  get: (userId: string, signal?: AbortSignal) =>
    request<Schemas['UserResponseDto']>(`/users/${userId}`, { signal }),
  create: (payload: Schemas['CreateUserDto'], signal?: AbortSignal) =>
    request<Schemas['UserResponseDto']>('/users', { method: 'POST', body: payload, signal }),
  update: (userId: string, payload: Schemas['UpdateUserDto'], signal?: AbortSignal) =>
    request<Schemas['UserResponseDto']>(`/users/${userId}`, { method: 'PATCH', body: payload, signal }),
  replaceRoles: (userId: string, roles: string[], signal?: AbortSignal) =>
    request<Schemas['UserResponseDto']>(`/users/${userId}/roles`, {
      method: 'PUT',
      body: { roles },
      signal,
    }),
  replaceScopes: (userId: string, organizationScopeIds: string[], signal?: AbortSignal) =>
    request<Schemas['UserResponseDto']>(`/users/${userId}/organization-scopes`, {
      method: 'PUT',
      body: { organizationScopeIds },
      signal,
    }),
  roles: (signal?: AbortSignal) =>
    request<{ items?: Schemas['RoleResponseDto'][] } | Schemas['RoleResponseDto'][]>('/roles', { signal }),
  scopes: (query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<Schemas['ScopeResponseDto']>>('/organization-scopes', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
}

export { newIdempotencyKey }
