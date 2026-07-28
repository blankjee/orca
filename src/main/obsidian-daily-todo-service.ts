import { basename } from 'node:path'
import { realpath, stat } from 'node:fs/promises'

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
  updateObsidianDailyTodoText,
  type ObsidianDailyTodoTextUpdate
} from '../shared/obsidian-daily-todo-text'
import {
  deleteObsidianDailyTodo,
  updateObsidianDailyTodoPriority,
  type ObsidianDailyTodoDeleteInput,
  type ObsidianDailyTodoPriorityUpdate
} from '../shared/obsidian-daily-todo-mutation'
import {
  parseObsidianDailyWorkRecords,
  renameObsidianDailyWorkRecord,
  saveObsidianDailyWorkRecord,
  type ObsidianDailyWorkRecordSaveInput
} from '../shared/obsidian-daily-work-record'
import {
  chooseBestObsidianDailyNote,
  discoverObsidianDailyNotes,
  resolveObsidianVaultRoot
} from './obsidian-daily-note-discovery'
import {
  formatObsidianDailyLocalDate,
  ObsidianDailyTodoServiceError,
  obsidianDailyTodoServiceErrorResult,
  readObsidianDailyTodoMarkdown,
  validateObsidianDailyTodoText,
  validateObsidianDailyWorkRecordBody,
  writeObsidianDailyTodoMarkdown
} from './obsidian-daily-todo-file-access'

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
    return obsidianDailyTodoServiceErrorResult(error)
  }
}

export async function setObsidianDailyTodoStatus(
  input: ObsidianDailyTodoStatusUpdate,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  try {
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const markdown = await readObsidianDailyTodoMarkdown(target.filePath)
    const updated = updateObsidianDailyTodoStatus(markdown, input.todo, input.status)
    if (updated === null) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'The todo changed on disk. Refresh before updating it.'
      )
    }
    await writeObsidianDailyTodoMarkdown(target.filePath, updated)
    return {
      ok: true,
      snapshot: await readSnapshot(input.directory, target.filePath, now)
    }
  } catch (error) {
    return obsidianDailyTodoServiceErrorResult(error)
  }
}

export async function addObsidianDailyTodoToNote(
  input: ObsidianDailyTodoAddInput,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  try {
    validateObsidianDailyTodoText(input.text)
    if (input.workRecordBody) {
      validateObsidianDailyWorkRecordBody(input.workRecordBody)
    }
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const markdown = await readObsidianDailyTodoMarkdown(target.filePath)
    const withTodo = addObsidianDailyTodo(markdown, input)
    const updated = input.workRecordBody
      ? saveObsidianDailyWorkRecord(withTodo, input.text.trim(), input.workRecordBody, null)
      : withTodo
    if (updated === null) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'A work record for this Todo already exists.'
      )
    }
    await writeObsidianDailyTodoMarkdown(target.filePath, updated)
    return {
      ok: true,
      snapshot: await readSnapshot(input.directory, target.filePath, now)
    }
  } catch (error) {
    return obsidianDailyTodoServiceErrorResult(error)
  }
}

export async function updateObsidianDailyTodoTextInNote(
  input: ObsidianDailyTodoTextUpdate,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  try {
    validateObsidianDailyTodoText(input.text)
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const markdown = await readObsidianDailyTodoMarkdown(target.filePath)
    const updatedTodo = updateObsidianDailyTodoText(markdown, input.todo, input.text)
    const updated = updatedTodo
      ? renameObsidianDailyWorkRecord(updatedTodo, input.todo.text, input.text.trim())
      : null
    if (updated === null) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'The todo or its work record changed on disk. Refresh before updating it.'
      )
    }
    await writeObsidianDailyTodoMarkdown(target.filePath, updated)
    return { ok: true, snapshot: await readSnapshot(input.directory, target.filePath, now) }
  } catch (error) {
    return obsidianDailyTodoServiceErrorResult(error)
  }
}

export async function deleteObsidianDailyTodoFromNote(
  input: ObsidianDailyTodoDeleteInput,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  return mutateTodoMarkdown(input, now, (markdown) => deleteObsidianDailyTodo(markdown, input.todo))
}

export async function updateObsidianDailyTodoPriorityInNote(
  input: ObsidianDailyTodoPriorityUpdate,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  return mutateTodoMarkdown(input, now, (markdown) =>
    updateObsidianDailyTodoPriority(markdown, input.todo, input.priority)
  )
}

export async function saveObsidianDailyWorkRecordToNote(
  input: ObsidianDailyWorkRecordSaveInput,
  now: Date = new Date()
): Promise<ObsidianDailyTodoResult> {
  try {
    validateObsidianDailyWorkRecordBody(input.body)
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const markdown = await readObsidianDailyTodoMarkdown(target.filePath)
    const currentTodos = parseObsidianDailyTodos(markdown)
    const originalTodo = currentTodos.find((todo) => todo.lineNumber === input.todo.lineNumber)
    const matchingTodos = currentTodos.filter((todo) => todo.rawLine === input.todo.rawLine)
    if (originalTodo?.rawLine !== input.todo.rawLine && matchingTodos.length !== 1) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'The todo changed on disk. Refresh before saving its work record.'
      )
    }
    const updated = saveObsidianDailyWorkRecord(
      markdown,
      input.todo.text,
      input.body,
      input.expectedBody
    )
    if (updated === null) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'The work record changed on disk. Refresh before saving it.'
      )
    }
    await writeObsidianDailyTodoMarkdown(target.filePath, updated)
    return { ok: true, snapshot: await readSnapshot(input.directory, target.filePath, now) }
  } catch (error) {
    return obsidianDailyTodoServiceErrorResult(error)
  }
}

async function mutateTodoMarkdown(
  input: ObsidianDailyTodoDeleteInput,
  now: Date,
  mutate: (markdown: string) => string | null
): Promise<ObsidianDailyTodoResult> {
  try {
    const target = await resolveRequestedNote(input.directory, input.filePath, now)
    const updated = mutate(await readObsidianDailyTodoMarkdown(target.filePath))
    if (updated === null) {
      throw new ObsidianDailyTodoServiceError(
        'todo-conflict',
        'The todo changed on disk. Refresh before updating it.'
      )
    }
    await writeObsidianDailyTodoMarkdown(target.filePath, updated)
    return { ok: true, snapshot: await readSnapshot(input.directory, target.filePath, now) }
  } catch (error) {
    return obsidianDailyTodoServiceErrorResult(error)
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
  const today = formatObsidianDailyLocalDate(now)
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
      workRecords: [],
      dailyNotes
    }
  }

  const [markdown, metadata] = await Promise.all([
    readObsidianDailyTodoMarkdown(selected.filePath),
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
    workRecords: parseObsidianDailyWorkRecords(markdown),
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
      `No daily note found for ${formatObsidianDailyLocalDate(now)}.`
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
