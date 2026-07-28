import { isObsidianDailyTodoCandidatePriority } from '../shared/obsidian-daily-todo-candidate'
import type { ObsidianDailyTodoCandidate } from '../shared/obsidian-daily-todo-candidate'

type LlmCandidate = {
  title?: unknown
  context?: unknown
  goal?: unknown
  background?: unknown
  expectedOutcome?: unknown
  assignee?: unknown
  keyPoints?: unknown
  uncertainties?: unknown
  confidence?: unknown
  priority?: unknown
  dueText?: unknown
  suggestedMergeTodoId?: unknown
}

type ParseCandidateOptions = {
  sourceText: string
  sourceKind?: ObsidianDailyTodoCandidate['sourceKind']
  sourceApp?: string
  now: number
  confidenceThreshold: number
}

const DEFAULT_GROUP = '今日任务'
const MAX_LIST_ITEMS = 6

export function extractResponseText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return ''
  }
  const record = data as {
    output_text?: unknown
    choices?: { message?: { content?: unknown } }[]
    output?: { content?: { text?: unknown; type?: unknown }[] }[]
  }
  if (typeof record.output_text === 'string') {
    return record.output_text
  }
  const choiceContent = record.choices?.[0]?.message?.content
  if (typeof choiceContent === 'string') {
    return choiceContent
  }
  const outputText = record.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === 'string')
  return outputText ?? ''
}

export function parseCandidateResponse(
  raw: string,
  options: ParseCandidateOptions
): ObsidianDailyTodoCandidate[] {
  const chunk = extractJsonChunk(raw)
  if (!chunk) {
    return buildReminderFallback(options)
  }
  const parsed = safeParseJson(chunk)
  const items = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { candidates?: unknown }).candidates)
      ? (parsed as { candidates: unknown[] }).candidates
      : []
  const candidates = items
    .map((item, index) => normalizeCandidate(item, index, options))
    .filter((candidate): candidate is ObsidianDailyTodoCandidate => Boolean(candidate))
  return candidates.length > 0 ? candidates : buildReminderFallback(options)
}

function buildReminderFallback(options: ParseCandidateOptions): ObsidianDailyTodoCandidate[] {
  const title = extractReminderTitle(options.sourceText)
  if (!title) {
    return []
  }
  return [
    {
      id: `candidate-${options.now}-fallback`,
      title,
      context: '从提醒语句提取',
      sourceText: options.sourceText,
      ...(options.sourceKind ? { sourceKind: options.sourceKind } : {}),
      sourceApp: options.sourceApp,
      confidence: Math.max(0.85, options.confidenceThreshold),
      priority: 'P2',
      group: DEFAULT_GROUP,
      createdAt: options.now,
      status: 'pending'
    }
  ]
}

function extractReminderTitle(sourceText: string): string | null {
  const text = sourceText.trim().replace(/[。.!！?？]+$/u, '')
  const matched = text.match(
    /^(?:请)?(?:提醒我|提示我|记得|帮我记(?:一下)?|帮我提醒(?:一下)?)(?:一下)?(?<title>.+)$/u
  )
  const title = matched?.groups?.title?.trim() ?? ''
  return title ? title.slice(0, 120) : null
}

function normalizeCandidate(
  value: unknown,
  index: number,
  options: ParseCandidateOptions
): ObsidianDailyTodoCandidate | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const item = value as LlmCandidate
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  if (!title) {
    return null
  }
  const confidence = normalizeConfidence(item.confidence)
  if (confidence < options.confidenceThreshold) {
    return null
  }
  const context =
    typeof item.context === 'string' && item.context.trim()
      ? item.context.trim()
      : 'From pasted text'
  const goal = normalizeOptionalText(item.goal)
  const background = normalizeOptionalText(item.background)
  const expectedOutcome = normalizeOptionalText(item.expectedOutcome)
  const assignee = normalizeOptionalText(item.assignee)
  const keyPoints = normalizeStringList(item.keyPoints)
  const uncertainties = normalizeStringList(item.uncertainties)
  const priority = isObsidianDailyTodoCandidatePriority(item.priority) ? item.priority : undefined
  const dueText =
    typeof item.dueText === 'string' && item.dueText.trim() ? item.dueText.trim() : undefined
  const suggestedMergeTodoId =
    typeof item.suggestedMergeTodoId === 'string' && item.suggestedMergeTodoId.trim()
      ? item.suggestedMergeTodoId.trim()
      : undefined
  return {
    id: `candidate-${options.now}-${index}`,
    title: title.slice(0, 120),
    context,
    ...(goal ? { goal } : {}),
    ...(background ? { background } : {}),
    ...(expectedOutcome ? { expectedOutcome } : {}),
    ...(assignee ? { assignee } : {}),
    ...(keyPoints ? { keyPoints } : {}),
    ...(uncertainties ? { uncertainties } : {}),
    sourceText: options.sourceText,
    ...(options.sourceKind ? { sourceKind: options.sourceKind } : {}),
    sourceApp: options.sourceApp,
    confidence,
    priority,
    dueText,
    group: DEFAULT_GROUP,
    createdAt: options.now,
    status: 'pending',
    suggestedMergeTodoId
  }
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 1_000) : undefined
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS)
  return items.length > 0 ? items : undefined
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.8
  }
  return Math.max(0, Math.min(1, value))
}

function extractJsonChunk(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const objectStart = candidate.indexOf('{')
  const arrayStart = candidate.indexOf('[')
  const starts = [objectStart, arrayStart].filter((index) => index >= 0)
  if (starts.length === 0) {
    return null
  }
  const start = Math.min(...starts)
  const end = candidate.startsWith('[', start)
    ? candidate.lastIndexOf(']')
    : candidate.lastIndexOf('}')
  return end > start ? candidate.slice(start, end + 1) : null
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
