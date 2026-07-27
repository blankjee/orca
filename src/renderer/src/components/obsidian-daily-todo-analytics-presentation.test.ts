import { describe, expect, it } from 'vitest'

import type { ObsidianDailyTodoAnalytics } from '../../../shared/obsidian-daily-todo-analytics'
import {
  getObsidianTodoMonthDays,
  getObsidianTodoRecentDays,
  getObsidianTodoYearCalendar,
  summarizeObsidianTodoAnalyticsPeriod
} from './obsidian-daily-todo-analytics-presentation'

const analytics: ObsidianDailyTodoAnalytics = {
  year: 2026,
  days: [
    {
      date: '2026-06-30',
      total: 2,
      pending: 1,
      inProgress: 0,
      completed: 1,
      cancelled: 0
    },
    {
      date: '2026-07-27',
      total: 5,
      pending: 2,
      inProgress: 1,
      completed: 2,
      cancelled: 0
    }
  ]
}

describe('Obsidian daily Todo analytics presentation', () => {
  it('summarizes a selected month and period completion', () => {
    const month = getObsidianTodoMonthDays(analytics, '2026-07-27')
    expect(month).toHaveLength(1)
    expect(summarizeObsidianTodoAnalyticsPeriod(month)).toEqual({
      total: 5,
      completed: 2,
      inProgress: 1,
      activeDays: 1,
      completionPercent: 40
    })
  })

  it('fills missing dates in the recent trend and year calendar', () => {
    const recent = getObsidianTodoRecentDays(analytics, '2026-07-27', 3)
    expect(recent.map((day) => day.date)).toEqual(['2026-07-25', '2026-07-26', '2026-07-27'])
    expect(recent[0].total).toBe(0)
    expect(recent[2].completed).toBe(2)

    const calendar = getObsidianTodoYearCalendar(analytics, 2026)
    expect(calendar).toHaveLength(365)
    expect(calendar.find((day) => day.date === '2026-07-27')).toMatchObject({ intensity: 4 })
  })
})
