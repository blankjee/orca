import type { ObsidianDailyTodoItem, ObsidianDailyTodoResult } from './obsidian-daily-todo'

export const OBSIDIAN_DAILY_TODO_CANDIDATE_PRIORITIES = ['P1', 'P2', 'P3'] as const

export type ObsidianDailyTodoCandidatePriority =
  (typeof OBSIDIAN_DAILY_TODO_CANDIDATE_PRIORITIES)[number]

export type ObsidianDailyTodoCandidateStatus = 'pending' | 'accepted' | 'dismissed'

export const OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MAX_BYTES = 8 * 1024 * 1024
export const OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
] as const

export type ObsidianDailyTodoCandidateImageMimeType =
  (typeof OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MIME_TYPES)[number]

export type ObsidianDailyTodoCandidateSourceImage = {
  dataUrl: string
  mimeType: ObsidianDailyTodoCandidateImageMimeType
  name?: string
}

export type ObsidianDailyTodoCandidate = {
  id: string
  title: string
  context: string
  goal?: string
  background?: string
  expectedOutcome?: string
  assignee?: string
  keyPoints?: string[]
  uncertainties?: string[]
  sourceText: string
  sourceKind?: 'text' | 'image' | 'mixed'
  sourceApp?: string
  confidence: number
  priority?: ObsidianDailyTodoCandidatePriority
  dueText?: string
  group?: string
  createdAt: number
  status: ObsidianDailyTodoCandidateStatus
  suggestedMergeTodoId?: string
}

export type ObsidianDailyTodoCandidateErrorCode =
  | 'invalid-input'
  | 'llm-not-configured'
  | 'llm-request-failed'
  | 'llm-invalid-response'
  | 'candidate-not-found'
  | 'write-failed'

export type ObsidianDailyTodoCandidateListResult =
  | { ok: true; candidates: ObsidianDailyTodoCandidate[] }
  | { ok: false; code: ObsidianDailyTodoCandidateErrorCode; message: string }

export type ObsidianDailyTodoCandidateAnalyzeInput = {
  directory: string
  filePath: string
  sourceText: string
  sourceImage?: ObsidianDailyTodoCandidateSourceImage
  sourceApp?: string
  existingTodos?: ObsidianDailyTodoItem[]
}

export type ObsidianDailyTodoCandidateAnalyzeResult =
  | { ok: true; candidates: ObsidianDailyTodoCandidate[] }
  | { ok: false; code: ObsidianDailyTodoCandidateErrorCode; message: string }

export type ObsidianDailyTodoCandidateUpdateInput = {
  candidateId: string
  title?: string
  context?: string
  priority?: ObsidianDailyTodoCandidatePriority | null
  dueText?: string | null
  group?: string | null
}

export type ObsidianDailyTodoCandidateAcceptInput = {
  directory: string
  filePath: string
  candidateId: string
  title?: string
  group?: string
  priority?: ObsidianDailyTodoCandidatePriority | null
}

export type ObsidianDailyTodoCandidateAcceptResult =
  | { ok: true; candidate: ObsidianDailyTodoCandidate; todoResult: ObsidianDailyTodoResult }
  | { ok: false; code: ObsidianDailyTodoCandidateErrorCode; message: string }

export type ObsidianDailyTodoCandidateDismissInput = {
  candidateId: string
}

export type ObsidianDailyTodoCandidateMutationResult =
  | { ok: true; candidate: ObsidianDailyTodoCandidate }
  | { ok: false; code: ObsidianDailyTodoCandidateErrorCode; message: string }

export type ObsidianDailyTodoCandidateChangedEvent = {
  source?: 'manual' | 'monitor-captured' | 'monitor-analyzed' | 'monitor'
  app?: string
  reason?: string
  sourceText?: string
}

export type ObsidianDailyTodoCandidateMonitorStartInput = {
  directory: string
  filePath: string
}

export type ObsidianDailyTodoCandidateMonitorStatusResult =
  | { ok: true; running: boolean }
  | { ok: false; code: 'invalid-input'; message: string }

export function isObsidianDailyTodoCandidatePriority(
  value: unknown
): value is ObsidianDailyTodoCandidatePriority {
  return OBSIDIAN_DAILY_TODO_CANDIDATE_PRIORITIES.includes(
    value as ObsidianDailyTodoCandidatePriority
  )
}

export function isObsidianDailyTodoCandidateImageMimeType(
  value: unknown
): value is ObsidianDailyTodoCandidateImageMimeType {
  return OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MIME_TYPES.includes(
    value as ObsidianDailyTodoCandidateImageMimeType
  )
}
