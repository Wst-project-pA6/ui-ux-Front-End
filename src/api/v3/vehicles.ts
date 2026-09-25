import { request } from '../client'
import type { Schemas, Paginated } from './types'

export type Vehicle = Schemas['VehicleResponseDto']
export type VehicleDetail = Schemas['VehicleDetailResponseDto']
export type CreateVehicle = Schemas['CreateVehicleDto']
export type UpdateVehicle = Schemas['UpdateVehicleDto']
export type ServiceReminder = Schemas['ServiceReminderResponseDto']
export type CreateReminder = Schemas['CreateServiceReminderDto']
export type UpdateReminder = Schemas['UpdateServiceReminderDto']

export interface VehicleQuery {
  page?: number
  pageSize?: number
  sort?: string
  q?: string
  customerId?: string
  plate?: string
  vin?: string
  make?: string
  model?: string
  status?: string
}

export const vehiclesV3 = {
  list: (query?: VehicleQuery, signal?: AbortSignal) =>
    request<Paginated<Vehicle>>('/vehicles', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  get: (vehicleId: string, signal?: AbortSignal) =>
    request<VehicleDetail>(`/vehicles/${vehicleId}`, { signal }),
  create: (payload: CreateVehicle, signal?: AbortSignal) =>
    request<Vehicle>(`/vehicles`, { method: 'POST', body: payload, signal }),
  update: (vehicleId: string, payload: UpdateVehicle, signal?: AbortSignal) =>
    request<Vehicle>(`/vehicles/${vehicleId}`, { method: 'PATCH', body: payload, signal }),
  serviceHistory: (vehicleId: string, query?: { page?: number; pageSize?: number; sort?: string }, signal?: AbortSignal) =>
    request<Schemas['ServiceHistoryListResponseDto']>(`/vehicles/${vehicleId}/service-history`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  reminders: (vehicleId: string, query?: { page?: number; pageSize?: number; status?: string }, signal?: AbortSignal) =>
    request<Paginated<ServiceReminder>>(`/vehicles/${vehicleId}/reminders`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  createReminder: (vehicleId: string, payload: CreateReminder, signal?: AbortSignal) =>
    request<ServiceReminder>(`/vehicles/${vehicleId}/reminders`, { method: 'POST', body: payload, signal }),
  updateReminder: (reminderId: string, payload: UpdateReminder, signal?: AbortSignal) =>
    request<ServiceReminder>(`/service-reminders/${reminderId}`, { method: 'PATCH', body: payload, signal }),
}
