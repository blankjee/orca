import type React from 'react'

import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoResult,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'

export function applyObsidianDailyTodoResult(
  result: ObsidianDailyTodoResult,
  setSnapshot: React.Dispatch<React.SetStateAction<ObsidianDailyTodoSnapshot | null>>,
  setError: React.Dispatch<
    React.SetStateAction<Exclude<ObsidianDailyTodoResult, { ok: true }> | null>
  >
): void {
  if (result.ok) {
    setSnapshot(result.snapshot)
    setError(null)
  } else {
    setError(result)
  }
}

export function getObsidianDailyTodoErrorMessage(
  error: Exclude<ObsidianDailyTodoResult, { ok: true }>
): string {
  if (error.code === 'note-not-found') {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.noteNotFound',
      'The selected daily note was not found in this vault.'
    )
  }
  if (error.code === 'directory-not-found' || error.code === 'invalid-directory') {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.directoryUnavailable',
      'The Obsidian vault root is unavailable.'
    )
  }
  if (error.code === 'todo-conflict') {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.todoConflict',
      'This todo changed in another app. Refresh and try again.'
    )
  }
  return translate(
    'auto.components.ObsidianDailyTodoPanel.accessFailed',
    'Orca could not read or update the selected daily note.'
  )
}
