import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { appendObsidianDailyFocusRecord } from '../shared/obsidian-daily-focus-record'
import {
  getObsidianDailyTodoFocusElapsedMs,
  getObsidianDailyTodoFocusRemainingMs,
  type ObsidianDailyTodoFocusFinishResult,
  type ObsidianDailyTodoFocusSession,
  type ObsidianDailyTodoFocusStartInput,
  type ObsidianDailyTodoFocusStateResult,
  type ObsidianDailyTodoFocusUpdateInput
} from '../shared/obsidian-daily-todo-focus'
import {
  loadObsidianDailyTodos,
  saveObsidianDailyWorkRecordToNote
} from './obsidian-daily-todo-service'

type FocusServiceOptions = {
  stateFilePath: string
  now?: () => number
  onChanged?: (session: ObsidianDailyTodoFocusSession | null) => void
  onElapsed?: (session: ObsidianDailyTodoFocusSession) => void
}

const VALID_DURATIONS = new Set([15, 25, 45, 60])

export class ObsidianDailyTodoFocusService {
  private session: ObsidianDailyTodoFocusSession | null = null
  private loaded = false
  private timer: NodeJS.Timeout | null = null
  private readonly now: () => number

  constructor(private readonly options: FocusServiceOptions) {
    this.now = options.now ?? Date.now
  }

  async get(): Promise<ObsidianDailyTodoFocusStateResult> {
    await this.ensureLoaded()
    await this.reconcile()
    return { ok: true, session: this.session }
  }

  async start(input: ObsidianDailyTodoFocusStartInput): Promise<ObsidianDailyTodoFocusStateResult> {
    await this.ensureLoaded()
    await this.reconcile()
    if (this.session) {
      return focusError('active-session', 'Finish or abandon the current focus session first.')
    }
    if (
      !input.directory.trim() ||
      !input.filePath.trim() ||
      !VALID_DURATIONS.has(input.durationMinutes)
    ) {
      return focusError('invalid-input', 'Choose a valid task and focus duration.')
    }
    const now = this.now()
    this.session = {
      id: randomUUID(),
      directory: input.directory,
      filePath: input.filePath,
      noteDate: input.noteDate,
      todo: input.todo,
      durationMs: input.durationMinutes * 60_000,
      activeElapsedMs: 0,
      runningSince: now,
      startedAt: now,
      status: 'running',
      goal: input.goal.trim(),
      notes: ''
    }
    await this.persistAndPublish()
    return { ok: true, session: this.session }
  }

  async pause(): Promise<ObsidianDailyTodoFocusStateResult> {
    await this.ensureLoaded()
    await this.reconcile()
    if (!this.session) {
      return focusError('no-session', 'There is no active focus session.')
    }
    if (this.session.status === 'running') {
      this.session.activeElapsedMs = getObsidianDailyTodoFocusElapsedMs(this.session, this.now())
      this.session.runningSince = null
      this.session.status = 'paused'
      await this.persistAndPublish()
    }
    return { ok: true, session: this.session }
  }

  async resume(): Promise<ObsidianDailyTodoFocusStateResult> {
    await this.ensureLoaded()
    if (!this.session) {
      return focusError('no-session', 'There is no active focus session.')
    }
    if (this.session.status === 'paused') {
      this.session.runningSince = this.now()
      this.session.status = 'running'
      await this.persistAndPublish()
    }
    return { ok: true, session: this.session }
  }

  async update(
    input: ObsidianDailyTodoFocusUpdateInput
  ): Promise<ObsidianDailyTodoFocusStateResult> {
    await this.ensureLoaded()
    if (!this.session) {
      return focusError('no-session', 'There is no active focus session.')
    }
    if (input.goal !== undefined) {
      this.session.goal = input.goal.trim()
    }
    if (input.notes !== undefined) {
      this.session.notes = input.notes.trim()
    }
    await this.persistAndPublish()
    return { ok: true, session: this.session }
  }

  async abandon(): Promise<ObsidianDailyTodoFocusStateResult> {
    await this.ensureLoaded()
    if (!this.session) {
      return focusError('no-session', 'There is no active focus session.')
    }
    this.session = null
    await this.persistAndPublish()
    return { ok: true, session: null }
  }

  async finish(): Promise<ObsidianDailyTodoFocusFinishResult> {
    await this.ensureLoaded()
    await this.reconcile()
    const session = this.session
    if (!session) {
      return {
        ok: false,
        code: 'no-session',
        message: 'There is no active focus session.'
      }
    }
    const finishedAt = this.now()
    const focusedMs = Math.max(1_000, getObsidianDailyTodoFocusElapsedMs(session, finishedAt))
    const loaded = await loadObsidianDailyTodos(session.directory, session.filePath)
    if (!loaded.ok) {
      return loaded
    }
    const currentTodo =
      loaded.snapshot.todos.find(
        (todo) =>
          todo.lineNumber === session.todo.lineNumber && todo.rawLine === session.todo.rawLine
      ) ??
      loaded.snapshot.todos.find((todo) => todo.rawLine === session.todo.rawLine) ??
      loaded.snapshot.todos.find((todo) => todo.text === session.todo.text)
    if (!currentTodo) {
      return {
        ok: false,
        code: 'todo-conflict',
        message: 'The focused task changed on disk. Refresh before saving this focus record.'
      }
    }
    const record =
      loaded.snapshot.workRecords.find((candidate) => candidate.title === currentTodo.text) ?? null
    const body = appendObsidianDailyFocusRecord(record?.body ?? '', {
      id: session.id,
      startedAt: new Date(session.startedAt),
      finishedAt: new Date(finishedAt),
      focusedMinutes: Math.max(1, Math.round(focusedMs / 60_000)),
      goal: session.goal,
      notes: session.notes
    })
    const saved = await saveObsidianDailyWorkRecordToNote({
      directory: session.directory,
      filePath: session.filePath,
      todo: currentTodo,
      body,
      expectedBody: record?.body ?? null
    })
    if (!saved.ok) {
      return saved
    }
    this.session = null
    await this.persistAndPublish()
    return { ok: true, session: null, snapshot: saved.snapshot, focusedMs }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return
    }
    this.loaded = true
    try {
      const parsed = JSON.parse(await readFile(this.options.stateFilePath, 'utf8')) as unknown
      this.session = isFocusSession(parsed) ? parsed : null
    } catch {
      this.session = null
    }
    await this.reconcile()
  }

  private async reconcile(): Promise<void> {
    if (
      !this.session ||
      this.session.status !== 'running' ||
      getObsidianDailyTodoFocusRemainingMs(this.session, this.now()) > 0
    ) {
      this.scheduleTimer()
      return
    }
    this.session.activeElapsedMs = this.session.durationMs
    this.session.runningSince = null
    this.session.status = 'elapsed'
    await this.persist()
    this.options.onChanged?.(this.session)
    this.options.onElapsed?.(this.session)
    this.scheduleTimer()
  }

  private async persistAndPublish(): Promise<void> {
    await this.persist()
    this.options.onChanged?.(this.session)
    this.scheduleTimer()
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.options.stateFilePath), { recursive: true })
    const temporaryPath = `${this.options.stateFilePath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(this.session), 'utf8')
    await rename(temporaryPath, this.options.stateFilePath)
  }

  private scheduleTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (!this.session || this.session.status !== 'running') {
      return
    }
    const delay = Math.max(1, getObsidianDailyTodoFocusRemainingMs(this.session, this.now()))
    this.timer = setTimeout(() => void this.reconcile(), delay)
    this.timer.unref()
  }
}

function focusError(
  code: 'active-session' | 'invalid-input' | 'no-session',
  message: string
): Exclude<ObsidianDailyTodoFocusStateResult, { ok: true }> {
  return { ok: false, code, message }
}

function isFocusSession(value: unknown): value is ObsidianDailyTodoFocusSession {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<ObsidianDailyTodoFocusSession>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.directory === 'string' &&
    typeof candidate.filePath === 'string' &&
    typeof candidate.durationMs === 'number' &&
    typeof candidate.activeElapsedMs === 'number' &&
    typeof candidate.startedAt === 'number' &&
    (candidate.status === 'running' ||
      candidate.status === 'paused' ||
      candidate.status === 'elapsed') &&
    typeof candidate.todo?.text === 'string'
  )
}
