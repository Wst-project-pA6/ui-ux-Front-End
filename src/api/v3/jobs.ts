import { request, newIdempotencyKey } from '../client'
import type { Schemas, Paginated } from './types'

export type JobCard = Schemas['JobResponseDto']
export type CreateJobCard = Schemas['CreateJobCardDto']
export type UpdateJobCard = Schemas['UpdateJobCardDto']
export type WorkItem = Schemas['WorkItemResponseDto']
export type Approval = Schemas['JobApprovalResponseDto']
export type LaborEntry = Schemas['LaborEntryResponseDto']
export type PartReservation = Schemas['PartReservationResponseDto']
export type PartIssue = Schemas['PartIssueResponseDto']
export type QualityCheck = Schemas['QualityCheckResponseDto']

export interface JobQuery {
  page?: number
  pageSize?: number
  sort?: string
  q?: string
  from?: string
  to?: string
  stage?: string
  priority?: string
  jobNumber?: string
  technicianId?: string
  bayId?: string
  vehicleId?: string
  customerId?: string
}

export const jobsV3 = {
  list: (query?: JobQuery, signal?: AbortSignal) =>
    request<Paginated<JobCard>>('/job-cards', { query: query as Record<string, string | number | boolean | undefined>, signal }),
  get: (jobId: string, signal?: AbortSignal) =>
    request<JobCard>(`/job-cards/${jobId}`, { signal }),
  create: (payload: CreateJobCard, signal?: AbortSignal) =>
    request<JobCard>('/job-cards', { method: 'POST', body: payload, signal }),
  update: (jobId: string, payload: UpdateJobCard, signal?: AbortSignal) =>
    request<JobCard>(`/job-cards/${jobId}`, { method: 'PATCH', body: payload, signal }),
  assign: (jobId: string, payload: Schemas['JobAssignmentDto'], signal?: AbortSignal) =>
    request<JobCard>(`/job-cards/${jobId}/assignment`, { method: 'PUT', body: payload, signal }),
  transition: (jobId: string, payload: Schemas['JobTransitionRequest'], signal?: AbortSignal) =>
    request<JobCard>(`/job-cards/${jobId}/transitions`, { method: 'POST', body: payload, signal }),
  stageHistory: (jobId: string, query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<Schemas['JobStageEventResponseDto']>>(`/job-cards/${jobId}/stage-history`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),

  // Work items — POST requires approvalId (v3 change), no isAdditionalWork
  workItems: (jobId: string, query?: { page?: number; pageSize?: number; status?: string }, signal?: AbortSignal) =>
    request<Paginated<WorkItem>>(`/job-cards/${jobId}/work-items`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  createWorkItem: (jobId: string, payload: Schemas['WorkItemCreateDto'], signal?: AbortSignal) =>
    request<WorkItem>(`/job-cards/${jobId}/work-items`, { method: 'POST', body: payload, signal }),
  updateWorkItem: (jobId: string, workItemId: string, payload: Schemas['UpdateWorkItemDto'], signal?: AbortSignal) =>
    request<WorkItem>(`/job-cards/${jobId}/work-items/${workItemId}`, { method: 'PATCH', body: payload, signal }),

  // Approvals
  approvals: (jobId: string, query?: { page?: number; pageSize?: number; status?: string; scope?: string }, signal?: AbortSignal) =>
    request<Paginated<Approval>>(`/job-cards/${jobId}/approvals`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  createApproval: (jobId: string, payload: Schemas['JobApprovalCreateRequest'], signal?: AbortSignal) =>
    request<Approval>(`/job-cards/${jobId}/approvals`, { method: 'POST', body: payload, signal }),
  decideApproval: (jobId: string, approvalId: string, payload: Schemas['JobApprovalDecisionRequest'], signal?: AbortSignal) =>
    request<Approval>(`/job-cards/${jobId}/approvals/${approvalId}/decision`, { method: 'POST', body: payload, signal }),
  withdrawApproval: (jobId: string, approvalId: string, payload: Schemas['JobApprovalWithdrawalRequest'], signal?: AbortSignal) =>
    request<Approval>(`/job-cards/${jobId}/approvals/${approvalId}/withdrawal`, { method: 'POST', body: payload, signal }),

  // Labor
  labor: (jobId: string, query?: { page?: number; pageSize?: number; status?: string; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<LaborEntry>>(`/job-cards/${jobId}/labor-entries`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  logLabor: (jobId: string, payload: Schemas['LaborEntryCreateRequest'], signal?: AbortSignal) =>
    request<LaborEntry>(`/job-cards/${jobId}/labor-entries`, { method: 'POST', body: payload, signal }),
  correctLabor: (jobId: string, laborEntryId: string, payload: Schemas['LaborEntryUpdateRequest'], signal?: AbortSignal) =>
    request<LaborEntry>(`/job-cards/${jobId}/labor-entries/${laborEntryId}`, { method: 'PATCH', body: payload, signal }),
  voidLabor: (jobId: string, laborEntryId: string, payload: Schemas['VoidLaborEntryRequest'], signal?: AbortSignal) =>
    request<LaborEntry>(`/job-cards/${jobId}/labor-entries/${laborEntryId}/void`, { method: 'POST', body: payload, signal }),

  // Parts on a job
  reservations: (jobId: string, query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<PartReservation>>(`/job-cards/${jobId}/part-reservations`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  reserve: (jobId: string, payload: Schemas['PartReservationCreateRequest'], idempotencyKey: string = newIdempotencyKey(), signal?: AbortSignal) =>
    request<PartReservation>(`/job-cards/${jobId}/part-reservations`, { method: 'POST', body: payload, idempotencyKey, signal }),
  releaseReservation: (jobId: string, reservationId: string, signal?: AbortSignal) =>
    request<PartReservation>(`/job-cards/${jobId}/part-reservations/${reservationId}/release`, { method: 'POST', signal }),
  issues: (jobId: string, query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<PartIssue>>(`/job-cards/${jobId}/part-issues`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  issue: (jobId: string, payload: Schemas['PartIssueCreateRequest'], idempotencyKey: string = newIdempotencyKey(), signal?: AbortSignal) =>
    request<PartIssue>(`/job-cards/${jobId}/part-issues`, { method: 'POST', body: payload, idempotencyKey, signal }),
  reverseIssue: (jobId: string, partIssueId: string, payload: Schemas['PartIssueReversalRequest'], idempotencyKey: string = newIdempotencyKey(), signal?: AbortSignal) =>
    request<Schemas['PartIssueReversalResponseDto']>(`/job-cards/${jobId}/part-issues/${partIssueId}/reversals`, {
      method: 'POST',
      body: payload,
      idempotencyKey,
      signal,
    }),

  // Quality
  qualityChecks: (jobId: string, query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<QualityCheck>>(`/job-cards/${jobId}/quality-checks`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  recordQuality: (jobId: string, payload: Schemas['QualityCheckCreateRequest'], signal?: AbortSignal) =>
    request<QualityCheck>(`/job-cards/${jobId}/quality-checks`, { method: 'POST', body: payload, signal }),

  // Photos / evidence linkage
  jobAttachments: (jobId: string, query?: { page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<Schemas['AttachmentResponseDto']>>(`/job-cards/${jobId}/attachments`, {
      query: query as Record<string, string | number | boolean | undefined>,
      signal,
    }),
  linkAttachments: (jobId: string, attachmentIds: string[], signal?: AbortSignal) =>
    request<Paginated<Schemas['AttachmentResponseDto']> | Schemas['AttachmentResponseDto'][] | { attachmentIds: string[] }>(`/job-cards/${jobId}/attachments`, {
      method: 'POST',
      body: { attachmentIds },
      signal,
    }),
}

export { newIdempotencyKey }
