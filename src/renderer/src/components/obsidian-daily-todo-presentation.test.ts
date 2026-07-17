import { describe, expect, it } from 'vitest'

import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import {
  getNextObsidianDailyTodoStatus,
  getObsidianTodoDisplayText,
  groupObsidianDailyTodos
} from './obsidian-daily-todo-presentation'

function todo(
  id: string,
  group: string | null,
  priority: ObsidianDailyTodoItem['priority'],
  status: ObsidianDailyTodoItem['status'] = 'pending'
): ObsidianDailyTodoItem {
  return {
    id,
    text: id,
    status,
    lineNumber: 1,
    rawLine: `- [ ] ${id}`,
    group,
    priority,
    depth: 0,
    parentId: null,
    timeText: null
  }
}

describe('Obsidian daily todo presentation', () => {
  it('orders toodo groups and priority sections predictably', () => {
    const groups = groupObsidianDailyTodos([
      todo('other', null, null),
      todo('follow-up', '跟进任务', 'P2'),
      todo('today-p3', '今日任务', 'P3'),
      todo('today-p1', '今日任务', 'P1', 'completed')
    ])

    expect(groups.map((group) => group.name)).toEqual(['今日任务', '跟进任务', '其他'])
    expect(groups[0].completed).toBe(1)
    expect(groups[0].priorities.map((group) => group.priority)).toEqual(['P1', 'P3'])
  })

  it('cycles through actionable statuses and reopens terminal statuses', () => {
    expect(getNextObsidianDailyTodoStatus('pending')).toBe('in-progress')
    expect(getNextObsidianDailyTodoStatus('in-progress')).toBe('completed')
    expect(getNextObsidianDailyTodoStatus('completed')).toBe('pending')
    expect(getNextObsidianDailyTodoStatus('cancelled')).toBe('pending')
  })

  it('uses Obsidian wiki-link labels for display', () => {
    expect(getObsidianTodoDisplayText('Review [[spec|the spec]] with [[Alice]]')).toBe(
      'Review the spec with Alice'
    )
  })
})
