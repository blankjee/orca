import { isObsidianDailyTodoCandidatePriority } from '../shared/obsidian-daily-todo-candidate'
import type { ObsidianDailyTodoItem } from '../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateAnalyzeInput,
  ObsidianDailyTodoCandidateAnalyzeResult
} from '../shared/obsidian-daily-todo-candidate'

export type ObsidianDailyTodoCandidateAnalyzerConfig = {
  endpoint: string
  model: string
  apiKey: string
  confidenceThreshold: number
}

export type ObsidianDailyTodoCandidateAnalyzerOptions = {
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
}

type LlmCandidate = {
  title?: unknown
  context?: unknown
  confidence?: unknown
  priority?: unknown
  dueText?: unknown
  suggestedMergeTodoId?: unknown
}

const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_GROUP = '今日任务'
const ARK_RESPONSES_PATH = '/responses'
const MAX_SOURCE_TEXT_LENGTH = 500
const MAX_EXISTING_TODOS = 3
const SYSTEM_PROMPT =
  '你是待办提取器。含“提醒我/提示我/记得/帮我记/下周/明天/今天”的句子必须生成待办。最多3条。只返回JSON：{"candidates":[{"title":"...","context":"...","confidence":0.9,"priority":"P2","dueText":"optional"}]}。无markdown。'

export class ObsidianDailyTodoCandidateAnalyzer {
  private readonly fetchImpl: typeof fetch
  private readonly now: () => number
  private readonly timeoutMs: number

  constructor(
    private readonly config: ObsidianDailyTodoCandidateAnalyzerConfig,
    options: ObsidianDailyTodoCandidateAnalyzerOptions = {}
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.now = options.now ?? Date.now
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  get isConfigured(): boolean {
    return Boolean(
      this.config.endpoint.trim() && this.config.model.trim() && this.config.apiKey.trim()
    )
  }

  async analyze(
    input: ObsidianDailyTodoCandidateAnalyzeInput
  ): Promise<ObsidianDailyTodoCandidateAnalyzeResult> {
    const sourceText = input.sourceText.trim()
    if (!input.directory.trim() || !input.filePath.trim() || !sourceText) {
      return { ok: false, code: 'invalid-input', message: 'Invalid candidate analysis input.' }
    }
    if (!this.isConfigured) {
      return { ok: false, code: 'llm-not-configured', message: 'AI Capture is not configured.' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(buildRequestUrl(this.config.endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: SYSTEM_PROMPT }]
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildUserPrompt(input, sourceText) }]
            }
          ],
          temperature: 0.1,
          max_output_tokens: 240
        }),
        signal: controller.signal
      })
      if (!response.ok) {
        return {
          ok: false,
          code: 'llm-request-failed',
          message: `AI Capture request failed with HTTP ${response.status}.`
        }
      }
      const raw = extractResponseText(await response.json())
      const candidates = parseCandidateResponse(raw, {
        sourceText,
        sourceApp: input.sourceApp,
        now: this.now(),
        confidenceThreshold: this.config.confidenceThreshold
      })
      return { ok: true, candidates }
    } catch (error) {
      return {
        ok: false,
        code: 'llm-request-failed',
        message:
          error instanceof Error && error.name === 'AbortError'
            ? 'AI Capture timed out.'
            : 'AI Capture failed.'
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

function buildRequestUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '')
  return trimmed.endsWith(ARK_RESPONSES_PATH) ? trimmed : `${trimmed}${ARK_RESPONSES_PATH}`
}

function extractResponseText(data: unknown): string {
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
  options: {
    sourceText: string
    sourceApp?: string
    now: number
    confidenceThreshold: number
  }
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

function buildReminderFallback(options: {
  sourceText: string
  sourceApp?: string
  now: number
  confidenceThreshold: number
}): ObsidianDailyTodoCandidate[] {
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

function buildUserPrompt(
  input: ObsidianDailyTodoCandidateAnalyzeInput,
  sourceText: string
): string {
  const existingTodos =
    (input.existingTodos ?? []).slice(0, MAX_EXISTING_TODOS).map(formatExistingTodo).join('\n') ||
    'none'
  return `Existing:
${existingTodos}
Text:
${sourceText.slice(0, MAX_SOURCE_TEXT_LENGTH)}`
}

function formatExistingTodo(todo: ObsidianDailyTodoItem): string {
  return `- ${todo.text.slice(0, 60)}`
}

function normalizeCandidate(
  value: unknown,
  index: number,
  options: {
    sourceText: string
    sourceApp?: string
    now: number
    confidenceThreshold: number
  }
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
    sourceText: options.sourceText,
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
