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
const SYSTEM_PROMPT = `You extract actionable Todo candidates from pasted text for an Obsidian daily note.
Return strict JSON only. Do not include markdown fences.
Create candidates only for follow-up actions, commitments, requests, or tasks that need later execution.
Do not create candidates for greetings, already-closed conversation, pure discussion, placeholders, or code fragments.
Prefer concise titles under 24 characters. Use priority P1/P2/P3 only when clear. Include dueText only when the text contains a clear deadline or reminder.
If a candidate matches an existing Todo, set suggestedMergeTodoId to that Todo id. Never invent ids.`

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
      const response = await this.fetchImpl(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(input, sourceText) }
          ],
          temperature: 0.2
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
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const raw = data.choices?.[0]?.message?.content ?? ''
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
    return []
  }
  const parsed = safeParseJson(chunk)
  const items = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { candidates?: unknown }).candidates)
      ? (parsed as { candidates: unknown[] }).candidates
      : []
  return items
    .map((item, index) => normalizeCandidate(item, index, options))
    .filter((candidate): candidate is ObsidianDailyTodoCandidate => Boolean(candidate))
}

function buildUserPrompt(
  input: ObsidianDailyTodoCandidateAnalyzeInput,
  sourceText: string
): string {
  const existingTodos =
    (input.existingTodos ?? []).slice(0, 20).map(formatExistingTodo).join('\n') || '(none)'
  return `Current daily note path: ${input.filePath}
Source app: ${input.sourceApp || 'pasted text'}
Existing Todos for merge suggestions:
${existingTodos}

Pasted text:
${sourceText}

Return JSON in this shape:
{"candidates":[{"title":"...","context":"...","confidence":0.0,"priority":"P2","dueText":"optional","suggestedMergeTodoId":"optional"}]}`
}

function formatExistingTodo(todo: ObsidianDailyTodoItem): string {
  return `- id=${todo.id} | status=${todo.status} | priority=${todo.priority ?? ''} | ${todo.text}`
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
