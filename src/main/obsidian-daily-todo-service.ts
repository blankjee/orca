import { basename } from 'node:path'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'

import {
  addObsidianDailyTodo,
  parseObsidianDailyTodos,
  updateObsidianDailyTodoStatus,
  type ObsidianDailyNoteSummary,
  type ObsidianDailyTodoAddInput,
  type ObsidianDailyTodoResult,
  type ObsidianDailyTodoSnapshot,
  type ObsidianDailyTodoStatusUpdate
} from '../shared/obsidian-daily-todo'
import {
  chooseBestObsidianDailyNote,
  discoverObsidianDailyNotes,
  ObsidianDailyNoteDiscoveryError,
  resolveObsidianVaultRoot
} from './obsidian-daily-note-discovery'

export async function loadObsidianDailyTodos(
  directory: string,
  filePath?: string,
  now: Date = new Date(),
  forceDiscovery = false
): Promise<ObsidianDailyTodoResult> {
  try {
    return {
      ok: true,
      snapshot: await readSnapshot(directory, filePath, now, forceDiscovery)
    }
  } catch (error) {
    return serviceErrorResult(error)
  }
}

export async function setObsidianDailyTodoStatus(
  input: ObsidianDailyTodoStatusUpdate,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  try {
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const markdown = await readMarkdown(target.filePath)
    const updated = updateObsidianDailyTodoStatus(markdown, input.todo, input.status)
    if (updated === null) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'The todo changed on disk. Refresh before updating it.'
      )
    }
    await writeMarkdown(target.filePath, updated)
    return {
      ok: true,
      snapshot: await readSnapshot(input.directory, target.filePath, now)
    }
  } catch (error) {
    return serviceErrorResult(error)
  }
}

export async function addObsidianDailyTodoToNote(
  input: ObsidianDailyTodoAddInput,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  try {
    validateTodoText(input.text)
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const markdown = await readMarkdown(target.filePath)
    await writeMarkdown(target.filePath, addObsidianDailyTodo(markdown, input))
    return {
      ok: true,
      snapshot: await readSnapshot(input.directory, target.filePath, now)
    }
  } catch (error) {
    return serviceErrorResult(error)
  }
}

async function readSnapshot(
  directory: string,
  requestedFilePath: string | undefined,
  now: Date,
  forceDiscovery = false
): Promise<ObsidianDailyTodoSnapshot> {
  const root = await resolveObsidianVaultRoot(directory)
  const dailyNotes = await discoverObsidianDailyNotes(root, forceDiscovery)
  const today = localDate(now)
  const normalizedRequestedFilePath = requestedFilePath
    ? await normalizeRequestedFilePath(requestedFilePath)
    : undefined
  const selected = requestedFilePath
    ? dailyNotes.find((note) => note.filePath === normalizedRequestedFilePath)
    : chooseBestObsidianDailyNote(dailyNotes, today)

  if (requestedFilePath && !selected) {
    throw new ObsidianDailyTodoServiceError(
      'note-not-found',
      'The selected daily note is no longer available.'
    )
  }
  if (!selected) {
    return {
      date: today,
      today,
      filePath: null,
      fileName: null,
      relativePath: null,
      modifiedAt: null,
      todos: [],
      dailyNotes
    }
  }

  const [markdown, metadata] = await Promise.all([
    readMarkdown(selected.filePath),
    stat(selected.filePath)
  ])
  return {
    date: selected.date,
    today,
    filePath: selected.filePath,
    fileName: basename(selected.filePath),
    relativePath: selected.relativePath,
    modifiedAt: metadata.mtimeMs,
    todos: parseObsidianDailyTodos(markdown),
    dailyNotes
  }
}

async function resolveRequestedNote(
  directory: string,
  filePath: string,
  now: Date
): Promise<ObsidianDailyNoteSummary> {
  if (!filePath) {
    throw new ObsidianDailyTodoServiceError('note-not-found', 'No daily note is selected.')
  }
  const root = await resolveObsidianVaultRoot(directory)
  const notes = await discoverObsidianDailyNotes(root)
  const normalizedFilePath = await normalizeRequestedFilePath(filePath)
  const selected = notes.find((note) => note.filePath === normalizedFilePath)
  if (selected) {
    return selected
  }

  const refreshed = await discoverObsidianDailyNotes(root, true)
  const recovered = refreshed.find((note) => note.filePath === normalizedFilePath)
  if (!recovered) {
    throw new ObsidianDailyTodoServiceError(
      'note-not-found',
      `No daily note found for ${localDate(now)}.`
    )
  }
  return recovered
}

async function normalizeRequestedFilePath(filePath: string): Promise<string> {
  try {
    return await realpath(filePath)
  } catch {
    return filePath
  }
}

async function readMarkdown(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    throw new ObsidianDailyTodoServiceError('read-failed', 'Could not read the daily note.')
  }
}

async function writeMarkdown(filePath: string, markdown: string): Promise<void> {
  try {
    await writeFile(filePath, markdown, 'utf8')
  } catch {
    throw new ObsidianDailyTodoServiceError('write-failed', 'Could not update the daily note.')
  }
}

function validateTodoText(text: string): void {
  const normalized = text.trim()
  if (!normalized || normalized.length > 1_000 || /[\r\n]/.test(normalized)) {
    throw new ObsidianDailyTodoServiceError(
      'invalid-input',
      'Todo text must be one non-empty line under 1,000 characters.'
    )
  }
}

function localDate(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

class ObsidianDailyTodoServiceError extends Error {
  constructor(
    readonly code: Exclude<ObsidianDailyTodoResult, { ok: true }>['code'],
    message: string
  ) {
    super(message)
  }
}

function serviceErrorResult(error: unknown): Exclude<ObsidianDailyTodoResult, { ok: true }> {
  if (error instanceof ObsidianDailyNoteDiscoveryError) {
    return { ok: false, code: error.code, message: error.message }
  }
  if (error instanceof ObsidianDailyTodoServiceError) {
    return { ok: false, code: error.code, message: error.message }
  }
  return { ok: false, code: 'read-failed', message: 'Could not access the Obsidian vault.' }
}
