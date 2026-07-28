import type { ObsidianDailyTodoErrorCode } from './obsidian-daily-todo'

export type ObsidianDailyTodoAnalyticsDay = {
  date: string
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  focusMinutes?: number
  focusSessions?: number
}

export type ObsidianDailyTodoAnalytics = {
  year: number
  days: ObsidianDailyTodoAnalyticsDay[]
}

export type ObsidianDailyTodoAnalyticsResult =
  | { ok: true; analytics: ObsidianDailyTodoAnalytics }
  | { ok: false; code: ObsidianDailyTodoErrorCode; message: string }

export type ObsidianDailyTodoAnalyticsInput = {
  directory: string
  year: number
  refresh?: boolean
}
