import { request } from '../client'
import type { Schemas, Paginated } from './types'

export type Bay = Schemas['BayResponseDto']
export type ServiceType = Schemas['ServiceTypeResponseDto']
export type TechnicianProfile = Schemas['TechnicianProfileResponseDto']
export type OperatingHours = Schemas['OperatingHoursResponseDto']

export const baysV3 = {
  list: (query?: { page?: number; pageSize?: number; sort?: string; status?: string }, signal?: AbortSignal) =>
    request<Paginated<Bay>>('/bays', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  create: (payload: Schemas['CreateBayDto'], signal?: AbortSignal) =>
    request<Bay>('/bays', { method: 'POST', body: payload, signal }),
  update: (bayId: string, payload: Schemas['UpdateBayDto'], signal?: AbortSignal) =>
    request<Bay>(`/bays/${bayId}`, { method: 'PATCH', body: payload, signal }),
  calendar: (bayId: string, from: string, to: string, signal?: AbortSignal) =>
    request<Schemas['BayCalendarResponseDto']>(`/bays/${bayId}/calendar`, {
      query: { from, to },
      signal,
    }),
}

export const serviceTypesV3 = {
  list: (query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<ServiceType> | ServiceType[]>('/service-types', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  get: (id: string, signal?: AbortSignal) =>
    request<ServiceType>(`/service-types/${id}`, { signal }),
  create: (payload: Schemas['CreateServiceTypeDto'], signal?: AbortSignal) =>
    request<ServiceType>('/service-types', { method: 'POST', body: payload, signal }),
  update: (id: string, payload: Schemas['UpdateServiceTypeDto'], signal?: AbortSignal) =>
    request<ServiceType>(`/service-types/${id}`, { method: 'PATCH', body: payload, signal }),
}

export const technicianProfilesV3 = {
  list: (query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<TechnicianProfile>>('/technician-profiles', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  get: (id: string, signal?: AbortSignal) =>
    request<TechnicianProfile>(`/technician-profiles/${id}`, { signal }),
  create: (payload: Schemas['CreateTechnicianProfileDto'], signal?: AbortSignal) =>
    request<TechnicianProfile>('/technician-profiles', { method: 'POST', body: payload, signal }),
  update: (id: string, payload: Schemas['UpdateTechnicianProfileDto'], signal?: AbortSignal) =>
    request<TechnicianProfile>(`/technician-profiles/${id}`, { method: 'PATCH', body: payload, signal }),
}

export const operatingHoursV3 = {
  get: (signal?: AbortSignal) =>
    request<OperatingHours>('/config/operating-hours', { signal }),
  replace: (payload: Schemas['OperatingHoursUpdateDto'], signal?: AbortSignal) =>
    request<OperatingHours>('/config/operating-hours', { method: 'PUT', body: payload, signal }),
}

export const techniciansV3 = {
  /** Assignable-technician picker — NOT technician-profiles (per §10.6). */
  list: (query?: { page?: number; pageSize?: number; q?: string; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<Schemas['TechnicianSummaryResponseDto']>>('/technicians', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
}
