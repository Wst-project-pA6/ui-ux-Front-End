import { request, fetchAuthenticatedBlob } from '../client'
import type { Schemas, Paginated } from '../v3/types'

export type DashboardData = Schemas['DashboardResponseDto']
export type ExportJob = Schemas['ExportJobResponseDto']
export type Prediction = Schemas['PredictionResponseDto']

type Q = Record<string, string | number | boolean | undefined>

export interface DashboardFilters {
  from?: string
  to?: string
  organizationScopeId?: string
  storeId?: string
  bayId?: string
  technicianId?: string
  courseId?: string
  termId?: string
}

export const dashboardsV3 = {
  workshop: (filters?: DashboardFilters, signal?: AbortSignal) =>
    request<DashboardData>('/dashboards/workshop', { query: filters as Q, signal }),
  inventoryFinance: (filters?: DashboardFilters, signal?: AbortSignal) =>
    request<DashboardData>('/dashboards/inventory-finance', { query: filters as Q, signal }),
  training: (filters?: DashboardFilters, signal?: AbortSignal) =>
    request<DashboardData>('/dashboards/training', { query: filters as Q, signal }),
  aiData: (filters?: DashboardFilters, signal?: AbortSignal) =>
    request<DashboardData>('/dashboards/ai-data', { query: filters as Q, signal }),
}

export const exportsV3 = {
  list: (
    query?: { page?: number; pageSize?: number; status?: string; exportType?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<ExportJob>>('/exports', { query: query as Q, signal }),
  create: (payload: Schemas['ExportJobCreateRequestDto'], signal?: AbortSignal) =>
    request<ExportJob>('/exports', { method: 'POST', body: payload, signal }),
  get: (id: string, signal?: AbortSignal) => request<ExportJob>(`/exports/${id}`, { signal }),
  authorizeDownload: (id: string, signal?: AbortSignal) =>
    request<{ url: string; expiresAt?: string }>(`/exports/${id}/download-authorizations`, {
      method: 'POST',
      signal,
    }),
  /** Authorize then fetch bytes with Bearer → blob URL (same pattern as attachments). */
  blobUrl: async (id: string): Promise<string> => {
    const { url } = await exportsV3.authorizeDownload(id)
    return fetchAuthenticatedBlob(url)
  },
}

export const predictionsV3 = {
  list: (
    query?: {
      page?: number; pageSize?: number; from?: string; to?: string; type?: string; status?: string;
      storeId?: string; partId?: string; studentId?: string; courseId?: string; riskLevel?: string; sort?: string;
    },
    signal?: AbortSignal,
  ) => request<Paginated<Prediction>>('/predictions', { query: query as Q, signal }),
  get: (id: string, signal?: AbortSignal) => request<Prediction>(`/predictions/${id}`, { signal }),
  decide: (id: string, payload: Schemas['PredictionDecisionRequestDto'], signal?: AbortSignal) =>
    request<Prediction>(`/predictions/${id}/decisions`, { method: 'POST', body: payload, signal }),
  run: (payload: Schemas['PredictionRunRequestDto'], signal?: AbortSignal) =>
    request<Schemas['PredictionRunResponseDto']>('/prediction-runs', { method: 'POST', body: payload, signal }),
  settings: (signal?: AbortSignal) =>
    request<Schemas['PredictionSettingsResponseDto']>('/config/prediction-settings', { signal }),
  updateSettings: (payload: Schemas['PredictionSettingsUpdateDto'], signal?: AbortSignal) =>
    request<Schemas['PredictionSettingsResponseDto']>('/config/prediction-settings', {
      method: 'PUT',
      body: payload,
      signal,
    }),
}
