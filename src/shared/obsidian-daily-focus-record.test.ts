import { describe, expect, it } from 'vitest'

import {
  appendObsidianDailyFocusRecord,
  parseObsidianDailyFocusRecordMinutes
} from './obsidian-daily-focus-record'

describe('obsidian daily focus records', () => {
  it('creates a focus section and preserves machine-readable totals', () => {
    const body = appendObsidianDailyFocusRecord('已有记录', {
      id: 'session-1',
      startedAt: new Date(2026, 6, 27, 9, 5),
      finishedAt: new Date(2026, 6, 27, 9, 30),
      focusedMinutes: 25,
      goal: '完成方案',
      notes: '已确认接口'
    })

    expect(body).toContain('#### 聚焦记录')
    expect(body).toContain('09:05–09:30 · 25 分钟 · 完成')
    expect(parseObsidianDailyFocusRecordMinutes(body)).toEqual({ sessions: 1, minutes: 25 })
  })

  it('reuses an existing focus section', () => {
    const first = appendObsidianDailyFocusRecord('', {
      id: 'one',
      startedAt: new Date(2026, 6, 27, 9, 0),
      finishedAt: new Date(2026, 6, 27, 9, 15),
      focusedMinutes: 15,
      goal: '',
      notes: ''
    })
    const second = appendObsidianDailyFocusRecord(first, {
      id: 'two',
      startedAt: new Date(2026, 6, 27, 10, 0),
      finishedAt: new Date(2026, 6, 27, 10, 45),
      focusedMinutes: 45,
      goal: '',
      notes: ''
    })

    expect(second.match(/#### 聚焦记录/g)).toHaveLength(1)
    expect(parseObsidianDailyFocusRecordMinutes(second)).toEqual({ sessions: 2, minutes: 60 })
  })
})
