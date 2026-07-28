import { readFile, writeFile } from 'node:fs/promises'

import type { ObsidianDailyTodoResult } from '../shared/obsidian-daily-todo'
import { ObsidianDailyNoteDiscoveryError } from './obsidian-daily-note-discovery'

export async function readObsidianDailyTodoMarkdown(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    throw new ObsidianDailyTodoServiceError('read-failed', 'Could not read the daily note.')
  }
}

export async function writeObsidianDailyTodoMarkdown(
  filePath: string,
  markdown: string
): Promise<void> {
  try {
    await writeFile(filePath, markdown, 'utf8')
  } catch {
    throw new ObsidianDailyTodoServiceError('write-failed', 'Could not update the daily note.')
  }
}

export function validateObsidianDailyTodoText(text: string): void {
  const normalized = text.trim()
  if (!normalized || normalized.length > 1_000 || /[\r\n]/.test(normalized)) {
    throw new ObsidianDailyTodoServiceError(
      'invalid-input',
      'Todo text must be one non-empty line under 1,000 characters.'
    )
  }
}

export function validateObsidianDailyWorkRecordBody(body: string): void {
  if (typeof body !== 'string' || body.length > 100_000) {
    throw new ObsidianDailyTodoServiceError(
      'invalid-input',
      'Work record content must be under 100,000 characters.'
    )
  }
}

export function formatObsidianDailyLocalDate(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export class ObsidianDailyTodoServiceError extends Error {
  constructor(
    readonly code: Exclude<ObsidianDailyTodoResult, { ok: true }>['code'],
    message: string
  ) {
    super(message)
  }
}

export function obsidianDailyTodoServiceErrorResult(
  error: unknown
): Exclude<ObsidianDailyTodoResult, { ok: true }> {
  if (error instanceof ObsidianDailyNoteDiscoveryError) {
    return { ok: false, code: error.code, message: error.message }
  }
  if (error instanceof ObsidianDailyTodoServiceError) {
    return { ok: false, code: error.code, message: error.message }
  }
  return { ok: false, code: 'read-failed', message: 'Could not access the Obsidian vault.' }
}
