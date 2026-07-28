import type { ObsidianDailyNoteSummary } from '../shared/obsidian-daily-todo'
import { parseObsidianDailyTodos, type ObsidianDailyTodoItem } from '../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoAnalytics,
  ObsidianDailyTodoAnalyticsDay,
  ObsidianDailyTodoAnalyticsResult
} from '../shared/obsidian-daily-todo-analytics'
import {
  discoverObsidianDailyNotes,
  resolveObsidianVaultRoot
} from './obsidian-daily-note-discovery'
import {
  obsidianDailyTodoServiceErrorResult,
  readObsidianDailyTodoMarkdown
} from './obsidian-daily-todo-file-access'
import { parseObsidianDailyFocusRecordMinutes } from '../shared/obsidian-daily-focus-record'

const ANALYTICS_CACHE_MS = 60_000
const READ_CONCURRENCY = 8
const analyticsCache = new Map<
  string,
  { expiresAt: number; analytics: ObsidianDailyTodoAnalytics }
>()

export async function loadObsidianDailyTodoAnalytics(
  directory: string,
  year: number,
  refresh = false
): Promise<ObsidianDailyTodoAnalyticsResult> {
  try {
    const root = await resolveObsidianVaultRoot(directory)
    const cacheKey = `${root}:${year}`
    const cached = analyticsCache.get(cacheKey)
    if (!refresh && cached && cached.expiresAt > Date.now()) {
      return { ok: true, analytics: cached.analytics }
    }

    const notes = uniqueNotesForYear(await discoverObsidianDailyNotes(root, refresh), year)
    const days = await readAnalyticsDays(notes)
    const analytics = { year, days }
    analyticsCache.set(cacheKey, { expiresAt: Date.now() + ANALYTICS_CACHE_MS, analytics })
    return { ok: true, analytics }
  } catch (error) {
    return obsidianDailyTodoServiceErrorResult(error)
  }
}

function uniqueNotesForYear(
  notes: readonly ObsidianDailyNoteSummary[],
  year: number
): ObsidianDailyNoteSummary[] {
  const prefix = `${year}-`
  const seenDates = new Set<string>()
  return notes.filter((note) => {
    if (!note.date.startsWith(prefix) || seenDates.has(note.date)) {
      return false
    }
    // Why: discovery sorts same-day files by daily-note path confidence, so
    // the first one matches the note selected elsewhere in the app.
    seenDates.add(note.date)
    return true
  })
}

async function readAnalyticsDays(
  notes: readonly ObsidianDailyNoteSummary[]
): Promise<ObsidianDailyTodoAnalyticsDay[]> {
  const days = Array.from<ObsidianDailyTodoAnalyticsDay | null>({ length: notes.length }).fill(null)
  let nextIndex = 0
  const worker = async (): Promise<void> => {
    while (nextIndex < notes.length) {
      const index = nextIndex
      nextIndex += 1
      const note = notes[index]
      try {
        const markdown = await readObsidianDailyTodoMarkdown(note.filePath)
        const todos = parseObsidianDailyTodos(markdown)
        days[index] = summarizeDay(note.date, todos, parseObsidianDailyFocusRecordMinutes(markdown))
      } catch {
        // Why: one unreadable historical note should not hide the rest of a
        // year that is still available to the user.
        days[index] = null
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, notes.length) }, () => worker())
  )
  return days.filter((day): day is ObsidianDailyTodoAnalyticsDay => day !== null)
}

function summarizeDay(
  date: string,
  todos: readonly ObsidianDailyTodoItem[],
  focus: { minutes: number; sessions: number }
): ObsidianDailyTodoAnalyticsDay {
  const summary: ObsidianDailyTodoAnalyticsDay = {
    date,
    total: todos.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  }
  if (focus.sessions > 0) {
    summary.focusMinutes = focus.minutes
    summary.focusSessions = focus.sessions
  }
  for (const todo of todos) {
    if (todo.status === 'in-progress') {
      summary.inProgress += 1
    } else {
      summary[todo.status] += 1
    }
  }
  return summary
}
