import { request } from '../client'

export interface RoleDto {
  code: string
  description: string
  permissions: string[]
}

export interface RoleListResponseDto {
  items: RoleDto[]
}

export async function getRoles() {
  return request<RoleListResponseDto>('/roles', { method: 'GET' })
}
