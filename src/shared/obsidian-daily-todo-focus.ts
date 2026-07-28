import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoResult,
  ObsidianDailyTodoSnapshot
} from './obsidian-daily-todo'

export type ObsidianDailyTodoFocusStatus = 'running' | 'paused' | 'elapsed'

export type ObsidianDailyTodoFocusSession = {
  id: string
  directory: string
  filePath: string
  noteDate: string
  todo: ObsidianDailyTodoItem
  durationMs: number
  activeElapsedMs: number
  runningSince: number | null
  startedAt: number
  status: ObsidianDailyTodoFocusStatus
  goal: string
  notes: string
}

export type ObsidianDailyTodoFocusStartInput = {
  directory: string
  filePath: string
  noteDate: string
  todo: ObsidianDailyTodoItem
  durationMinutes: number
  goal: string
}

export type ObsidianDailyTodoFocusUpdateInput = {
  goal?: string
  notes?: string
}

export type ObsidianDailyTodoFocusStateResult =
  | { ok: true; session: ObsidianDailyTodoFocusSession | null }
  | { ok: false; code: 'active-session' | 'invalid-input' | 'no-session'; message: string }

export type ObsidianDailyTodoFocusFinishResult =
  | {
      ok: true
      session: null
      snapshot: ObsidianDailyTodoSnapshot
      focusedMs: number
    }
  | {
      ok: false
      code: 'no-session' | 'invalid-input' | Exclude<ObsidianDailyTodoResult, { ok: true }>['code']
      message: string
    }

export function getObsidianDailyTodoFocusElapsedMs(
  session: ObsidianDailyTodoFocusSession,
  now = Date.now()
): number {
  const runningElapsed =
    session.status === 'running' && session.runningSince !== null
      ? Math.max(0, now - session.runningSince)
      : 0
  return Math.max(0, session.activeElapsedMs + runningElapsed)
}

export function getObsidianDailyTodoFocusRemainingMs(
  session: ObsidianDailyTodoFocusSession,
  now = Date.now()
): number {
  return Math.max(0, session.durationMs - getObsidianDailyTodoFocusElapsedMs(session, now))
}

export function formatObsidianDailyTodoFocusClock(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutesPart = Math.floor(seconds / 60)
  const secondsPart = seconds % 60
  return `${String(minutesPart).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`
}
