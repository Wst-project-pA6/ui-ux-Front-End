export interface ApiErrorDetail {
  field?: string
  code?: string
  message?: string
}

export interface ApiErrorBody {
  code: string
  message: string
  requestId?: string
  details?: ApiErrorDetail[]
  /** Present on 409 SCHEDULE_CONFLICT from PUT /job-cards/{id}/assignment. */
  conflicts?: ScheduleConflict[]
}

export interface ScheduleConflict {
  conflictKey?: string
  kind: string
  overridable?: boolean
  overridden?: boolean
  message?: string
  bayId?: string
  conflictingReference?: Record<string, unknown>
}

/**
 * Typed API error thrown by the API client for non-2xx responses.
 * `status === 0` means the request never reached the server (network error).
 * Backend errors follow { code, message, requestId, details?, conflicts? }.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfterSeconds?: number
  readonly requestId?: string
  readonly details?: ApiErrorDetail[]
  readonly conflicts?: ScheduleConflict[]

  constructor(opts: {
    message: string
    code: string
    status: number
    retryAfterSeconds?: number
    requestId?: string
    details?: ApiErrorDetail[]
    conflicts?: ScheduleConflict[]
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.code = opts.code
    this.status = opts.status
    this.retryAfterSeconds = opts.retryAfterSeconds
    this.requestId = opts.requestId
    this.details = opts.details
    this.conflicts = opts.conflicts
  }

  static fromBody(
    status: number,
    body: ApiErrorBody,
    retryAfterSeconds?: number,
  ): ApiError {
    return new ApiError({
      message: body.message,
      code: body.code,
      status,
      retryAfterSeconds,
      requestId: body.requestId,
      details: body.details,
      conflicts: body.conflicts,
    })
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'UNAUTHENTICATED'
  }

  get isForbidden(): boolean {
    return this.status === 403
  }
}
