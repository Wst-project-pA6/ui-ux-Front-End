import { request, newIdempotencyKey } from '../client'
import type { Schemas, Paginated } from './types'

export type Part = Schemas['PartResponseDto']
export type Store = Schemas['StoreResponseDto']
export type StockBalance = Schemas['StockBalanceResponseDto']
export type StockMovement = Schemas['StockMovementResponseDto']
export type StockCount = Schemas['StockCountResponseDto']
export type StockAdjustment = Schemas['StockAdjustmentResponseDto']

export const inventoryV3 = {
  parts: (query?: { page?: number; pageSize?: number; q?: string; sku?: string; barcode?: string; category?: string; compatibleMake?: string; compatibleModel?: string; status?: string; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<Part>>('/parts', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  part: (partId: string, signal?: AbortSignal) =>
    request<Part>(`/parts/${partId}`, { signal }),
  createPart: (payload: Schemas['CreatePartDto'], signal?: AbortSignal) =>
    request<Part>('/parts', { method: 'POST', body: payload, signal }),
  updatePart: (partId: string, payload: Schemas['UpdatePartDto'], signal?: AbortSignal) =>
    request<Part>(`/parts/${partId}`, { method: 'PATCH', body: payload, signal }),

  stores: (query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<Store>>('/stores', { query: query as Record<string, string | number | boolean | undefined>, signal }),

  balances: (query?: { page?: number; pageSize?: number; q?: string; storeId?: string; partId?: string; category?: string; belowMinimum?: boolean; stockedOut?: boolean; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<StockBalance>>('/stock-balances', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  replaceLevels: (storeId: string, partId: string, payload: Schemas['StockLevelsUpdateRequest'], signal?: AbortSignal) =>
    request<StockBalance>(`/stock-balances/${storeId}/${partId}/levels`, { method: 'PUT', body: payload, signal }),
  reconciliation: (storeId?: string, signal?: AbortSignal) =>
    request<Schemas['StockReconciliationResponseDto']>('/stock-balances/reconciliation', {
      query: storeId ? { storeId } : undefined,
      signal,
    }),

  movements: (query?: { page?: number; pageSize?: number; from?: string; to?: string; storeId?: string; partId?: string; type?: string; jobId?: string; purchaseOrderId?: string; goodsReceiptId?: string; stockAdjustmentId?: string; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<StockMovement>>('/stock-movements', { query: query as Record<string, string | number | boolean | undefined>, signal }),

  counts: (query?: { page?: number; pageSize?: number; storeId?: string; partId?: string }, signal?: AbortSignal) =>
    request<Paginated<StockCount>>('/stock-counts', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  createCount: (payload: Schemas['StockCountCreateRequest'], signal?: AbortSignal) =>
    request<StockCount>('/stock-counts', { method: 'POST', body: payload, signal }),

  adjustments: (query?: { page?: number; pageSize?: number; status?: string; storeId?: string; partId?: string }, signal?: AbortSignal) =>
    request<Paginated<StockAdjustment>>('/stock-adjustments', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  createAdjustment: (payload: Schemas['StockAdjustmentCreateRequest'], idempotencyKey: string = newIdempotencyKey(), signal?: AbortSignal) =>
    request<StockAdjustment>('/stock-adjustments', { method: 'POST', body: payload, idempotencyKey, signal }),
  decideAdjustment: (adjustmentId: string, payload: Schemas['StockAdjustmentDecisionRequest'], signal?: AbortSignal) =>
    request<StockAdjustment>(`/stock-adjustments/${adjustmentId}/decision`, { method: 'POST', body: payload, signal }),
}

export { newIdempotencyKey }
