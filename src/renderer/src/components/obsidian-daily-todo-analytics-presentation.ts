import type {
  ObsidianDailyTodoAnalytics,
  ObsidianDailyTodoAnalyticsDay
} from '../../../shared/obsidian-daily-todo-analytics'

export type ObsidianDailyTodoPeriodSummary = {
  total: number
  completed: number
  inProgress: number
  activeDays: number
  completionPercent: number
}

export type ObsidianDailyTodoCalendarDay = ObsidianDailyTodoAnalyticsDay & {
  intensity: 0 | 1 | 2 | 3 | 4
}

export function summarizeObsidianTodoAnalyticsPeriod(
  days: readonly ObsidianDailyTodoAnalyticsDay[]
): ObsidianDailyTodoPeriodSummary {
  const summary = days.reduce(
    (current, day) => ({
      total: current.total + day.total,
      completed: current.completed + day.completed,
      inProgress: current.inProgress + day.inProgress,
      activeDays: current.activeDays + (day.total > 0 ? 1 : 0)
    }),
    { total: 0, completed: 0, inProgress: 0, activeDays: 0 }
  )
  return {
    ...summary,
    completionPercent: summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0
  }
}

export function getObsidianTodoMonthDays(
  analytics: ObsidianDailyTodoAnalytics | null,
  selectedDate: string
): ObsidianDailyTodoAnalyticsDay[] {
  const month = selectedDate.slice(0, 7)
  return analytics?.days.filter((day) => day.date.startsWith(month)) ?? []
}

export function getObsidianTodoRecentDays(
  analytics: ObsidianDailyTodoAnalytics | null,
  selectedDate: string,
  count = 30
): ObsidianDailyTodoAnalyticsDay[] {
  const byDate = new Map(analytics?.days.map((day) => [day.date, day]) ?? [])
  const end = parseLocalDate(selectedDate)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end)
    date.setDate(end.getDate() - (count - index - 1))
    const key = formatLocalDate(date)
    return byDate.get(key) ?? emptyDay(key)
  })
}

export function getObsidianTodoYearCalendar(
  analytics: ObsidianDailyTodoAnalytics | null,
  year: number
): ObsidianDailyTodoCalendarDay[] {
  const byDate = new Map(analytics?.days.map((day) => [day.date, day]) ?? [])
  const start = new Date(year, 0, 1, 12)
  const end = new Date(year + 1, 0, 1, 12)
  const days: ObsidianDailyTodoAnalyticsDay[] = []
  for (const cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    const key = formatLocalDate(cursor)
    days.push(byDate.get(key) ?? emptyDay(key))
  }
  const maxCompleted = Math.max(1, ...days.map((day) => day.completed))
  return days.map((day) => ({
    ...day,
    intensity: completionIntensity(day.completed, maxCompleted)
  }))
}

function completionIntensity(completed: number, maxCompleted: number): 0 | 1 | 2 | 3 | 4 {
  if (completed === 0) {
    return 0
  }
  return Math.min(4, Math.max(1, Math.ceil((completed / maxCompleted) * 4))) as 1 | 2 | 3 | 4
}

function emptyDay(date: string): ObsidianDailyTodoAnalyticsDay {
  return { date, total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 }
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}
