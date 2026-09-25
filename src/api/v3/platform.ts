import { request, fetchAuthenticatedBlob } from '../client'
import type { Schemas, Paginated } from './types'

export type Attachment = Schemas['AttachmentResponseDto']
export type Notification = Schemas['NotificationResponseDto']
export type AuditEvent = Schemas['AuditEventResponseDto']

export type AttachmentPurpose = 'JOB_PHOTO' | 'APPROVAL_EVIDENCE' | 'QUALITY_EVIDENCE' | 'TRAINING_EVIDENCE'

export const attachmentsV3 = {
  upload: (file: File, purpose: AttachmentPurpose, signal?: AbortSignal) => {
    const form = new FormData()
    form.append('file', file)
    form.append('purpose', purpose)
    return request<Attachment>('/attachments', { method: 'POST', body: form, multipart: true, signal })
  },
  get: (attachmentId: string, signal?: AbortSignal) =>
    request<Attachment>(`/attachments/${attachmentId}`, { signal }),
  authorizeDownload: (attachmentId: string, signal?: AbortSignal) =>
    request<Schemas['DownloadAuthorizationResponseDto']>(`/attachments/${attachmentId}/download-authorizations`, {
      method: 'POST',
      signal,
    }),
  /** Full flow: authorize then fetch bytes with Bearer → blob URL for <img>. */
  blobUrl: async (attachmentId: string): Promise<string> => {
    const { url } = await attachmentsV3.authorizeDownload(attachmentId)
    return fetchAuthenticatedBlob(url)
  },
}

export const notificationsV3 = {
  list: (query?: { page?: number; pageSize?: number; unread?: boolean }, signal?: AbortSignal) => {
    const q: Record<string, string | number | boolean | undefined> = {
      page: query?.page,
      pageSize: query?.pageSize,
    }
    if (query?.unread) q.unread = true
    return request<Paginated<Notification>>('/notifications', { query: q, signal })
  },
  unreadCount: async (signal?: AbortSignal): Promise<number> => {
    const res = await request<Paginated<Notification>>('/notifications', {
      query: { unread: true, page: 1, pageSize: 1 },
      signal,
    })
    return res.page.totalItems
  },
  markRead: (notificationId: string, signal?: AbortSignal) =>
    request<Notification>(`/notifications/${notificationId}/read`, { method: 'POST', signal }),
}

export const auditV3 = {
  list: (
    query?: {
      page?: number
      pageSize?: number
      from?: string
      to?: string
      actorUserId?: string
      action?: string
      entityType?: string
      entityId?: string
      outcome?: string
      sort?: string
    },
    signal?: AbortSignal,
  ) =>
    request<Paginated<AuditEvent>>('/audit-events', {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  get: (auditEventId: string, signal?: AbortSignal) =>
    request<AuditEvent>(`/audit-events/${auditEventId}`, { signal }),
}
