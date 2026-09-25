import { request } from './client'

/**
 * Auth helpers — exact v1 contract (login/logout/refresh/me/change-password).
 * All other domains moved to typed contract modules:
 * - src/api/v3/* (customers, vehicles, workshop, jobs, platform, inventory)
 * - src/api/v4/* (purchasing, invoices/management)
 * Legacy untyped helpers were removed: several contradicted the Final
 * contract (e.g. job transitions without expectedFromStage).
 */

export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: number
  mustChangePassword?: boolean
}

export interface CurrentUser {
  id: string
  email: string
  displayName?: string
  roles?: string[]
  permissions?: string[]
  organizationScopeIds?: string[]
  mustChangePassword?: boolean
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

export { customersV3 as customersApi } from './v3/customers'
export { vehiclesV3 as vehiclesApi } from './v3/vehicles'
export { jobsV3 as jobsApi } from './v3/jobs'
export { inventoryV3 as partsApi } from './v3/inventory'
export { baysV3 as baysApi } from './v3/workshop'
export { vendorsV3, purchaseOrdersV3 } from './v4/purchasing'
export { invoicesV3 } from './v4/management'
