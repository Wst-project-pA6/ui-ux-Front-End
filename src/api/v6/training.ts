import { request, newIdempotencyKey } from '../client'
import type { Schemas, Paginated } from '../v3/types'

export type TrainingTerm = Schemas['TrainingTermResponseDto']
export type Course = Schemas['CourseResponseDto']
export type Student = Schemas['StudentResponseDto']
export type TrainingGroup = Schemas['TrainingGroupResponseDto']
export type Enrollment = Schemas['EnrollmentResponseDto']
export type MentorSummary = Schemas['MentorResponseDto']
export type MentorProfile = Schemas['MentorProfileResponseDto']
export type TrainingSession = Schemas['TrainingSessionResponseDto']
export type AttendanceRecord = Schemas['AttendanceResponseDto']
export type Assessment = Schemas['AssessmentResponseDto']
export type Competency = Schemas['CompetencyResponseDto']
export type PracticalTask = Schemas['PracticalTaskResponseDto']
export type Certificate = Schemas['CertificateResponseDto']

type Q = Record<string, string | number | boolean | undefined>

export const trainingV3 = {
  // Terms
  terms: (query?: { page?: number; pageSize?: number; status?: string; sort?: string }, signal?: AbortSignal) =>
    request<Paginated<TrainingTerm>>('/training-terms', { query: query as Q, signal }),
  createTerm: (payload: Schemas['CreateTrainingTermDto'], signal?: AbortSignal) =>
    request<TrainingTerm>('/training-terms', { method: 'POST', body: payload, signal }),
  updateTerm: (id: string, payload: Schemas['UpdateTrainingTermDto'], signal?: AbortSignal) =>
    request<TrainingTerm>(`/training-terms/${id}`, { method: 'PATCH', body: payload, signal }),

  // Courses
  courses: (
    query?: { page?: number; pageSize?: number; q?: string; termId?: string; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<Course>>('/courses', { query: query as Q, signal }),
  createCourse: (payload: Schemas['CreateCourseDto'], signal?: AbortSignal) =>
    request<Course>('/courses', { method: 'POST', body: payload, signal }),
  updateCourse: (id: string, payload: Schemas['UpdateCourseDto'], signal?: AbortSignal) =>
    request<Course>(`/courses/${id}`, { method: 'PATCH', body: payload, signal }),

  // Students
  students: (
    query?: { page?: number; pageSize?: number; q?: string; status?: string; groupId?: string; courseId?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<Student>>('/students', { query: query as Q, signal }),
  student: (id: string, signal?: AbortSignal) => request<Student>(`/students/${id}`, { signal }),
  createStudent: (payload: Schemas['CreateStudentDto'], signal?: AbortSignal) =>
    request<Student>('/students', { method: 'POST', body: payload, signal }),
  updateStudent: (id: string, payload: Schemas['UpdateStudentDto'], signal?: AbortSignal) =>
    request<Student>(`/students/${id}`, { method: 'PATCH', body: payload, signal }),
  coverage: (studentId: string, courseId: string, signal?: AbortSignal) =>
    request<Schemas['CompetencyCoverageResponseDto']>(`/students/${studentId}/competency-coverage`, {
      query: { courseId },
      signal,
    }),
  eligibility: (studentId: string, courseId: string, signal?: AbortSignal) =>
    request<Schemas['CompletionEligibilityResponseDto']>(`/students/${studentId}/completion-eligibility`, {
      query: { courseId },
      signal,
    }),

  // Mentors
  mentors: (
    query?: { page?: number; pageSize?: number; q?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<MentorSummary>>('/mentors', { query: query as Q, signal }),
  mentorProfiles: (
    query?: { page?: number; pageSize?: number; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<MentorProfile>>('/mentor-profiles', { query: query as Q, signal }),
  mentorProfile: (id: string, signal?: AbortSignal) =>
    request<MentorProfile>(`/mentor-profiles/${id}`, { signal }),
  createMentorProfile: (payload: Schemas['CreateMentorProfileDto'], signal?: AbortSignal) =>
    request<MentorProfile>('/mentor-profiles', { method: 'POST', body: payload, signal }),
  updateMentorProfile: (id: string, payload: Schemas['UpdateMentorProfileDto'], signal?: AbortSignal) =>
    request<MentorProfile>(`/mentor-profiles/${id}`, { method: 'PATCH', body: payload, signal }),

  // Groups + enrollments
  groups: (
    query?: { page?: number; pageSize?: number; courseId?: string; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<TrainingGroup>>('/training-groups', { query: query as Q, signal }),
  createGroup: (payload: Schemas['CreateTrainingGroupDto'], signal?: AbortSignal) =>
    request<TrainingGroup>('/training-groups', { method: 'POST', body: payload, signal }),
  updateGroup: (id: string, payload: Schemas['UpdateTrainingGroupDto'], signal?: AbortSignal) =>
    request<TrainingGroup>(`/training-groups/${id}`, { method: 'PATCH', body: payload, signal }),
  enrollments: (
    groupId: string,
    query?: { page?: number; pageSize?: number; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<Enrollment>>(`/training-groups/${groupId}/enrollments`, { query: query as Q, signal }),
  enroll: (groupId: string, studentId: string, signal?: AbortSignal) =>
    request<Enrollment>(`/training-groups/${groupId}/enrollments`, {
      method: 'POST',
      body: { studentId },
      signal,
    }),
  withdrawEnrollment: (enrollmentId: string, reason: string, signal?: AbortSignal) =>
    request<Enrollment>(`/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      body: { status: 'WITHDRAWN', reason },
      signal,
    }),

  // Sessions
  sessions: (
    query?: {
      page?: number; pageSize?: number; from?: string; to?: string; courseId?: string; termId?: string;
      groupId?: string; bayId?: string; mentorId?: string; status?: string; sort?: string;
    },
    signal?: AbortSignal,
  ) => request<Paginated<TrainingSession>>('/training-sessions', { query: query as Q, signal }),
  session: (id: string, signal?: AbortSignal) =>
    request<TrainingSession>(`/training-sessions/${id}`, { signal }),
  createSession: (payload: Schemas['CreateTrainingSessionDto'], signal?: AbortSignal) =>
    request<TrainingSession>('/training-sessions', { method: 'POST', body: payload, signal }),
  updateSession: (id: string, payload: Schemas['UpdateTrainingSessionDto'], signal?: AbortSignal) =>
    request<TrainingSession>(`/training-sessions/${id}`, { method: 'PATCH', body: payload, signal }),
  conflictCheck: (id: string, signal?: AbortSignal) =>
    request<{ conflicts?: unknown[] } & Record<string, unknown>>(`/training-sessions/${id}/conflict-check`, {
      method: 'POST',
      signal,
    }),
  overrideConflicts: (id: string, conflictKeys: string[], reason: string, signal?: AbortSignal) =>
    request<unknown>(`/training-sessions/${id}/conflict-overrides`, {
      method: 'POST',
      body: { conflictKeys, reason },
      signal,
    }),
  transitionSession: (id: string, toStatus: 'PUBLISHED' | 'COMPLETED' | 'CANCELLED', reason?: string, signal?: AbortSignal) =>
    request<TrainingSession>(`/training-sessions/${id}/transitions`, {
      method: 'POST',
      body: { toStatus, ...(reason ? { reason } : {}) },
      signal,
    }),
  recordAttendance: (
    id: string,
    records: { studentId: string; status: string; note?: string }[],
    signal?: AbortSignal,
  ) =>
    request<Schemas['AttendanceBulkResponseDto']>(`/training-sessions/${id}/attendance`, {
      method: 'PUT',
      body: { records },
      signal,
    }),
  attendanceRecords: (
    query?: { page?: number; pageSize?: number; from?: string; to?: string; sessionId?: string; studentId?: string; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<AttendanceRecord>>('/attendance-records', { query: query as Q, signal }),

  // Assessments
  assessments: (
    query?: {
      page?: number; pageSize?: number; from?: string; to?: string; sessionId?: string; studentId?: string;
      taskId?: string; courseId?: string; result?: string; signOffStatus?: string; sort?: string;
    },
    signal?: AbortSignal,
  ) => request<Paginated<Assessment>>('/assessments', { query: query as Q, signal }),
  createAssessment: (payload: Schemas['AssessmentCreateDto'], signal?: AbortSignal) =>
    request<Assessment>('/assessments', { method: 'POST', body: payload, signal }),
  updateAssessment: (id: string, payload: Schemas['AssessmentUpdateDto'], signal?: AbortSignal) =>
    request<Assessment>(`/assessments/${id}`, { method: 'PATCH', body: payload, signal }),
  signOff: (id: string, decision: 'SIGNED_OFF' | 'RETURNED', note?: string, signal?: AbortSignal) =>
    request<Assessment>(`/assessments/${id}/sign-off`, {
      method: 'POST',
      body: { decision, ...(note ? { note } : {}) },
      signal,
    }),

  // Competencies + tasks
  competencies: (
    query?: { page?: number; pageSize?: number; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<Competency>>('/competencies', { query: query as Q, signal }),
  createCompetency: (payload: Schemas['CreateCompetencyDto'], signal?: AbortSignal) =>
    request<Competency>('/competencies', { method: 'POST', body: payload, signal }),
  updateCompetency: (id: string, payload: Schemas['UpdateCompetencyDto'], signal?: AbortSignal) =>
    request<Competency>(`/competencies/${id}`, { method: 'PATCH', body: payload, signal }),
  tasks: (
    query?: { page?: number; pageSize?: number; q?: string; competencyId?: string; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<PracticalTask>>('/practical-tasks', { query: query as Q, signal }),
  createTask: (payload: Schemas['CreatePracticalTaskDto'], signal?: AbortSignal) =>
    request<PracticalTask>('/practical-tasks', { method: 'POST', body: payload, signal }),
  updateTask: (id: string, payload: Schemas['UpdatePracticalTaskDto'], signal?: AbortSignal) =>
    request<PracticalTask>(`/practical-tasks/${id}`, { method: 'PATCH', body: payload, signal }),

  // Certificates
  certificates: (
    query?: { page?: number; pageSize?: number; studentId?: string; courseId?: string; status?: string; sort?: string },
    signal?: AbortSignal,
  ) => request<Paginated<Certificate>>('/certificates', { query: query as Q, signal }),
  certificate: (id: string, signal?: AbortSignal) =>
    request<Certificate>(`/certificates/${id}`, { signal }),
  issueCertificate: (
    studentId: string,
    courseId: string,
    idempotencyKey: string = newIdempotencyKey(),
    signal?: AbortSignal,
  ) =>
    request<Certificate>('/certificates', {
      method: 'POST',
      body: { studentId, courseId },
      idempotencyKey,
      signal,
    }),
  revokeCertificate: (id: string, reason: string, signal?: AbortSignal) =>
    request<Certificate>(`/certificates/${id}/revocations`, {
      method: 'POST',
      body: { reason },
      signal,
    }),
  /** Public — no login. Must be called with anonymous: true. */
  verifyCertificate: (token: string, signal?: AbortSignal) =>
    request<Schemas['PublicCertificateVerificationResponseDto']>(
      `/public/certificate-verifications/${token}`,
      { anonymous: true, skipAuthRefresh: true, signal },
    ),
}

export { newIdempotencyKey }
