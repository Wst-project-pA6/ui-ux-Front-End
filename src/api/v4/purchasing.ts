import { request, newIdempotencyKey } from '../client'
import type { Schemas, Paginated } from '../v3/types'

export type Vendor = Schemas['VendorResponseDto']
export type PurchaseOrder = Schemas['PurchaseOrderResponseDto']
export type PurchaseOrderLine = Schemas['PurchaseOrderLineResponseDto']
export type PurchaseApproval = Schemas['PurchaseApprovalResponseDto']
export type GoodsReceipt = Schemas['GoodsReceiptResponseDto']
export type ApprovalPolicy = Schemas['PurchaseApprovalPolicyResponseDto']

export const vendorsV3 = {
  list: (
    query?: { page?: number; pageSize?: number; query?: string; status?: string; sort?: string },
    signal?: AbortSignal,
  ) =>
    request<Paginated<Vendor>>('/vendors', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  create: (payload: Schemas['VendorCreateDto'], signal?: AbortSignal) =>
    request<Vendor>('/vendors', { method: 'POST', body: payload, signal }),
  update: (vendorId: string, payload: Schemas['VendorUpdateDto'], signal?: AbortSignal) =>
    request<Vendor>(`/vendors/${vendorId}`, { method: 'PATCH', body: payload, signal }),
}

export const purchaseOrdersV3 = {
  list: (
    query?: {
      page?: number
      pageSize?: number
      from?: string
      to?: string
      status?: string
      vendorId?: string
      storeId?: string
      poNumber?: string
      sort?: string
    },
    signal?: AbortSignal,
  ) =>
    request<Paginated<PurchaseOrder>>('/purchase-orders', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  get: (id: string, signal?: AbortSignal) =>
    request<PurchaseOrder>(`/purchase-orders/${id}`, { signal }),
  create: (payload: Schemas['PurchaseOrderCreateDto'], signal?: AbortSignal) =>
    request<PurchaseOrder>('/purchase-orders', { method: 'POST', body: payload, signal }),
  update: (id: string, payload: Schemas['PurchaseOrderUpdateDto'], signal?: AbortSignal) =>
    request<PurchaseOrder>(`/purchase-orders/${id}`, { method: 'PATCH', body: payload, signal }),
  /** Delete = discard a DRAFT (creator only). No cancel transition in v4. */
  remove: (id: string, signal?: AbortSignal) =>
    request<void>(`/purchase-orders/${id}`, { method: 'DELETE', signal }),
  submit: (id: string, signal?: AbortSignal) =>
    request<PurchaseOrder>(`/purchase-orders/${id}/transitions`, {
      method: 'POST',
      body: { toStatus: 'PENDING_APPROVAL' },
      signal,
    }),
  approvals: (id: string, query?: { page?: number; pageSize?: number; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<PurchaseApproval>>(`/purchase-orders/${id}/approvals`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  decide: (id: string, payload: Schemas['PurchaseApprovalRequestDto'], signal?: AbortSignal) =>
    request<PurchaseApproval>(`/purchase-orders/${id}/approvals`, { method: 'POST', body: payload, signal }),
  receipts: (id: string, query?: { page?: number; pageSize?: number; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<GoodsReceipt>>(`/purchase-orders/${id}/goods-receipts`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  receive: (
    id: string,
    payload: Schemas['GoodsReceiptCreateDto'],
    idempotencyKey: string = newIdempotencyKey(),
    signal?: AbortSignal,
  ) =>
    request<GoodsReceipt>(`/purchase-orders/${id}/goods-receipts`, {
      method: 'POST',
      body: payload,
      idempotencyKey,
      signal,
    }),
  closeRemainder: (
    id: string,
    lineId: string,
    reason: string,
    signal?: AbortSignal,
  ) =>
    request<PurchaseOrder>(`/purchase-orders/${id}/lines/${lineId}/remainder-closure`, {
      method: 'POST',
      body: { reason },
      signal,
    }),
}

export const purchasePolicyV3 = {
  get: (signal?: AbortSignal) =>
    request<ApprovalPolicy>('/config/purchase-approval-policy', { signal }),
  update: (payload: Schemas['PurchaseApprovalPolicyUpdateDto'], signal?: AbortSignal) =>
    request<ApprovalPolicy>('/config/purchase-approval-policy', { method: 'PUT', body: payload, signal }),
}

export { newIdempotencyKey }
