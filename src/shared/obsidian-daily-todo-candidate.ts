import type { ObsidianDailyTodoItem, ObsidianDailyTodoResult } from './obsidian-daily-todo'

export const OBSIDIAN_DAILY_TODO_CANDIDATE_PRIORITIES = ['P1', 'P2', 'P3'] as const

export type ObsidianDailyTodoCandidatePriority =
  (typeof OBSIDIAN_DAILY_TODO_CANDIDATE_PRIORITIES)[number]

export type ObsidianDailyTodoCandidateStatus = 'pending' | 'accepted' | 'dismissed'

export type ObsidianDailyTodoCandidate = {
  id: string
  title: string
  context: string
  sourceText: string
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

export function isObsidianDailyTodoCandidatePriority(
  value: unknown
): value is ObsidianDailyTodoCandidatePriority {
  return OBSIDIAN_DAILY_TODO_CANDIDATE_PRIORITIES.includes(
    value as ObsidianDailyTodoCandidatePriority
  )
}
