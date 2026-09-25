import { request, newIdempotencyKey } from '../client'
import type { Schemas } from './types'
import type { Paginated } from './types'

export type Customer = Schemas['CustomerResponseDto']
export type CustomerList = Schemas['CustomerListResponseDto']
export type CreateCustomer = Schemas['CreateCustomerDto']
export type UpdateCustomer = Schemas['UpdateCustomerDto']

export interface CustomerQuery {
  page?: number
  pageSize?: number
  sort?: string
  q?: string
  status?: 'ACTIVE' | 'ARCHIVED'
  phone?: string
}

export const customersV3 = {
  list: (query?: CustomerQuery, signal?: AbortSignal) =>
    request<Paginated<Customer>>('/customers', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  get: (customerId: string, signal?: AbortSignal) =>
    request<Customer>(`/customers/${customerId}`, { signal }),
  create: (payload: CreateCustomer, signal?: AbortSignal) =>
    request<Customer>('/customers', { method: 'POST', body: payload, signal }),
  update: (customerId: string, payload: UpdateCustomer, signal?: AbortSignal) =>
    request<Customer>(`/customers/${customerId}`, { method: 'PATCH', body: payload, signal }),
  eraseContact: (customerId: string, reason: string, signal?: AbortSignal) =>
    request<Customer>(`/customers/${customerId}/contact-erasure`, {
      method: 'POST',
      body: { reason },
      signal,
    }),
  statement: (customerId: string, signal?: AbortSignal) =>
    request<Schemas['CustomerStatementResponseDto']>(`/customers/${customerId}/statement`, { signal }),
}

export { newIdempotencyKey }
