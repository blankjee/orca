import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'

import { addObsidianDailyTodoToNote } from './obsidian-daily-todo-service'
import type { ObsidianDailyTodoItem } from '../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateAcceptInput,
  ObsidianDailyTodoCandidateAcceptResult,
  ObsidianDailyTodoCandidateAnalyzeInput,
  ObsidianDailyTodoCandidateAnalyzeResult,
  ObsidianDailyTodoCandidateDismissInput,
  ObsidianDailyTodoCandidateListResult,
  ObsidianDailyTodoCandidateMutationResult,
  ObsidianDailyTodoCandidateUpdateInput
} from '../shared/obsidian-daily-todo-candidate'
import { isObsidianDailyTodoCandidatePriority } from '../shared/obsidian-daily-todo-candidate'
import { ObsidianDailyTodoCandidateAnalyzer } from './obsidian-daily-todo-candidate-analyzer'
import type { ObsidianDailyTodoCandidateAnalyzerConfig } from './obsidian-daily-todo-candidate-analyzer'
import type { ObsidianAiCaptureSettings } from '../shared/obsidian-ai-capture-settings'

export class ObsidianDailyTodoCandidateService {
  private candidates: ObsidianDailyTodoCandidate[] | null = null

  constructor(
    private readonly options: {
      filePath?: string
      analyzerConfig?: () => ObsidianDailyTodoCandidateAnalyzerConfig
      analyzerFactory?: (
        config: ObsidianDailyTodoCandidateAnalyzerConfig
      ) => Pick<ObsidianDailyTodoCandidateAnalyzer, 'analyze'>
    } = {}
  ) {}

  async list(): Promise<ObsidianDailyTodoCandidateListResult> {
    try {
      const candidates = await this.load()
      return {
        ok: true,
        candidates: candidates.filter((candidate) => candidate.status === 'pending')
      }
    } catch {
      return { ok: false, code: 'write-failed', message: 'Could not load Todo candidates.' }
    }
  }

  async analyzeText(
    input: ObsidianDailyTodoCandidateAnalyzeInput
  ): Promise<ObsidianDailyTodoCandidateAnalyzeResult> {
    const config = this.options.analyzerConfig?.() ?? readCandidateAnalyzerConfig()
    const analyzer =
      this.options.analyzerFactory?.(config) ?? new ObsidianDailyTodoCandidateAnalyzer(config)
    const result = await analyzer.analyze(input)
    if (!result.ok) {
      return result
    }
    const existing = await this.load()
    const next = [...existing, ...dedupeAgainstExisting(result.candidates, existing)]
    await this.save(next)
    this.candidates = next
    return { ok: true, candidates: next.filter((candidate) => candidate.status === 'pending') }
  }

  async update(
    input: ObsidianDailyTodoCandidateUpdateInput
  ): Promise<ObsidianDailyTodoCandidateMutationResult> {
    const candidates = await this.load()
    const candidate = candidates.find((item) => item.id === input.candidateId)
    if (!candidate || candidate.status !== 'pending') {
      return { ok: false, code: 'candidate-not-found', message: 'Candidate not found.' }
    }
    if (input.title !== undefined) {
      const title = input.title.trim()
      if (!title) {
        return { ok: false, code: 'invalid-input', message: 'Candidate title is required.' }
      }
      candidate.title = title
    }
    if (input.context !== undefined) {
      candidate.context = input.context.trim()
    }
    if (input.priority !== undefined) {
      candidate.priority =
        input.priority && isObsidianDailyTodoCandidatePriority(input.priority)
          ? input.priority
          : undefined
    }
    if (input.dueText !== undefined) {
      candidate.dueText = input.dueText?.trim() || undefined
    }
    if (input.group !== undefined) {
      candidate.group = input.group?.trim() || undefined
    }
    await this.save(candidates)
    return { ok: true, candidate }
  }

  async dismiss(
    input: ObsidianDailyTodoCandidateDismissInput
  ): Promise<ObsidianDailyTodoCandidateMutationResult> {
    const candidates = await this.load()
    const candidate = candidates.find((item) => item.id === input.candidateId)
    if (!candidate || candidate.status !== 'pending') {
      return { ok: false, code: 'candidate-not-found', message: 'Candidate not found.' }
    }
    candidate.status = 'dismissed'
    await this.save(candidates)
    return { ok: true, candidate }
  }

  async accept(
    input: ObsidianDailyTodoCandidateAcceptInput
  ): Promise<ObsidianDailyTodoCandidateAcceptResult> {
    const candidates = await this.load()
    const candidate = candidates.find((item) => item.id === input.candidateId)
    if (!candidate || candidate.status !== 'pending') {
      return { ok: false, code: 'candidate-not-found', message: 'Candidate not found.' }
    }
    const title = input.title?.trim() || candidate.title.trim()
    if (!input.directory.trim() || !input.filePath.trim() || !title) {
      return { ok: false, code: 'invalid-input', message: 'Invalid candidate accept input.' }
    }
    const priority = input.priority === null ? undefined : (input.priority ?? candidate.priority)
    const todoResult = await addObsidianDailyTodoToNote({
      directory: input.directory,
      filePath: input.filePath,
      text: title,
      group: input.group?.trim() || candidate.group || '今日任务',
      priority
    })
    if (!todoResult.ok) {
      return { ok: false, code: 'write-failed', message: todoResult.message }
    }
    candidate.status = 'accepted'
    candidate.title = title
    candidate.group = input.group?.trim() || candidate.group
    candidate.priority = priority
    await this.save(candidates)
    return { ok: true, candidate, todoResult }
  }

  private async load(): Promise<ObsidianDailyTodoCandidate[]> {
    if (this.candidates) {
      return this.candidates
    }
    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as unknown
      this.candidates = Array.isArray(parsed) ? parsed.filter(isStoredCandidate) : []
    } catch {
      this.candidates = []
    }
    return this.candidates
  }

  private async save(candidates: ObsidianDailyTodoCandidate[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(candidates, null, 2), 'utf8')
    this.candidates = candidates
  }

  private get filePath(): string {
    return (
      this.options.filePath ?? join(app.getPath('userData'), 'obsidian-daily-todo-candidates.json')
    )
  }
}

export function readCandidateAnalyzerConfig(
  settings?: ObsidianAiCaptureSettings
): ObsidianDailyTodoCandidateAnalyzerConfig {
  const storedEndpoint = settings?.endpoint.trim() ?? ''
  const storedModel = settings?.model.trim() ?? ''
  const storedApiKey = settings?.apiKey.trim() ?? ''
  const environmentConfidenceThreshold = Number(process.env.TODO_CAPTURE_CONFIDENCE_THRESHOLD)
  const fallbackConfidenceThreshold =
    Number.isFinite(environmentConfidenceThreshold) &&
    environmentConfidenceThreshold >= 0 &&
    environmentConfidenceThreshold <= 1
      ? environmentConfidenceThreshold
      : 0.75
  if (settings?.enabled === false) {
    return {
      endpoint: '',
      model: '',
      apiKey: '',
      confidenceThreshold: settings?.confidenceThreshold ?? 0.75
    }
  }
  return {
    endpoint:
      storedEndpoint ||
      process.env.TODO_CAPTURE_LLM_ENDPOINT?.trim() ||
      process.env.ARK_BASE_URL?.trim() ||
      '',
    model:
      storedModel ||
      process.env.TODO_CAPTURE_LLM_MODEL?.trim() ||
      process.env.ARK_MODEL?.trim() ||
      '',
    apiKey:
      storedApiKey ||
      process.env.TODO_CAPTURE_LLM_API_KEY?.trim() ||
      process.env.ARK_API_KEY?.trim() ||
      '',
    confidenceThreshold: settings?.confidenceThreshold ?? fallbackConfidenceThreshold
  }
}

function dedupeAgainstExisting(
  candidates: ObsidianDailyTodoCandidate[],
  existing: ObsidianDailyTodoCandidate[]
): ObsidianDailyTodoCandidate[] {
  const pendingKeys = new Set(
    existing
      .filter((candidate) => candidate.status === 'pending')
      .map((candidate) => `${candidate.title.trim()}\u0000${candidate.sourceText.trim()}`)
  )
  return candidates.filter((candidate) => {
    const key = `${candidate.title.trim()}\u0000${candidate.sourceText.trim()}`
    if (pendingKeys.has(key)) {
      return false
    }
    pendingKeys.add(key)
    return true
  })
}

function isStoredCandidate(value: unknown): value is ObsidianDailyTodoCandidate {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<ObsidianDailyTodoCandidate>
  return Boolean(
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.context === 'string' &&
    typeof candidate.sourceText === 'string' &&
    typeof candidate.confidence === 'number' &&
    typeof candidate.createdAt === 'number' &&
    (candidate.status === 'pending' ||
      candidate.status === 'accepted' ||
      candidate.status === 'dismissed')
  )
}

export function buildExistingTodosForCandidateAnalysis(
  todos: readonly ObsidianDailyTodoItem[]
): ObsidianDailyTodoItem[] {
  return todos.filter((todo) => todo.status !== 'completed' && todo.status !== 'cancelled')
}
