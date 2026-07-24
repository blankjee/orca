import { describe, expect, it } from 'vitest'

import type { ObsidianDailyNoteSummary } from '../../../shared/obsidian-daily-todo'
import {
  findAdjacentObsidianDailyNotes,
  formatObsidianDailyDateTitle,
  formatObsidianDailyDateWeekday,
  getObsidianDailyWeekDates
} from './obsidian-daily-date-navigation'

function note(date: string): ObsidianDailyNoteSummary {
  return { date, filePath: `/vault/${date}.md`, relativePath: `${date}.md` }
}

describe('Obsidian daily date navigation', () => {
  it('formats a local calendar date without UTC drift', () => {
    expect(formatObsidianDailyDateTitle('2026-07-17', 'zh-CN')).toBe('2026年7月17日')
    expect(formatObsidianDailyDateWeekday('2026-07-17', 'zh-CN')).toBe('周五')
  })

  it('builds a Monday-first week around the selected date', () => {
    expect(getObsidianDailyWeekDates('2026-07-17')).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19'
    ])
  })

  it('finds adjacent discovered notes even when dates have gaps', () => {
    const notes = [note('2026-07-19'), note('2026-07-17'), note('2026-07-12')]
    expect(findAdjacentObsidianDailyNotes(notes, '2026-07-17')).toEqual({
      older: notes[2],
      newer: notes[0]
    })
  })
})
